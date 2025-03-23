import { OrgConfig } from "aethon-arion-db";
import { ConfiguratorParamData, ConfiguratorParamsDTO, OrgConfigDTO } from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ModelService } from "../../services/model/model.service";

@Injectable()
export class OrgConfigService {
    private _logger: Logger = new Logger(OrgConfigService.name);

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService
    ) {}

    findOne(id: number): Promise<OrgConfigDTO> {
        return this.dataSource.getRepository(OrgConfig).findOneOrFail({
            where: { id: id },
            relations: { simConfigs: { simConfigParams: true }, configuratorParams: true }
        });
    }

    findAll(type?: string): Promise<OrgConfigDTO[]> {
        return this.dataSource
            .getRepository(OrgConfig)
            .find({ where: { configuratorParams: { modelName: type } }, relations: { configuratorParams: true } });
    }

    async create(configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParamData>): Promise<OrgConfigDTO> {
        const model = this.modelService.getModel(configuratorParamsDTO.modelName);
        const orgConfigDTO = model.getConfigurator(configuratorParamsDTO.configuratorName).generate(configuratorParamsDTO);
        return await this.dataSource.getRepository(OrgConfig).save({
            ...orgConfigDTO,
            type: configuratorParamsDTO.modelName,
            configuratorName: configuratorParamsDTO.configuratorName,
            configuratorParams: configuratorParamsDTO
        });
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(OrgConfig));
    }
}
