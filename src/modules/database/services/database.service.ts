import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import env from "../../../../env/environment";

import {
    SimConfig,
    SimSet,
    OrgConfig,
    Result,
    StateSpacePoint,
    ConfiguratorParams,
    SimConfigParams
} from "aethon-arion-db";

@Injectable()
export class DatabaseService {
    private _dbConfig = env().database;
    entities: any[] = [SimSet, OrgConfig, SimConfig, Result, StateSpacePoint, ConfiguratorParams, SimConfigParams];
    constructor(private dataSource: DataSource) {}

    async onApplicationBootstrap() {
        if (this._dbConfig.synchronize) {
            await this.purgeDb();
        }
    }

    async purgeDb() {
        await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 0;`);
        for (const entity of this.entities) {
            const repository = this.dataSource.getRepository(entity);
            try {
                await repository.query(`TRUNCATE ${repository.metadata.tableName};`);
            } catch (err) {
                console.log(err);
            }
        }
        await this.dataSource.query(`SET FOREIGN_KEY_CHECKS = 1;`);
    }
}
