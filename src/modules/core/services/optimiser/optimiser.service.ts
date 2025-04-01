import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { ModelService } from "../model/model.service";
import { DataSource, EntityManager } from "typeorm";
import {
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    Model,
    Optimiser,
    OptimiserData,
    OptimiserParameters,
    OptimiserStateDTO,
    SimSetDTO,
    States
} from "aethon-arion-pipeline";
import { ConfiguratorParams, OptimiserState, SimSet } from "aethon-arion-db";
import { ConvergenceTestService } from "../convergence-test/convergence-test.service";
import { ConfiguratorParamsService } from "../configurator-params/configurator-params.service";
import { ServerEnvironment } from "src/common/types/server.types";
import environment from "env/environment";

@Injectable()
export class OptimiserService {
    private _dev: boolean = false;
    private _logger: Logger = new Logger(OptimiserService.name);
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        @Inject(forwardRef(() => ConvergenceTestService)) private convergenceTestService: ConvergenceTestService,
        private configuratorParamsService: ConfiguratorParamsService
    ) {
        this._dev = this._env.root.dev;
    }

    create(
        optimiserStateDTO: OptimiserStateDTO<ConfiguratorParams>,
        simSetDTO: SimSetDTO,
        tEntityManager?: EntityManager
    ): Promise<OptimiserState> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        const model: Model<ConfiguratorParamData, OptimiserParameters, OptimiserData> = this.modelService.getModel(
            simSetDTO.modelName
        );
        const configuratorName: string = simSetDTO.configuratorName || model.getDefaultConfigurator().name;
        const optimiserName: string = simSetDTO.optimiserName || model.getDefaultOptimiser().name;
        let optimiser: Optimiser<ConfiguratorParamData, OptimiserParameters, OptimiserData> =
            model.getOptimiser(optimiserName);
        let stepCount: number;
        let stateData: OptimiserStateDTO<any>;

        if (!optimiserStateDTO) {
            stepCount = 0;
            stateData = optimiser.initialise();
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
                        if (this._dev) this._logger.log(`Optimiser state created`);
                        return tEntityManager.getRepository(OptimiserState).findOne({
                            where: {
                                id: optimiserState.id
                            },
                            relations: { simSet: true, convergenceTests: true }
                        });
                    });
            })
            .then((optimiserState: OptimiserState) => {
                return tEntityManager
                    .getRepository(OptimiserState)
                    .findOne({
                        where: { id: optimiserState.id },
                        relations: { simSet: { simConfigParams: true }, convergenceTests: true }
                    });
            })
            .then(async (optimiserState: OptimiserState) => {
                // ****** CONFIGURATOR PARAMS
                const configuratorParams: ConfiguratorParams[] = await this.configuratorParamsService.create(
                    simSetDTO.modelName,
                    configuratorName,
                    optimiser.getStateRequiredConfiguratorParams(optimiserState).map((param) => {
                        return {
                            data: param.configuratorParams.configuratorParamData,
                            hash: param.configuratorParams.hash,
                            multipleOrgConfigs: param.multipleOrgConfigs
                        } as ConfiguratorParamsDTO<ConfiguratorParamData>;
                    }),
                    tEntityManager
                );

                // ****** CONVERGENCE TESTS
                await this.convergenceTestService.create(
                    configuratorParams,
                    optimiserState.simSet.simConfigParams || simSetDTO.simConfigParams,
                    optimiserState,
                    tEntityManager
                );
                return optimiserState;
            });
    }

    async touch(optimiserStateId: number, tEntityManager?: EntityManager): Promise<OptimiserState> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();

        if (this._dev) this._logger.log("Updating optimiser states");
        return tEntityManager
            .getRepository(OptimiserState)
            .findOne({
                where: {
                    id: optimiserStateId
                },
                relations: { simSet: true, convergenceTests: true }
            })
            .then(async (optimiserState: OptimiserState) => {
                let running: boolean = false;
                let completed: boolean = true;
                let converged: boolean = false;
                for (let convergenceTest of optimiserState.convergenceTests) {
                    if (convergenceTest.state === States.RUNNING) running = true;
                    if (convergenceTest.state !== States.COMPLETED) completed = false;
                    if (!convergenceTest.converged) converged = false;
                }
                if (running) {
                    optimiserState.status = States.RUNNING;
                } else if (completed) {
                    optimiserState.status = States.COMPLETED;
                    optimiserState.end = new Date();
                    optimiserState.durationSec = (optimiserState.end.getTime() - optimiserState.start.getTime()) / 1000;
                    optimiserState.percentComplete = 1;
                } else {
                    optimiserState.status = States.PENDING;
                }
                optimiserState.converged = converged;
                return tEntityManager.getRepository(OptimiserState).save(optimiserState);
            })
            .then(async (optimiserState: OptimiserState) => {
                if (this._dev) this._logger.log("Optimiser state updated");
                if (optimiserState.status === States.COMPLETED) {
                    if (this._dev) this._logger.log("Stepping completed optimisers");
                    return this._step(optimiserState, tEntityManager);
                }
                return null;
            });
    }

    private _step(optimiserState: OptimiserState, tEntityManager?: EntityManager): Promise<OptimiserState> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        if (this._dev) this._logger.log(`Stepping optimiser state id:${optimiserState.id}`);
        let modelTmp = this.modelService.getModel(optimiserState.modelName);
        let optimiser = modelTmp.getOptimiser(optimiserState.optimiserName);
        let newState = optimiser.step(optimiserState);
        return this.create(newState, optimiserState.simSet, tEntityManager).then((optimiserState: OptimiserState) => {
            if (this._dev) this._logger.log(`New optimiser state id:${optimiserState.id} created`);
            return optimiserState;
        });
    }
}
