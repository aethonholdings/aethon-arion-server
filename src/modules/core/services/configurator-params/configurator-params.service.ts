import { Injectable, Logger } from "@nestjs/common";
import { ConfiguratorParams } from "aethon-arion-db";
import {
    Configurator,
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    Model,
    ObjectHash,
    OptimiserData,
    OptimiserParameters,
    OptimiserStateDTO
} from "aethon-arion-pipeline";
import environment from "env/environment";
import { ServerEnvironment } from "src/common/types/server.types";
import { DataSource, EntityManager, In } from "typeorm";
import { ModelService } from "../model/model.service";

type Where =
    | { id: number; configParams?: never; hash?: never }
    | { configParams: ConfiguratorParams; id?: never; hash?: never }
    | { hash: string; configParams?: never; id?: never };

@Injectable()
export class ConfiguratorParamsService {
    private _dev: boolean = false;
    private _logger: Logger = new Logger(ConfiguratorParamsService.name);
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService
    ) {
        this._dev = this._env.root.dev;
    }

    async create(
        modelName: string,
        configuratorName: string,
        configuratorParamsDTOs:
            | ConfiguratorParamsDTO<ConfiguratorParamData>
            | ConfiguratorParamsDTO<ConfiguratorParamData>[],
        tEntityManager?: EntityManager
    ): Promise<ConfiguratorParams[]> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        const model: Model =
            this.modelService.getModel(modelName);
        const configurator: Configurator<ConfiguratorParamData> =
            model.getConfigurator(configuratorName);
        if (!Array.isArray(configuratorParamsDTOs)) configuratorParamsDTOs = [configuratorParamsDTOs];

        // create new configurator params
        // ****** CONFIGURATOR PARAMS
        // assess the configurator params required in the current optimiser state
        // find whether they correspond to existing configurator params
        // if not, create them

        // first get what configuratorParams are required by the optimiser step
        if (this._dev) this._logger.log(`Creating required ConfiguratorParams`);
        const requiredHashes: string[] = configuratorParamsDTOs.map((param) => param.hash);
        // fetch the configurator params already in the database against the hashes required
        // by the optimiser state
        return tEntityManager
            .getRepository(ConfiguratorParams)
            .find({ where: { hash: In(requiredHashes) } })
            .then(async (configuratorParams: ConfiguratorParams[]) => {
                let configuratorParamsNew: ConfiguratorParams[] = [];
                for (let configuratorParam of configuratorParamsDTOs) {
                    // check if a ConfiguratorParam entity was found in the database with the same hash
                    // as the required ConfiguratorParam
                    if (!configuratorParams.find((foundParam) => foundParam.hash === configuratorParam.hash)) {
                        // the ConfiguratorParam hash was not found in the database, create a configurator param
                        let configuratorParamsTmp = {
                            ...configuratorParam,
                            modelName: model.name,
                            configuratorName: configuratorName
                        } as ConfiguratorParams;
                        configuratorParamsNew.push(configuratorParamsTmp);
                    }
                }
                configuratorParams.push(
                    ...(await tEntityManager.getRepository(ConfiguratorParams).save(configuratorParamsNew))
                );
                return configuratorParams;
            })
            .then((configuratorParams) => {
                if (this._dev) this._logger.log(`ConfiguratorParams created`);
                return configuratorParams;
            });
    }

    async findOne(where: Where): Promise<ConfiguratorParamsDTO<ConfiguratorParamData>> {
        if (where?.configParams) {
            where = { hash: new ObjectHash(where.configParams).toString() };
        }
        return this.dataSource.getRepository(ConfiguratorParams).findOne({ where: where });
    }
}
