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
    ): Promise<OrgConfig[]> {
        // generate the org configs required for each convergence test
        if (this._dev) this._logger.log(`Creating OrgConfigs`);
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();

        return tEntityManager
            .getRepository(OrgConfig)
            .find({
                where: {
                    configuratorParams: {
                        id: configuratorParamsDTO.id
                    }
                }
            })
            .then((orgConfigs: OrgConfig[]) => {
                // check if the required number of orgConfigs paired with a simConfig exist
                let orgConfigCountMin: number = 1;
                if (configuratorParamsDTO.multipleOrgConfigs) orgConfigCountMin = this._env.options.minRuns;
                const existingOrgConfigCount = orgConfigs.filter(
                    (orgConfig) => orgConfig.configuratorParams.id === configuratorParamsDTO.id
                ).length;

                const promises: Promise<OrgConfigDTO>[] = [];
                if (existingOrgConfigCount < orgConfigCountMin) {
                    const model = this.modelService.getModel(configuratorParamsDTO.modelName);
                    const configuratorName =
                        configuratorParamsDTO.configuratorName || model.getDefaultConfigurator().name;
                    // create the required number of orgConfigs
                    for (let i = 0; i < orgConfigCountMin - existingOrgConfigCount; i++) {
                        promises.push(
                            tEntityManager.getRepository(OrgConfig).save({
                                ...model.getConfigurator(configuratorName).generate(configuratorParamsDTO),
                                simConfigs: [],
                                configuratorParams: configuratorParamsDTO,
                                type: model.name
                            })
                        );
                    }
                }
                return Promise.all(promises).then((newOrgConfigs: OrgConfig[]) => {
                    if (this._dev) this._logger.log(`OrgConfigs created`);
                    return [...orgConfigs, ...newOrgConfigs];
                });
            });
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(OrgConfig));
    }
}
