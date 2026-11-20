import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import env from "../../../../env/environment";

import {
    SimConfig,
    SimSet,
    OrgConfig,
    Result,
    StateSpacePoint,
    ConfiguratorParams,
    SimConfigParams,
    ConvergenceTest,
    OptimiserState,
    Run
} from "aethon-arion-db";

@Injectable()
export class DatabaseService {
    private _logger: Logger = new Logger(DatabaseService.name);
    private _dbConfig = env().database;
    private _rootConfig = env().root;
    entities: any[] = [
        SimSet,
        OrgConfig,
        SimConfig,
        Result,
        StateSpacePoint,
        ConfiguratorParams,
        SimConfigParams,
        ConvergenceTest,
        OptimiserState,
        Run
    ];
    constructor(private dataSource: DataSource) {}

    async onApplicationBootstrap() {
        // purging is an explicit, development-only opt-in; schema synchronisation alone never deletes data
        if (this._dbConfig.purgeOnStart && this._rootConfig.dev) {
            this._logger.warn("purgeOnStart is set in a dev environment: truncating all tables");
            await this.purgeDb();
        } else if (this._dbConfig.purgeOnStart) {
            this._logger.warn("purgeOnStart is ignored outside a dev environment");
        }
    }

    async purgeDb() {
        // run every statement on one connection so FOREIGN_KEY_CHECKS applies to the TRUNCATEs
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0;`);
            const tables: string[] = this.dataSource.entityMetadatas.map((metadata) => metadata.tableName);
            for (const table of tables) {
                await queryRunner.query(`TRUNCATE \`${table}\`;`);
            }
        } finally {
            await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1;`);
            await queryRunner.release();
        }
    }
}
