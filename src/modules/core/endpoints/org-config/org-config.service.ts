import { ConfiguratorParams, OrgConfig } from "aethon-arion-db";
import { ConfiguratorParamData, ConfiguratorParamsDTO, ObjectHash, OrgConfigDTO } from "aethon-arion-pipeline";
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
        return this.dataSource
            .getRepository(OrgConfig)
            .findOneOrFail({
                where: { id: id },
                relations: { simConfigs: { simConfigParams: true }, configuratorParams: true }
            })
            .then((orgConfig: OrgConfig) => {
                return orgConfig.toDTO();
            });
    }

    findAll(type?: string): Promise<OrgConfigDTO[]> {
        return this.dataSource
            .getRepository(OrgConfig)
            .find({ where: { configuratorParams: { modelName: type } }, relations: { configuratorParams: true } })
            .then((orgConfigs: OrgConfig[]) => {
                return orgConfigs.map((orgConfig) => orgConfig.toDTO());
            });
    }

    async create(configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParamData>): Promise<OrgConfigDTO> {
        return new Promise((resolve, reject) => {
            const model = this.modelService.getModel(configuratorParamsDTO.modelName);
            if (!model) return reject(new Error("Invalid model name"));
            return resolve(model.getDefaultConfigurator().generate(configuratorParamsDTO));
        })
            .then((orgConfigDTO: OrgConfigDTO) => {
                // find the configurator param object based on the object hash
                const hash = new ObjectHash(configuratorParamsDTO).toString();
                return this.dataSource
                    .getRepository(ConfiguratorParams)
                    .findOne({
                        where: { hash: hash }
                    })
                    .then(async (configuratorParams: ConfiguratorParams) => {
                        if (!configuratorParams) {
                            return await this.dataSource.getRepository(ConfiguratorParams).save({
                                modelName: configuratorParamsDTO.modelName,
                                configuratorName: configuratorParamsDTO.configuratorName,
                                data: configuratorParamsDTO.data,
                                hash: hash
                            });
                        } else return configuratorParams;
                    })
                    .then((configuratorParams: ConfiguratorParams) => {
                        return {
                            ...orgConfigDTO,
                            configuratorParams: configuratorParams
                        } as OrgConfigDTO;
                    });
            })
            .then(async (orgConfigDTO: OrgConfigDTO) => {
                return await this.dataSource.getRepository(OrgConfig).save(orgConfigDTO);
            });
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(OrgConfig));
    }
}
