import environment from "../../../../../env/environment";
import {
    ConfiguratorParamData,
    Model,
    OptimiserData,
    OptimiserParameters,
    ResultDTO,
    SimConfigDTO,
} from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { ServerEnvironment } from "src/common/types/server.types";
import { DataSource } from "typeorm";

@Injectable()
export class ModelService {
    private _modelNames: string[];
    private _dev: boolean = false;
    private _models: Model[] = [];

    constructor(private dataSource: DataSource) {
        const env: ServerEnvironment = environment();
        this._models = env.options.models;
        this._modelNames = this._models.map((model) => model.name);
        this._dev = env.root.dev;
    }

    getModelNames(): string[] {
        return this._modelNames;
    }

    getModel(modelName: string): Model {
        const model = this._models.find((model) => model.name === modelName);
        if (model) return model;
        throw new Error(`Model ${modelName} not found`);
    }
    
    deleteRecord(id: number, logger: Logger, repository: any): Promise<number> {
        return repository.delete({ id: id }).then((result) => {
            if (result.affected) return id;
            else throw new Error(`No record found on repository ${repository} with id ${id} to delete`);
        });
    }
}
