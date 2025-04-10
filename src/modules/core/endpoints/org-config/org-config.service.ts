import { OrgConfig } from "aethon-arion-db";
import { ConfiguratorParamData, ConfiguratorParamsDTO, OrgConfigDTO } from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { ModelService } from "../../services/model/model.service";
import { ServerEnvironment } from "src/common/types/server.types";
import environment from "env/environment";

@Injectable()
export class OrgConfigService {
    private _dev: boolean = false;
    private _logger: Logger = new Logger(OrgConfigService.name);
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService
    ) {
        this._dev = this._env.root.dev;
    }

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

    create(
        configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParamData>,
        tEntityManager?: EntityManager
    ): Promise<OrgConfig> {
        const model = this.modelService.getModel(configuratorParamsDTO.modelName);
        const configuratorName = configuratorParamsDTO.configuratorName || model.getDefaultConfigurator().name;
        return tEntityManager.getRepository(OrgConfig).save({
            ...model.getConfigurator(configuratorName).generate(configuratorParamsDTO),
            simConfigs: [],
            configuratorParams: configuratorParamsDTO,
            type: model.name
        });
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(OrgConfig));
    }
}
