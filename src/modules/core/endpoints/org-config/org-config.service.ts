import { OrgConfig } from "aethon-arion-db";
import { ConfiguratorParamsDTO, OrgConfigDTO } from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ModelService } from "../../services/model.service";

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
            relations: { simConfigs: true }
        });
    }

    findAll(type?: string): Promise<OrgConfigDTO[]> {
        return this.dataSource.getRepository(OrgConfig).find({ where: { type: type } });
    }

    create(configuratorParamsDTO: ConfiguratorParamsDTO): Promise<OrgConfigDTO> {
        return new Promise((resolve, reject) => {
            const configurator = this.modelService.getConfigurator(configuratorParamsDTO);
            if (!configurator) return reject(new Error("Invalid configurator name"));
            return resolve(configurator.generate(configuratorParamsDTO));
        }).then((orgConfigDTO: OrgConfigDTO) => {
            const toSave = {
                ...orgConfigDTO,
                configuratorName: configuratorParamsDTO.configuratorName
            };
            return this.dataSource.getRepository(OrgConfig).save(toSave);
        });
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(OrgConfig));
    }
}
