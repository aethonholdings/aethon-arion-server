import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { SimConfig, SimSet, OrgConfig, Result, StateSpacePoint } from "aethon-arion-db";

import simConfigs from "./seeds/sim-configs.data.mock.json";
import orgConfigs from "./seeds/org-configs.data.mock.json";
import results from "./seeds/results.data.mock.json";
import simSets from "./seeds/sim-set.data.mock.json";
import stateSpacePoints from "./seeds/state-space-points.data.mock.json";

@Injectable()
export class DatabaseService {
    entities: any[] = [
        SimSet,
        OrgConfig,
        SimConfig,
        Result, 
        StateSpacePoint
    ];
    data: any = {
        SimSet: simSets,
        OrgConfig: orgConfigs,
        SimConfig: simConfigs,
        Result: results,
        StateSpacePoint: stateSpacePoints
    };
    constructor(private dataSource: DataSource) {}

    async seedDb() {
        const queryRunner = this.dataSource.createQueryRunner();
        await this.purgeDb();
        await queryRunner.connect();
        try {
            for (let entityIndex in this.entities) {
                const entity = this.entities[entityIndex];
                const seedData = this.data[entity.name];
                await queryRunner.startTransaction();
                await queryRunner.manager.insert(entity, seedData);
                await queryRunner.commitTransaction();
            }
        } catch (err) {
            await queryRunner.rollbackTransaction();
            console.log(err);
        } finally {
            await queryRunner.release();
        }
    }

    private async purgeDb() {
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
