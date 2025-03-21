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
import { DataSource } from "typeorm";
import { ModelService } from "../../services/model/model.service";
import { SimSetDTOCreate } from "../../../../common/dto/sim-set.dto";
import { OptimiserService } from "../../services/optimiser/optimiser.service";
import { ServerEnvironment } from "src/common/types/server.types";

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

    findAll(query: any): Promise<SimSetDTO[]> {
        return this.dataSource.getRepository(SimSet).find(query);
    }

    findOne(id: number): Promise<SimSetDTO> {
        return this.dataSource.getRepository(SimSet).findOneOrFail({
            where: { id: id },
            relations: { optimiserStates: true, simConfigParams: true }
        });
    }

    async create(simSetDTO: SimSetDTOCreate): Promise<SimSetDTO> {
        const model: Model<ConfiguratorParamData, OptimiserParameters, OptimiserData> = this.modelService.getModel(
            simSetDTO.modelName
        );
        if (model) {
            // find the SimConfigParams or initialise them to default
            let simConfigParams: SimConfigParams;
            if (simSetDTO.simConfigParams && simSetDTO.simConfigParams.id) {
                simConfigParams = await this.dataSource.getRepository(SimConfigParams).findOneOrFail({
                    where: { id: simSetDTO.simConfigParams.id }
                });
            } else {
                simConfigParams = await this.dataSource.getRepository(SimConfigParams).save({
                    days: this._env.options.simulationDays,
                    randomStreamType: this._env.options.randomStreamType
                });
            }

            // Create the SimSet with an empty optimiserStates array
            // initialise withthe default optimiser by default for the time being
            let optimiser: Optimiser<ConfiguratorParamData, OptimiserParameters, OptimiserData>;
            if (simSetDTO.optimiserName) {
                optimiser = model.getOptimiser(simSetDTO.optimiserName);
            } else {
                optimiser = model.getDefaultOptimiser();
            }
            const simSet: SimSet = await this.dataSource.getRepository(SimSet).save({
                ...simSetDTO,
                modelParams: model.getParameters(),
                optimiserName: optimiser.name,
                state: States.PENDING,
                optimiserStates: [],
                simConfigParams: simConfigParams
            });

            // Create the OptimiserState and attach it to the SimSet
            await this.optimiserService.createState(simSet, optimiser.step());

            // return the SimSet
            return this.findOne(simSet.id);
        } else {
            throw new Error("Invalid model name");
        }
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimSet));
    }
}
