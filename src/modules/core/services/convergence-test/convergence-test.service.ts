import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { ConfiguratorParams, ConvergenceTest, OptimiserState, OrgConfig, SimConfig, SimConfigParams } from "aethon-arion-db";
import {
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    OptimiserStateDTO,
    SimConfigParamsDTO,
    States
} from "aethon-arion-pipeline";
import { ServerEnvironment } from "src/common/types/server.types";
import environment from "env/environment";
import { OrgConfigService } from "../../endpoints/org-config/org-config.service";
import { SimConfigService } from "../../endpoints/sim-config/sim-config.service";
import { ModelService } from "../model/model.service";
import { OptimiserStateService } from "../../endpoints/optimiser-state/optimiser-state.service";
import { ConvergenceCriteria, standardErrorConvergence } from "../../../../common/utils/convergence";

@Injectable()
export class ConvergenceTestService {
    private _logger: Logger = new Logger(ConvergenceTestService.name);
    private _dev: boolean = false;
    private _env: ServerEnvironment = environment();
    private _criteria: ConvergenceCriteria;

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        private orgConfigService: OrgConfigService,
        @Inject(forwardRef(() => SimConfigService)) private simConfigService: SimConfigService,
        private optimiserService: OptimiserStateService
    ) {
        this._dev = this._env.root.dev;
        this._criteria = {
            minSamples: this._env.options.minOrgConfigs,
            maxSamples: this._env.options.maxOrgConfigs ?? 200,
            relativeError: this._env.options.convergenceMargin || 0.01,
            absoluteError: this._env.options.convergenceAbsoluteError ?? 0
        };
    }

    async create(
        requiredConfiguratorParamsDTOs: ConfiguratorParamsDTO<ConfiguratorParamData>[],
        simConfigParamsDTO: SimConfigParamsDTO,
        optimiserState: OptimiserStateDTO<ConfiguratorParamData>,
        tEntityManager?: EntityManager
    ): Promise<ConvergenceTest[]> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        // de-duplicate by hash: two optimiser data points can map to the same configuratorParams (e.g. a
        // numerical parameter whose domain collapses to a single value) and must share one convergence test
        const uniqueRequiredConfiguratorParamsDTOs: ConfiguratorParamsDTO<ConfiguratorParamData>[] = [
            ...new Map(requiredConfiguratorParamsDTOs.map((param) => [param.hash, param])).values()
        ];
        const requiredHashes: string[] = uniqueRequiredConfiguratorParamsDTOs.map((param) => param.hash);

        if (this._dev) this._logger.log(`Generating convergence tests`);
        // find if a convergence test already exists for the required configuratorParams and simConfigParams
        if (this._dev) this._logger.log(`Searching for matching existing ConfigParams`);
        return tEntityManager
            .getRepository(ConfiguratorParams)
            .find({
                where: {
                    hash: In(requiredHashes)
                }
            })
            .then(async (configuratorParamsFound: ConfiguratorParams[]) => {
                if (this._dev)
                    this._logger.log(`${configuratorParamsFound.length} matching existing ConfigParams found`);
                const convergenceTests: ConvergenceTest[] = [];
                // cycle through all the configuratorParams and
                // (1) create a ConfiguratorParam if one does not exist; link to the existing one if yes
                // (2) create a new convergence test if one does not exist for the ConfiguratorParams and SimConfigParams
                // (3) create any necessary sim and orgConfigs

                // cycle through all requiredConfigParams
                for (let requiredConfiguratorParamsDTO of uniqueRequiredConfiguratorParamsDTOs) {
                    // see if the required configParams were found in the database
                    let configuratorParams: ConfiguratorParams = configuratorParamsFound.find(
                        (params) => params.hash === requiredConfiguratorParamsDTO.hash
                    );
                    // if the required configParams were not found in the database, create a
                    // new instance
                    if (!configuratorParams) {
                        if (this._dev) this._logger.log(`Generating new ConfigParam`);
                        configuratorParams = await tEntityManager
                            .getRepository(ConfiguratorParams)
                            .save(requiredConfiguratorParamsDTO);
                        this._logger.log(`ConfigParam ${configuratorParams.id} generated`);
                    }

                    // now see if an existing convergence test with the required configParams exist
                    if (this._dev) this._logger.log(`Searching for matching existing ConvergenceTests`);
                    const convergenceTest: ConvergenceTest = await tEntityManager
                        .getRepository(ConvergenceTest)
                        .createQueryBuilder()
                        .select("id", "id")
                        .where("ConvergenceTest.configuratorParamsId=:configuratorParamsId", {
                            configuratorParamsId: configuratorParams.id
                        })
                        .andWhere("ConvergenceTest.simConfigParamsId=:simConfigParamsId", {
                            simConfigParamsId: simConfigParamsDTO.id
                        })
                        .getRawOne()
                        .then(async (convergenceTestPartial: ConvergenceTest) => {
                            if (convergenceTestPartial) {
                                if (this._dev)
                                    this._logger.log(`Existing convergence test ${convergenceTestPartial.id} found`);
                                // link the existing convergence test to this optimiser state so that the
                                // optimiser can read its results on update
                                const existingConvergenceTest: ConvergenceTest = await tEntityManager
                                    .getRepository(ConvergenceTest)
                                    .findOneOrFail({
                                        where: { id: convergenceTestPartial.id },
                                        relations: { optimiserStates: true }
                                    });
                                const alreadyLinked: boolean = (existingConvergenceTest.optimiserStates || []).some(
                                    (state) => state.id === optimiserState.id
                                );
                                if (!alreadyLinked && optimiserState.id !== undefined) {
                                    await tEntityManager
                                        .createQueryBuilder()
                                        .relation(OptimiserState, "convergenceTests")
                                        .of(optimiserState.id)
                                        .add(existingConvergenceTest.id);
                                }
                                return existingConvergenceTest;
                            } else {
                                // create a new convergence test
                                if (this._dev) this._logger.log(`Generating a new convergenceTest`);
                                const convergenceTest: ConvergenceTest = await tEntityManager
                                    .getRepository(ConvergenceTest)
                                    .save({
                                        configuratorParams: configuratorParams,
                                        simConfigParams: simConfigParamsDTO,
                                        state: States.PENDING,
                                        orgConfigCount: 0,
                                        simConfigCount: 0,
                                        completedSimConfigCount: 0,
                                        resultCount: 0,
                                        dispatchedRuns: 0,
                                        converged: false,
                                        optimiserStates: [optimiserState]
                                    });

                                if (this._dev) this._logger.log(`ConvergenceTest ${convergenceTest.id} created`);
                                // check the required orgConfigCount based on the requiredConfiguratorParamsDTO.multipleOrgConfigs
                                let orgConfigCountMin = requiredConfiguratorParamsDTO.multipleOrgConfigs
                                    ? this._env.options.minOrgConfigs
                                    : 1;

                                if (this._dev)
                                    this._logger.log(
                                        `Generating orgConfigs and simConfigs against the convergence test`
                                    );
                                // create the required number of orgConfigs
                                const baseSeed: number = await this.orgConfigService.baseSeed(
                                    simConfigParamsDTO.id,
                                    tEntityManager
                                );
                                for (let i = 0; i < orgConfigCountMin; i++) {
                                    await this.orgConfigService
                                        .create(convergenceTest.configuratorParams, tEntityManager, i + 1, baseSeed)
                                        .then((orgConfig: OrgConfig) =>
                                            this.simConfigService.create(
                                                convergenceTest.simConfigParams,
                                                orgConfig,
                                                convergenceTest,
                                                tEntityManager
                                            )
                                        );
                                }
                                await tEntityManager.getRepository(ConvergenceTest).update(convergenceTest.id, {
                                    orgConfigCount: orgConfigCountMin,
                                    simConfigCount: orgConfigCountMin
                                });
                                if (this._dev)
                                    this._logger.log(
                                        `OrgConfigs and simConfigs generated against the convergence test`
                                    );
                                return convergenceTest;
                            }
                        });
                    convergenceTests.push(convergenceTest);
                }
                return convergenceTests;
            })
            .then((convergenceTests: ConvergenceTest[]) => {
                if (this._dev) this._logger.log(`Convergence tests created`);
                return convergenceTests;
            });
    }

    async touch(convergenceTestId: number, tEntityManager?: EntityManager): Promise<ConvergenceTest> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        // lock the convergence test row before reading the simConfig aggregates: two transactions completing the
        // last simConfigs of the same test are serialised, and the second one sees the first one's commit (see
        // withTransactionRetry for the isolation level). Requires a transaction.
        await tEntityManager.getRepository(ConvergenceTest).findOneOrFail({
            where: { id: convergenceTestId },
            lock: { mode: "pessimistic_write" },
            loadEagerRelations: false
        });
        // fetch the convergence test
        return tEntityManager
            .getRepository(ConvergenceTest)
            .findOneOrFail({
                where: { id: convergenceTestId },
                relations: {
                    configuratorParams: true,
                    simConfigParams: true,
                    optimiserStates: true
                }
            })
            .then((convergenceTest: ConvergenceTest) => {
                // fetch the summary statistics across all simConfigs in the convergence test
                return tEntityManager
                    .getRepository(SimConfig)
                    .createQueryBuilder("simConfig")
                    .select("AVG(simConfig.avgPerformance)", "avgPerformance")
                    .addSelect("STDDEV_SAMP(simConfig.avgPerformance)", "stdDevPerformance")
                    .addSelect("COUNT(DISTINCT simConfig.orgConfigId)", "orgConfigCount")
                    .addSelect("COUNT(DISTINCT simConfig.id)", "simConfigCount")
                    .addSelect(`SUM(IF(simConfig.state = "${States.COMPLETED}", 1, 0))`, "completedSimConfigCount")
                    .addSelect("SUM(simConfig.runCount)", "resultCount")
                    .addSelect("SUM(simConfig.dispatchedRuns)", "dispatchedRuns")
                    .where("simConfig.convergenceTestId = :convergenceTestId", {
                        convergenceTestId: convergenceTestId
                    })
                    .groupBy("simConfig.convergenceTestId")
                    .getRawOne()
                    .then(async (raw) => {
                        // the MySQL driver returns SUM/COUNT aggregates as strings; normalise to numbers so the
                        // completion comparison below is not a string-vs-number comparison
                        const simConfigSet = {
                            avgPerformance: raw?.avgPerformance === null || raw?.avgPerformance === undefined
                                ? null
                                : Number(raw.avgPerformance),
                            stdDevPerformance: raw?.stdDevPerformance === null || raw?.stdDevPerformance === undefined
                                ? null
                                : Number(raw.stdDevPerformance),
                            orgConfigCount: Number(raw?.orgConfigCount ?? 0),
                            simConfigCount: Number(raw?.simConfigCount ?? 0),
                            completedSimConfigCount: Number(raw?.completedSimConfigCount ?? 0),
                            resultCount: Number(raw?.resultCount ?? 0),
                            dispatchedRuns: Number(raw?.dispatchedRuns ?? 0)
                        };
                        // check for convergence
                        if (this._dev) this._logger.log("Checking ConvergenceTest convergence");
                        let converged: boolean = convergenceTest.converged === true;
                        const allSimConfigsCompleted: boolean =
                            simConfigSet.simConfigCount > 0 &&
                            simConfigSet.completedSimConfigCount === simConfigSet.simConfigCount;

                        // convergence is only assessed once every simConfig in the test has completed, and only
                        // for tests that have not already converged (late results must not re-open a test)
                        if (!converged && allSimConfigsCompleted) {
                            if (!convergenceTest.configuratorParams.multipleOrgConfigs) {
                                // a single deterministic orgConfig: the simConfig-level convergence is sufficient
                                converged = true;
                            } else {
                                // standard-error rule over the org config means: the sample of org configs is large
                                // enough once the standard error of the mean performance is within tolerance
                                const decision = standardErrorConvergence(
                                    simConfigSet.orgConfigCount,
                                    simConfigSet.avgPerformance,
                                    simConfigSet.stdDevPerformance,
                                    this._criteria
                                );
                                converged = decision.converged;
                                if (decision.capped)
                                    this._logger.warn(
                                        `ConvergenceTest ${convergenceTestId} stopped at the org config cap (${simConfigSet.orgConfigCount})`
                                    );
                                // if we have not converged, add one more org config (the next replicate, so that it
                                // shares its random draws with the same replicate of every other optimiser point)
                                if (!converged) {
                                    if (this._dev)
                                        this._logger.log(
                                            "Convergence test not converged and requires more simConfig generation"
                                        );
                                    const orgConfig: OrgConfig = await this.orgConfigService.create(
                                        convergenceTest.configuratorParams,
                                        tEntityManager,
                                        simConfigSet.orgConfigCount + 1,
                                        await this.orgConfigService.baseSeed(convergenceTest.simConfigParams.id, tEntityManager)
                                    );
                                    simConfigSet.orgConfigCount++;
                                    await this.simConfigService.create(
                                        convergenceTest.simConfigParams,
                                        orgConfig,
                                        convergenceTest,
                                        tEntityManager
                                    );
                                    simConfigSet.simConfigCount++;
                                }
                            }
                        }
                        // we have calculated all the summary statistics and generated any new objects needed,
                        // now we just need to update all the convergence test statistics and save to the database
                        if (converged) {
                            if (this._dev && !convergenceTest.converged) this._logger.log("Convergence test converged");
                            convergenceTest.state = States.COMPLETED;
                            convergenceTest.converged = true;
                        } else if (simConfigSet.resultCount > 0) {
                            convergenceTest.state = States.RUNNING;
                        }
                        convergenceTest.orgConfigCount = simConfigSet.orgConfigCount;
                        convergenceTest.simConfigCount = simConfigSet.simConfigCount;
                        convergenceTest.completedSimConfigCount = simConfigSet.completedSimConfigCount;
                        convergenceTest.resultCount = simConfigSet.resultCount;
                        convergenceTest.dispatchedRuns = simConfigSet.dispatchedRuns;
                        // performance statistics are only persisted for a fully completed set of simConfigs, so that
                        // the stored stdDev is always a valid baseline for the next convergence comparison
                        if (allSimConfigsCompleted) {
                            convergenceTest.avgPerformance = simConfigSet.avgPerformance;
                            convergenceTest.stdDevPerformance = simConfigSet.stdDevPerformance ?? 0;
                        }
                        if (this._dev) this._logger.log("Saving convergence test");
                        return tEntityManager.getRepository(ConvergenceTest).save(convergenceTest);
                    })
                    .then(async (convergenceTest: ConvergenceTest) => {
                        // the convergence test is saved, now touch all optimiser states related to it
                        // only active optimiser states are touched: re-touching a completed state would make it
                        // step again, find its successor's tests already created and wrongly end the SimSet
                        for (let optimiserState of convergenceTest.optimiserStates) {
                            if (optimiserState.status === States.COMPLETED || optimiserState.status === States.FAILED)
                                continue;
                            await this.optimiserService.touch(optimiserState.id, tEntityManager);
                        }
                        return convergenceTest;
                    });
            });
    }
}
