import { Injectable } from "@nestjs/common";
import { ConfiguratorParams } from "aethon-arion-db";
import {
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    Model,
    ObjectHash,
    OptimiserData,
    OptimiserParameters
} from "aethon-arion-pipeline";
import { DataSource } from "typeorm";

type Where =
    | { id: number; configParams?: never; hash?: never }
    | { configParams: ConfiguratorParams; id?: never; hash?: never }
    | { hash: string; configParams?: never; id?: never };

@Injectable()
export class ConfiguratorParamsService {
    constructor(private dataSource: DataSource) {}

    async create(
        model: Model<ConfiguratorParamData, OptimiserParameters, OptimiserData>,
        configuratorParamData: ConfiguratorParamData,
        configuratorName?: string
    ): Promise<ConfiguratorParamsDTO<ConfiguratorParamData>> {
        if (!configuratorName) configuratorName = model.getDefaultConfigurator().name;
        // create a new configurator params
        return this.dataSource.getRepository(ConfiguratorParams).save({
            modelName: model.name,
            configuratorName: configuratorName,
            data: configuratorParamData,
            hash: new ObjectHash(configuratorParamData).toString()
        });
    }

    async findOne(where: Where): Promise<ConfiguratorParamsDTO<ConfiguratorParamData>> {
        if (where?.configParams) {
            where = { hash: new ObjectHash(where.configParams).toString() };
        }
        return this.dataSource.getRepository(ConfiguratorParams).findOne({ where: where });
    }
}
