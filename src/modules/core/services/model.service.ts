import environment from "../../../../env/environment";
import {
    ConfiguratorParamData,
    Model,
    OptimiserData,
    OptimiserParameters,
    OptimiserStateDTO,
    ResultDTO,
    SimConfigDTO
} from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { ServerEnvironment } from "src/common/types/server.types";

@Injectable()
export class ModelService {
    private _modelNames: string[];
    private _dev: boolean = false;
    private _models: Model<ConfiguratorParamData, OptimiserParameters, OptimiserData>[] = [];

    constructor() {
        const env: ServerEnvironment = environment();
        this._models = env.options.models;
        this._modelNames = this._models.map((model) => model.name);
        this._dev = env.root.dev;
    }

    getModelNames(): string[] {
        return this._modelNames;
    }

    getModel(modelName: string): Model<ConfiguratorParamData, OptimiserParameters, OptimiserData> {
        const model = this._models.find((model) => model.name === modelName);
        if (model) return model;
        throw new Error(`Model ${modelName} not found`);
    }

    optimiserStep(optimiserState: OptimiserStateDTO<OptimiserData>): OptimiserStateDTO<OptimiserData> {
        const model = this.getModel(optimiserState.modelName);
        const optimiser = model.optimisers.find((optimiser) => optimiser.name === optimiserState.optimiserName);
        if (optimiser) return optimiser.step(optimiserState);
        throw new Error(`Optimiser ${optimiserState.optimiserName} not found on model ${optimiserState.modelName}`);
    }

    calculatePerformance(simConfig: SimConfigDTO, result: ResultDTO): number | null {
        let performance: number;
        try {
            performance = this.getModel(simConfig.orgConfig.type).getPerformance(result);
        } catch (error) {
            performance = null;
        }
        return performance;
    }

    deleteRecord(id: number, logger: Logger, repository: any): Promise<number> {
        return repository.delete({ id: id }).then((result) => {
            if (result.affected) return id;
            else throw new Error(`No record found on repository ${repository.name} with id ${id} to delete`);
        });
    }
}
