import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { ModelService } from "../../services/model/model.service";
import { DataSource, EntityManager } from "typeorm";
import {
    ConfiguratorParamData,
    Model,
    Optimiser,
    OptimiserData,
    OptimiserParameters,
    OptimiserStateDTO,
    SimSetDTO,
    States
} from "aethon-arion-pipeline";
import { ConfiguratorParams, ConvergenceTest, OptimiserState, SimSet } from "aethon-arion-db";
import { ConvergenceTestService } from "../../services/convergence-test/convergence-test.service";
import { ServerEnvironment } from "src/common/types/server.types";
import environment from "env/environment";

@Injectable()
export class OptimiserStateService {
    private _dev: boolean = false;
    private _logger: Logger = new Logger(OptimiserStateService.name);
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        @Inject(forwardRef(() => ConvergenceTestService)) private convergenceTestService: ConvergenceTestService
    ) {
        this._dev = this._env.root.dev;
    }

    create(
        optimiserStateDTO: OptimiserStateDTO<ConfiguratorParams>,
        simSetDTO: SimSetDTO,
        tEntityManager?: EntityManager
    ): Promise<OptimiserState> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        const model: Model = this.modelService.getModel(simSetDTO.modelName);
        const optimiserName: string = simSetDTO.optimiserName || model.getDefaultOptimiser().name;
        let optimiser: Optimiser<ConfiguratorParamData, OptimiserParameters, OptimiserData> =
            model.getOptimiser(optimiserName);
        let stepCount: number;
        let stateData: OptimiserStateDTO<any>;

        if (!optimiserStateDTO) {
            stepCount = 0;
            
            stateData = optimiser.initialise(simSetDTO.optimiserParams, simSetDTO);
        } else {
            stateData = optimiserStateDTO;
            stepCount = optimiserStateDTO.stepCount;
        }

        // initialise the optimiser state
        if (this._dev) this._logger.log(`Creating optimiser state`);
        return tEntityManager
            .getRepository(OptimiserState)
            .save({
                ...stateData,
                simSet: simSetDTO,
                status: States.PENDING,
                converged: false,
                start: new Date(),
                stepCount: stepCount
            })
            .then((optimiserState: OptimiserState) => {
                simSetDTO.currentOptimiserStateId = optimiserState.id;
                return tEntityManager
                    .getRepository(SimSet)
                    .update(simSetDTO.id, {
                        currentOptimiserStateId: optimiserState.id
                    })
                    .then(() => {
                        return tEntityManager.getRepository(OptimiserState).findOne({
                            where: { id: optimiserState.id },
                            relations: { simSet: { simConfigParams: true }, convergenceTests: true }
                        });
                    });
            })
            .then(async (optimiserState: OptimiserState) => {
                // create the required convergence tests
                // ****** CONVERGENCE TESTS
                const convergenceTests: ConvergenceTest[] = await this.convergenceTestService.create(
                    optimiser.getStateRequiredConfiguratorParams(optimiserState),
                    optimiserState.simSet.simConfigParams || simSetDTO.simConfigParams,
                    optimiserState,
                    tEntityManager
                );
                return this.touch(optimiserState.id, tEntityManager);
            });
    }

    async touch(optimiserStateId: number, tEntityManager?: EntityManager): Promise<OptimiserState> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        let model: Model;
        let optimiser: Optimiser<ConfiguratorParamData, OptimiserParameters, OptimiserData>;

        if (this._dev) this._logger.log("Updating optimiser states");
        // fetch the optimiser state and related objects needed
        return tEntityManager
            .getRepository(OptimiserState)
            .findOneOrFail({
                where: {
                    id: optimiserStateId
                },
                relations: { simSet: { simConfigParams: true }, convergenceTests: { configuratorParams: true } }
            })
            .then(async (optimiserState: OptimiserState) => {
                model = this.modelService.getModel(optimiserState.modelName);
                optimiser = model.getOptimiser(optimiserState.optimiserName);

                if (this._dev) this._logger.log(`Updating optimiser state id:${optimiserState.id}`);
                // run the optimiser update method with the current ConvergenceTest results to get updated values
                // for the optimiser state parameters
                let updatedOptimiserState = optimiser.update(
                    optimiserState.simSet.optimiserParams,
                    optimiserState,
                    optimiserState.convergenceTests
                );

                // if the update has flagged the optimiser state as completed, mark the end timestamp and duration
                if (updatedOptimiserState.status === States.COMPLETED) {
                    updatedOptimiserState.end = new Date();
                    updatedOptimiserState.durationSec =
                        (updatedOptimiserState.end.getTime() - optimiserState.start.getTime()) / 1000;
                }
                return tEntityManager.getRepository(OptimiserState).save(updatedOptimiserState);
            })
            .then(async (optimiserState: OptimiserState) => {
                if (this._dev) this._logger.log(`Optimiser state ${optimiserState.id} updated`);
                if (optimiserState.status === States.RUNNING) {
                    await tEntityManager
                        .getRepository(SimSet)
                        .update(optimiserState.simSet.id, { state: States.RUNNING });
                } else if (optimiserState.status === States.COMPLETED) {
                    // the saved step also is complete.  We now check if the optimiser has converged to an optimal
                    // solution
                    if (!optimiserState.converged) {
                        let newState = optimiser.step(
                            optimiserState.simSet.optimiserParams,
                            optimiserState,
                            optimiserState.convergenceTests
                        );
                        // no convergence to a maximum, but it is possible that we have made a loop i.e. ended up
                        // at a previous optimisation point
                        const requiredConfigParamHashes: string[] = optimiser
                            .getStateRequiredConfiguratorParams(newState)
                            .map((configParam) => configParam.hash);
                        const existingConvergenceTestIdCount: number = (
                            await tEntityManager
                                .getRepository(ConvergenceTest)
                                .createQueryBuilder()
                                .innerJoin(
                                    "configurator_params",
                                    "ConfiguratorParams",
                                    "ConfiguratorParams.id = ConvergenceTest.configuratorParamsId"
                                )
                                .select("COUNT(ConvergenceTest.id)", "count")
                                .where("ConfiguratorParams.hash IN(:hashes)", {
                                    hashes: requiredConfigParamHashes
                                })
                                .andWhere("ConvergenceTest.simConfigParamsId=:simConfigParamsId", {
                                    simConfigParamsId: optimiserState.simSet.simConfigParams.id
                                })
                                .getRawOne()
                        )["count"];
                        if (existingConvergenceTestIdCount == requiredConfigParamHashes.length) {
                            if (this._dev)
                                this._logger.log(
                                    `Optimiser state id:${optimiserState.id} completed; an already calculated optimiser state has been reached (loop)`
                                );
                            await tEntityManager
                                .getRepository(SimSet)
                                .update(optimiserState.simSet.id, { state: States.COMPLETED });
                            return null;
                        } else {
                            if (this._dev)
                                this._logger.log(
                                    `Optimiser state id:${optimiserState.id} completed; no convergence yet, stepping`
                                );
                            return this.create(newState, optimiserState.simSet, tEntityManager).then((step) => {
                                if (this._dev) this._logger.log(`New optimiser state id:${step.id} created`);
                                return step;
                            });
                        }
                    } else {
                        if (this._dev)
                            this._logger.log(`Optimiser converged for SimSet id:${optimiserState.simSet.id}`);
                        return null;
                    }
                }
                return optimiserState;
            });
    }

    findOne(id: number) {
        return this.dataSource.getRepository(OptimiserState).findOneOrFail({
            where: { id: id },
            relations: {
                simSet: true,
                convergenceTests: {
                    simConfigs: true,
                    configuratorParams: true
                }
            }
        });
    }
}
