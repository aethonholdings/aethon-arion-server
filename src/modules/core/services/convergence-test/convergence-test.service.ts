import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ConvergenceTest } from "aethon-arion-db";
import {
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    Model,
    OptimiserData,
    OptimiserParameters,
    SimConfigParamsDTO,
    States
} from "aethon-arion-pipeline";
import { ModelService } from "../model/model.service";
import { SimConfigDTO, ConvergenceTestDTO } from "aethon-arion-pipeline";
import { OrgConfigService } from "../../endpoints/org-config/org-config.service";
import { SimConfigService } from "../../endpoints/sim-config/sim-config.service";

@Injectable()
export class ConvergenceTestService {
    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        private orgConfigService: OrgConfigService,
        private simConfigService: SimConfigService
    ) {}

    create(
        simConfigParamsDTO: SimConfigParamsDTO,
        configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParamData>
    ): Promise<ConvergenceTest> {
        // create a new convergence test
        return this.dataSource
            .getRepository(ConvergenceTest)
            .save({
                simConfigParams: simConfigParamsDTO,
                configuratorParams: configuratorParamsDTO,
                orgConfigCount: 0,
                simConfigCount: 0,
                completedSimConfigCount: 0,
                resultCount: 0,
                dispatchedRuns: 0,
                avgPerformance: null,
                stdDevPerformance: null,
                processingTimeSec: null,
                state: States.PENDING
            })
            .then(async (convergenceTestDTO) => {
                // generate a sim config based on the convergence test
                // return the convergence test
                await this.generateSimConfig(convergenceTestDTO);
                return convergenceTestDTO;
            });
    }

    async generateSimConfig(convergenceTestDTO: ConvergenceTestDTO): Promise<SimConfigDTO> {
        // generate an org config based on the convergence test
        const model: Model<ConfiguratorParamData, OptimiserParameters, OptimiserData> = this.modelService.getModel(
            convergenceTestDTO.configuratorParams.modelName
        );
        const orgConfigDTO = await this.orgConfigService.create(convergenceTestDTO.configuratorParams);
        return this.simConfigService.create(
            orgConfigDTO.id,
            convergenceTestDTO.id,
            convergenceTestDTO.simConfigParams.randomStreamType,
            convergenceTestDTO.simConfigParams.days
        );
    }
}
