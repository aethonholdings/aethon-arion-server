import environment from "../../../../../env/environment";
import { SimConfigParams, SimSet } from "aethon-arion-db";
import {
    ConfiguratorParamData,
    Model,
    Optimiser,
    OptimiserData,
    OptimiserParameters,
    SimSetDTO,
    States
} from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { And, DataSource, EntityManager, In, Not } from "typeorm";
import { ModelService } from "../../services/model/model.service";
import { SimSetDTOCreate } from "../../../../common/dto/sim-set.dto";
import { ServerEnvironment } from "src/common/types/server.types";
import { OptimiserStateService } from "../optimiser-state/optimiser-state.service";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class SimSetService {
    private _logger: Logger = new Logger(SimSetService.name);
    private _dev: boolean = false;
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        private optimiserService: OptimiserStateService
    ) {
        this._dev = environment().root.dev;
    }

    async onApplicationBootstrap() {
        // await this.touch();
    }

    findAll(query: any): Promise<SimSetDTO[]> {
        return this.dataSource.getRepository(SimSet).find(query);
    }

    findOne(id: number): Promise<SimSetDTO> {
        return this.dataSource.getRepository(SimSet).findOneOrFail({
            where: { id: id },
            relations: {
                optimiserStates: {
                    convergenceTests: true
                },
                simConfigParams: true
            }
        });
    }

    create(simSetDTO: SimSetDTOCreate): Promise<SimSetDTO> {
        const model: Model = this.modelService.getModel(
            simSetDTO.modelName
        );
        const configuratorName: string = simSetDTO.configuratorName || model.getDefaultConfigurator().name;
        let optimiser: Optimiser<ConfiguratorParamData, OptimiserParameters, OptimiserData> = model.getOptimiser(
            simSetDTO.optimiserName || model.getDefaultOptimiser().name
        );

        if (model) {
            // start a transaction to save the sim set
            return this.dataSource.transaction(async (tEntityManager: EntityManager) => {
                // find the SimConfigParams or initialise them to default
                return tEntityManager
                    .getRepository(SimConfigParams)
                    .findOne({
                        where: {
                            randomStreamType:
                                simSetDTO?.simConfigParams?.randomStreamType || this._env.options.randomStreamType,
                            days: simSetDTO?.simConfigParams?.days || this._env.options.simulationDays
                        }
                    })
                    .then((simConfigParams: SimConfigParams) => {
                        if (!simConfigParams) {
                            return this.dataSource.getRepository(SimConfigParams).save({
                                days: this._env.options.simulationDays,
                                randomStreamType: this._env.options.randomStreamType
                            });
                        } else {
                            return simConfigParams;
                        }
                    })
                    .then((simConfigParams: SimConfigParams) => {
                        if (this._dev) this._logger.log(`SimConfigParams ${simConfigParams.id} found`);
                        // Create the SimSet with an empty optimiserStates array
                        // initialise withthe default optimiser by default for the time being

                        // ****** PARENT SIMSET
                        // create the simSet
                        if (this._dev) this._logger.log(`Creating sim set`);
                        return tEntityManager.getRepository(SimSet).save({
                            ...simSetDTO,
                            optimiserParams: simSetDTO.optimiserParams,
                            optimiserName: optimiser.name,
                            configuratorName: configuratorName,
                            state: States.PENDING,
                            optimiserStates: [],
                            simConfigParams: simConfigParams,
                            currentOptimiserStateId: null,
                            currentConvergenceTestIds: []
                        });
                    })
                    .then(async (simSet: SimSet) => {
                        if (this._dev) this._logger.log(`Sim set ${simSet.id} created`);
                        await this.optimiserService.create(null, simSet, tEntityManager);
                        return simSet;
                    });
            });
        } else {
            throw new Error("Invalid model name");
        }
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimSet));
    }

    // @Cron("30 * * * * *")
    async touch() {
        if (this._dev) this._logger.log(`Touching sim sets`);
        const simSets: SimSet[] = await this.dataSource.getRepository(SimSet).find({
            where: { state: And(Not(States.COMPLETED), Not(States.FAILED)) },
        });

        // NO RUNNING SIMSETS, CREATE A NEW ONE AUTOMATICALLY
        
    }
}
