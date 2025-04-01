import { Injectable, Logger } from "@nestjs/common";
import { ModelService } from "../model/model.service";
import { DataSource, EntityManager } from "typeorm";
import {
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    Model,
    Optimiser,
    OptimiserData,
    OptimiserParameters,
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
        private convergenceTestService: ConvergenceTestService,
        private configuratorParamsService: ConfiguratorParamsService
    ) {
        this._dev = this._env.root.dev;
    }

    createState(simSetDTO: SimSetDTO, tEntityManager?: EntityManager): Promise<OptimiserState> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        const model: Model<ConfiguratorParamData, OptimiserParameters, OptimiserData> = this.modelService.getModel(
            simSetDTO.modelName
        );
        const configuratorName: string = simSetDTO.configuratorName || model.getDefaultConfigurator().name;
        const optimiserName: string = simSetDTO.optimiserName || model.getDefaultOptimiser().name;
        let optimiser: Optimiser<ConfiguratorParamData, OptimiserParameters, OptimiserData> =
            model.getOptimiser(optimiserName);

        // initialise the optimiser state
        if (this._dev) this._logger.log(`Creating optimiser state`);
        return tEntityManager
            .getRepository(OptimiserState)
            .save({
                ...optimiser.initialise(),
                simSet: simSetDTO,
                status: States.PENDING,
                converged: false,
                start: new Date(),
                stepCount: 0
            })
            .then(async (optimiserState: OptimiserState) => {
                simSetDTO.currentOptimiserStateId = optimiserState.id;
                await tEntityManager.getRepository(SimSet).update(simSetDTO.id, {
                    currentOptimiserStateId: optimiserState.id
                });
                if (this._dev) this._logger.log(`Optimiser state created`);
                return optimiserState;
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
                const convergenceTests = await this.convergenceTestService.create(
                    configuratorParams,
                    simSetDTO.simConfigParams,
                    optimiserState,
                    tEntityManager
                );

                return optimiserState;
            });
    }
}
