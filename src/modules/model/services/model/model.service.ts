import environment from "../../../../../env/environment";
import { C1Configurator, C1ConfiguratorSignature, C1ModelName, C1ReportingVariablesIndex } from "aethon-arion-c1";
import { Configurator, ConfiguratorParamsDTO, ResultDTO, SimConfigDTO } from "aethon-arion-pipeline";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ServerEnvironment } from "src/common/interfaces/server-environment.interface";

@Injectable()
export class ModelService {
    private _configurators: Map<string, Configurator> = new Map<string, Configurator>();
    private _modelNames: string[] = ["C1"];
    private _dev: boolean = false;

    constructor() {
        const env: ServerEnvironment = environment();
        this._configurators.set(C1ConfiguratorSignature.name, new C1Configurator());
        this._dev = env.root.dev;

    }

    getModelNames(): string[] {
        return this._modelNames;
    }

    getConfigurator(configuratorParamsDTO: ConfiguratorParamsDTO): Configurator {
        return this._configurators.get(configuratorParamsDTO.configuratorName);
    }

    calculatePerformance(simConfig: SimConfigDTO, result: ResultDTO): number {
        let performance: number;
        switch (simConfig.orgConfig.type) {
            case C1ModelName: {
                performance = result.reporting[C1ReportingVariablesIndex.REVENUE] / result.priorityTensor.length;
                break;
            }
            default: {
                performance = 0;
            }
        }
        return performance;
    }

   error(err: Error, logger?: Logger, message: string = "Invalid query", httpStatus: HttpStatus = HttpStatus.BAD_REQUEST): HttpException {
        (logger)? logger.log(err.message) : null;
        if(this._dev) {
            message = err.message;
        }
        return new HttpException(message, httpStatus);
    }

    deleteRecord(id: number, logger: Logger, repository: any): Promise<number> {
        return repository
            .delete({ id: id })
            .then((result) => {
                if(result.affected) return id; else throw new Error("No record found");
            }).catch((err) => {
                throw this.error(err, logger);
            });;
    }
}
