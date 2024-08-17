import { C1Configurator, C1ConfiguratorSignature, C1ModelName, C1ReportingVariablesIndex } from "aethon-arion-c1";
import { Configurator, ConfiguratorParamsDTO, ResultDTO, SimConfigDTO } from "aethon-arion-pipeline";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ModelService {
    private _configurators: Map<string, Configurator> = new Map<string, Configurator>();

    constructor() {
        this._configurators.set(C1ConfiguratorSignature.name, new C1Configurator());
        // this._configurators.set(C3ScaffoldConfiguratorSignature.name, new C3ScaffoldConfigurator());
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
}
