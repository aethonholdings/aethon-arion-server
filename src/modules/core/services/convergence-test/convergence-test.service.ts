import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { ConvergenceTest, OrgConfig, SimConfig } from "aethon-arion-db";
import {
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    ConvergenceTestDTO,
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

type ConvergenceTestUpdate = Partial<
    Pick<
        ConvergenceTestDTO,
        | "resultCount"
        | "avgPerformance"
        | "stdDevPerformance"
        | "state"
        | "completedSimConfigCount"
        | "dispatchedRuns"
        | "simConfigCount"
        | "orgConfigCount"
        | "converged"
    >
>;

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
        // cycle through all the required config parameters and look for a corresponding convergence test
        // at the SimSets SimConfigParams level

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
                // if the convergence test does not exist, create it
                for (let configuratorParamDTO of configuratorParamsDTOs) {
                    let convergenceTest = convergenceTests.find(
                        (convergenceTest: ConvergenceTest) =>
                            convergenceTest?.configuratorParams.id === configuratorParamDTO.id
                    );
                    if (!convergenceTest) {
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
                    }
                    convergenceTests = [...convergenceTests, convergenceTest];
                }
                return convergenceTests;
            })
            .then(async (convergenceTests: ConvergenceTest[]) => {
                // generate the sim and org configurations for the convergence test
                for (let convergenceTest of convergenceTests) {
                    // ****** ORG CONFIGS
                    const orgConfigs: OrgConfig[] = await this.orgConfigService.create(
                        convergenceTest.configuratorParams,
                        tEntityManager
                    );
                    // ****** SIM CONFIGS
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
                return convergenceTests;
            })
            .then((convergenceTests: ConvergenceTest[]) => {
                if (this._dev) this._logger.log(`Convergence tests created`);
                return convergenceTests;
            });
    }

    async touch(convergenceTestId: number, tEntityManager?: EntityManager): Promise<ConvergenceTest> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
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
                return tEntityManager
                    .getRepository(SimConfig)
                    .createQueryBuilder("simConfig")
                    .select("AVG(simConfig.avgPerformance)", "avgPerformance")
                    .addSelect("STDDEV(simConfig.avgPerformance)", "stdDevPerformance")
                    .addSelect("COUNT(simConfig.id)", "simConfigCount")
                    .addSelect("COUNT(DISTINCT simConfig.orgConfigId)", "orgConfigCount")
                    .addSelect(`SUM(IF(simConfig.state = "${States.COMPLETED}", 1, 0))`, "completedSimConfigCount")
                    .addSelect("SUM(simConfig.runCount)", "resultCount")
                    .addSelect("SUM(simConfig.dispatchedRuns)", "dispatchedRuns")
                    .where("simConfig.convergenceTestId = :convergenceTestId", {
                        convergenceTestId: convergenceTestId
                    })
                    .groupBy("simConfig.convergenceTestId")
                    .getRawOne()
                    .then(async (simConfigSet) => {
                        let update: ConvergenceTestUpdate = {
                            ...simConfigSet,
                            stdDevPerformance: simConfigSet.stdDevPerformance ? simConfigSet.stdDevPerformance : 0
                        };
                        // check for convergence
                        let converged: boolean = false;
                        if (update.completedSimConfigCount === update.simConfigCount) {
                            if (this._dev) this._logger.log("Checking ConvergenceTest convergence");
                            if (
                                convergenceTest.stdDevPerformance > 0 &&
                                convergenceTest.configuratorParams.multipleOrgConfigs
                            ) {
                                const percentChange = Math.abs(
                                    (convergenceTest.stdDevPerformance - simConfigSet.stdDevPerformance) /
                                        convergenceTest.stdDevPerformance
                                );
                                converged = percentChange < this._convergenceMargin ? true : false;
                                if (!converged) {
                                    if (this._dev) {
                                        this._logger.log(
                                            "Convergence test not converged and requires more simConfig generation"
                                        );
                                        this._logger.log("Creating new OrgConfig and SimConfig");
                                        const configuratorParams = convergenceTest.configuratorParams;
                                        const model = this.modelService.getModel(configuratorParams.modelName);
                                        const configuratorName = configuratorParams.configuratorName;
                                        let newOrgConfig: OrgConfig = await tEntityManager
                                            .getRepository(OrgConfig)
                                            .save({
                                                ...model.getConfigurator(configuratorName).generate(configuratorParams),
                                                simConfigs: [],
                                                configuratorName: configuratorName,
                                                configuratorParams: configuratorParams,
                                                type: model.name
                                            });
                                        update.orgConfigCount++;
                                        await tEntityManager.getRepository(SimConfig).save({
                                            orgConfig: newOrgConfig,
                                            convergenceTest: convergenceTest,
                                            state: States.PENDING,
                                            runCount: 0,
                                            dispatchedRuns: 0,
                                            simConfigParams: convergenceTest.simConfigParams,
                                            days: convergenceTest.simConfigParams.days,
                                            randomStreamType: convergenceTest.simConfigParams.randomStreamType
                                        });
                                        update.simConfigCount++;
                                    }
                                }
                            } else {
                                converged = true;
                            }
                        }
                        if (converged) {
                            if (this._dev) this._logger.log("Convergence test converged");
                            update.state = States.COMPLETED;
                            update.converged = true;
                        } else if (update.resultCount > 0) {
                            update.state = States.RUNNING;
                        }
                        if (this._dev) this._logger.log("Saving convergence test");
                        await tEntityManager.getRepository(ConvergenceTest).update(convergenceTest.id, update);
                        return convergenceTest;
                    })
                    .then(async (convergenceTest: ConvergenceTest) => {
                        // ******** OPTIMISER STEP
                        for (let optimiserState of convergenceTest.optimiserStates) {
                            await this.optimiserService.touch(optimiserState.id, tEntityManager);
                        }
                        return convergenceTest;
                    });
            });
    }
}
