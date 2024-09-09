import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { SimConfig, SimSet, OrgConfig, Result, StateSpacePoint } from "aethon-arion-db";

@Injectable()
export class DatabaseService {
    entities: any[] = [
        SimSet,
        OrgConfig,
        SimConfig,
        Result, 
        StateSpacePoint
    ];
    constructor(private dataSource: DataSource) {}

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
