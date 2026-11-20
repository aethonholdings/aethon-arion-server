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
        let simSet: SimSet;

        if (this._dev) this._logger.log("Updating optimiser states");
        // lock the optimiser state row with a locking (current) read: concurrent result posts that complete the same
        // state are serialised here, and a state that is already completed or failed is never updated or stepped
        // again (a second step would create a duplicate successor or end the SimSet as a false loop)
        const current: OptimiserState = await tEntityManager.getRepository(OptimiserState).findOneOrFail({
            where: { id: optimiserStateId },
            lock: { mode: "pessimistic_write" },
            loadEagerRelations: false
        });
        if (current.status === States.COMPLETED || current.status === States.FAILED) return current;
        // fetch the optimiser state and related objects needed
        return tEntityManager
            .getRepository(OptimiserState)
            .findOneOrFail({
                where: {
                    id: optimiserStateId
                },
                relations: {
                    simSet: { simConfigParams: true },
                    convergenceTests: {
                        configuratorParams: true,
                        simConfigs: true
                    }
                }
            })
            .then(async (optimiserState: OptimiserState) => {
                model = this.modelService.getModel(optimiserState.modelName);
                optimiser = model.getOptimiser(optimiserState.optimiserName);
                simSet = optimiserState.simSet;

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
                        // loop detection, scoped to this SimSet: the step is a loop only if every point it needs
                        // was already evaluated by an earlier optimiser state of the same SimSet. (Convergence tests
                        // are shared across SimSets with the same simConfigParams, so a global existence check would
                        // stop a SimSet that merely reaches points another SimSet evaluated.)
                        const uniqueRequiredHashes: string[] = [...new Set(requiredConfigParamHashes)];
                        const evaluatedHashCount: number = Number(
                            (
                                await tEntityManager
                                    .getRepository(ConvergenceTest)
                                    .createQueryBuilder("convergenceTest")
                                    .innerJoin(
                                        "configurator_params",
                                        "configuratorParams",
                                        "configuratorParams.id = convergenceTest.configuratorParamsId"
                                    )
                                    .innerJoin(
                                        "optimiser_state_convergence_tests_convergence_test",
                                        "link",
                                        "link.convergenceTestId = convergenceTest.id"
                                    )
                                    .innerJoin(OptimiserState, "previousState", "previousState.id = link.optimiserStateId")
                                    .select("COUNT(DISTINCT configuratorParams.hash)", "count")
                                    .where("configuratorParams.hash IN (:...hashes)", { hashes: uniqueRequiredHashes })
                                    .andWhere("previousState.simSetId = :simSetId", {
                                        simSetId: optimiserState.simSet.id
                                    })
                                    .getRawOne()
                            )?.count ?? 0
                        );
                        const existingConvergenceTestIdCount: number = evaluatedHashCount;
                        requiredConfigParamHashes.length = 0;
                        requiredConfigParamHashes.push(...uniqueRequiredHashes);
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
            })
            .then(async (optimiserState) => {
                // finally, if the optimisation has completed, update the SimSet
                if (!optimiserState) {
                    simSet.state = States.COMPLETED;
                    await tEntityManager.getRepository(SimSet).save(simSet);
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
                    simConfigs: {
                        orgConfig: true
                    },
                    configuratorParams: true
                }
            }
        });
    }
}
