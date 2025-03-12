import environment from "../../../../env/environment";
import {
    Model,
    ResultDTO,
    SimConfigDTO
} from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { ServerEnvironment } from "src/common/types/server.types";

@Injectable()
export class ModelService {
    private _modelNames: string[];
    private _dev: boolean = false;
    private _models: Model[] = [];

    constructor() {
        const env: ServerEnvironment = environment();
        this._models = env.options.models;
        this._modelNames = this._models.map((model) => model.name);
        this._dev = env.root.dev;
    }

    getModelNames(): string[] {
        return this._modelNames;
    }

    getModel(modelName: string): Model {
        return this._models.find((model) => model.name === modelName);
    }

    calculatePerformance(simConfig: SimConfigDTO, result: ResultDTO): number {
        let performance: number;
        try {
            performance = this.getModel(simConfig.orgConfig.type).getPerformance(result);
        } catch (error) {
            performance = 0;
        }
        return performance;
    }

    deleteRecord(id: number, logger: Logger, repository: any): Promise<number> {
        return repository.delete({ id: id }).then((result) => {
            if (result.affected) return id;
            else throw new Error("No record found");
        });
    }
}
