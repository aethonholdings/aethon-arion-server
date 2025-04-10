import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { ConfiguratorParams, ConvergenceTest, OrgConfig, SimConfig, SimConfigParams } from "aethon-arion-db";
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

@Injectable()
export class ConvergenceTestService {
    private _logger: Logger = new Logger(ConvergenceTestService.name);
    private _dev: boolean = false;
    private _env: ServerEnvironment = environment();
    private _convergenceMargin: number;

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        private orgConfigService: OrgConfigService,
        @Inject(forwardRef(() => SimConfigService)) private simConfigService: SimConfigService,
        private optimiserService: OptimiserStateService
    ) {
        this._dev = this._env.root.dev;
        this._convergenceMargin = this._env.options.convergenceMargin || 0.01;
    }

    async create(
        requiredConfiguratorParamsDTOs: ConfiguratorParamsDTO<ConfiguratorParamData>[],
        simConfigParamsDTO: SimConfigParamsDTO,
        optimiserState: OptimiserStateDTO<ConfiguratorParamData>,
        tEntityManager?: EntityManager
    ): Promise<ConvergenceTest[]> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        const requiredHashes: string[] = requiredConfiguratorParamsDTOs.map((param) => param.hash);

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
                for (let requiredConfiguratorParamsDTO of requiredConfiguratorParamsDTOs) {
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
                    await tEntityManager
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
                                    ? this._env.options.minRuns
                                    : 1;

                                if (this._dev)
                                    this._logger.log(
                                        `Generating orgConfigs and simConfigs against the convergence test`
                                    );
                                // create the required number of orgConfigs
                                for (let i = 0; i < orgConfigCountMin; i++) {
                                    await this.orgConfigService
                                        .create(convergenceTest.configuratorParams, tEntityManager)
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
                            }
                        });
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
                    .addSelect("STDDEV(simConfig.avgPerformance)", "stdDevPerformance")
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
                    .then(async (simConfigSet) => {
                        simConfigSet.stdDevPerformance = simConfigSet.stdDevPerformance
                            ? simConfigSet.stdDevPerformance
                            : 0;
                        // check for convergence
                        if (this._dev) this._logger.log("Checking ConvergenceTest convergence");
                        let converged: boolean = false;

                        // first make sure that all simConfigs for the ConvergenceTest have been completed; if not,
                        // we cannot speak about convergence
                        if (simConfigSet.completedSimConfigCount === simConfigSet.simConfigCount) {
                            // for convergence tests requiring multiple orgConfigs/ simConfigs, ensure that we have
                            // an estimate of standard deviation
                            if (
                                convergenceTest.configuratorParams.multipleOrgConfigs &&
                                convergenceTest.stdDevPerformance > 0
                            ) {
                                // we have an estimate of stddev, therefore calculate its percentage change with the new
                                // summary statistics of results to see if we have converged
                                const percentChange = Math.abs(
                                    (simConfigSet.stdDevPerformance - convergenceTest.stdDevPerformance) /
                                        convergenceTest.stdDevPerformance
                                );
                                converged = percentChange < this._convergenceMargin ? true : false;
                                // if we have not converged, we will need to generate more simulations to tighten the
                                // distribution of results
                                if (!converged) {
                                    if (this._dev)
                                        this._logger.log(
                                            "Convergence test not converged and requires more simConfig generation"
                                        );
                                    // generate a new orgconfig
                                    const configuratorParams = convergenceTest.configuratorParams;
                                    const model = this.modelService.getModel(configuratorParams.modelName);
                                    const configuratorName = configuratorParams.configuratorName;
                                    await tEntityManager
                                        .getRepository(OrgConfig)
                                        .save({
                                            ...model.getConfigurator(configuratorName).generate(configuratorParams),
                                            simConfigs: [],
                                            configuratorName: configuratorName,
                                            configuratorParams: configuratorParams,
                                            type: model.name
                                        })
                                        .then((orgConfig) => {
                                            simConfigSet.orgConfigCount++;
                                            // generate a new simConfig against the new orgConfig
                                            return tEntityManager
                                                .getRepository(SimConfig)
                                                .save({
                                                    orgConfig: orgConfig,
                                                    convergenceTest: convergenceTest,
                                                    state: States.PENDING,
                                                    runCount: 0,
                                                    dispatchedRuns: 0,
                                                    simConfigParams: convergenceTest.simConfigParams,
                                                    days: convergenceTest.simConfigParams.days,
                                                    randomStreamType: convergenceTest.simConfigParams.randomStreamType
                                                })
                                                .then(() => simConfigSet.simConfigCount++);
                                        });
                                }
                            } else {
                                converged = true;
                            }
                        }
                        // we have calculated all the summary statistics and generated any new objects needed,
                        // now we just need to update all the convergence test statistics and save to the database
                        if (converged) {
                            if (this._dev) this._logger.log("Convergence test converged");
                            convergenceTest.state = States.COMPLETED;
                            convergenceTest.converged = true;
                        } else if (simConfigSet.resultCount > 0) {
                            convergenceTest.state = States.RUNNING;
                        }
                        for (let key in simConfigSet) {
                            convergenceTest[key] = simConfigSet[key];
                        }
                        if (this._dev) this._logger.log("Saving convergence test");
                        return tEntityManager.getRepository(ConvergenceTest).save(convergenceTest);
                    })
                    .then(async (convergenceTest: ConvergenceTest) => {
                        // the convergence test is saved, now touch all optimiser states related to it
                        for (let optimiserState of convergenceTest.optimiserStates) {
                            await this.optimiserService.touch(optimiserState.id, tEntityManager);
                        }
                        return convergenceTest;
                    });
            });
    }
}
