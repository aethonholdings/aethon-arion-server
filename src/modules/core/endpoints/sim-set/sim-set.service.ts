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
import { OptimiserService } from "../../services/optimiser/optimiser.service";
import { ServerEnvironment } from "src/common/types/server.types";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class SimSetService {
    private _logger: Logger = new Logger(SimSetService.name);
    private _dev: boolean = false;
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        private optimiserService: OptimiserService
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
        const model: Model<ConfiguratorParamData, OptimiserParameters, OptimiserData> = this.modelService.getModel(
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
                            optimiserParams: optimiser.parameters,
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
            relations: { optimiserStates: { simSet: { simConfigParams: true } }, simConfigParams: true }
        });
        for (let simSet of simSets) {
            await this.optimiserService.touch(simSet.currentOptimiserStateId);
        }
    }

    // async touchSimSet(simSet: SimSet): Promise<SimSet> {
    //     if (simSet.state === States.COMPLETED || simSet.state === States.FAILED) return simSet;
    //     if (this._dev) this._logger.log(`Touching sim set ${simSet.id}`);

    //     if (simSet.optimiserStates.length > 0) {
    //         let completed: number = 0;
    //         simSet.optimiserStates.forEach(async (optimiserState) => {
    //             await this.optimiserService.touchState(optimiserState);
    //             if (optimiserState.status === States.COMPLETED) completed++;
    //             if (optimiserState.status === States.FAILED) simSet.state = States.FAILED;
    //             if (optimiserState.status === States.RUNNING && simSet.state !== States.FAILED) {
    //                 simSet.state = States.RUNNING;
    //             }
    //         });
    //         if (simSet.optimiserStates.length > 0 && completed === simSet.optimiserStates.length)
    //             simSet.state = States.COMPLETED;
    //     }
    //     await this.dataSource.getRepository(SimSet).save(simSet);
    //     return this.dataSource
    //         .getRepository(SimSet)
    //         .findOneOrFail({
    //             where: { id: simSet.id },
    //             relations: { optimiserStates: { simSet: { simConfigParams: true } }, simConfigParams: true }
    //         })
    //         .then((simSet) => {
    //             if (this._dev) this._logger.log(`Sim set ${simSet.id} touched`);
    //             return simSet;
    //         });
    // }
}
