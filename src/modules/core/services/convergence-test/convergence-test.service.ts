import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { ConvergenceTest, OrgConfig, SimConfig } from "aethon-arion-db";
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
import { OptimiserService } from "../optimiser/optimiser.service";

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
        private optimiserService: OptimiserService
    ) {
        this._dev = this._env.root.dev;
        this._convergenceMargin = this._env.options.convergenceMargin || 0.01;
    }

    create(
        configuratorParamsDTOs: ConfiguratorParamsDTO<ConfiguratorParamData>[],
        simConfigParamsDTO: SimConfigParamsDTO,
        optimiserState: OptimiserStateDTO<ConfiguratorParamData>,
        tEntityManager?: EntityManager
    ): Promise<ConvergenceTest[]> {
        // create a new convergence test
        if (!Array.isArray(configuratorParamsDTOs)) configuratorParamsDTOs = [configuratorParamsDTOs];
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        if (this._dev) this._logger.log(`Creating convergence tests`);
        
        // find if a convergence test already exists for the required configuratorParams and simConfigParams
        return tEntityManager
            .getRepository(ConvergenceTest)
            .find({
                where: {
                    configuratorParams: {
                        id: In(configuratorParamsDTOs.map((param) => param.id))
                    },
                    simConfigParams: { id: simConfigParamsDTO.id }
                }
            })
            .then(async (convergenceTests: ConvergenceTest[]) => {
                if (this._dev) this._logger.log(`Generating convergence tests`);
                // cycle through all the configuratorParams and look for a related convergence test
                for (let configuratorParamDTO of configuratorParamsDTOs) {
                    let convergenceTest = convergenceTests.find(
                        (convergenceTest: ConvergenceTest) =>
                            convergenceTest?.configuratorParams.id === configuratorParamDTO.id
                    );
                    // if the convergence test does not exist, create it
                    if (!convergenceTest) {
                        // create a bew convergence test
                        convergenceTest = await tEntityManager.getRepository(ConvergenceTest).save({
                            configuratorParams: configuratorParamDTO,
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
                        // create new orgConfigs against the convergene test
                        const orgConfigs: OrgConfig[] = await this.orgConfigService.create(
                            convergenceTest.configuratorParams,
                            tEntityManager
                        );
                        // create a simConfig against each new orgConfig
                        let simConfigs: SimConfig[] = [];
                        for (let orgConfig of orgConfigs) {
                            simConfigs = [
                                ...simConfigs,
                                await this.simConfigService.create(
                                    convergenceTest.simConfigParams,
                                    orgConfig,
                                    convergenceTest,
                                    tEntityManager
                                )
                            ];
                        }
                        await tEntityManager.getRepository(ConvergenceTest).update(convergenceTest.id, {
                            orgConfigCount: orgConfigs.length,
                            simConfigCount: simConfigs.length
                        });
                    } 
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
                                    (simConfigSet.stdDevPerformance - convergenceTest.stdDevPerformance ) /
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
