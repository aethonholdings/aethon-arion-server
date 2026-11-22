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

    /**
     * Schema synchronisation (database.synchronize). On MariaDB, TypeORM sees every JSON column (stored as LONGTEXT)
     * as changed and drops and re-creates it, erasing the JSON data of every row (optimiser data, tensors, results)
     * on each start. There it is only done on an empty database; otherwise use the migrations (migrationsRun).
     */
    async onModuleInit() {
        if (!this._dbConfig.synchronize) return;
        const [version] = await this.dataSource.query("SELECT VERSION() AS version");
        const mariaDb: boolean = String(version?.version ?? "").toLowerCase().includes("mariadb");
        if (mariaDb) {
            const tables: string[] = this.dataSource.entityMetadatas.map((metadata) => metadata.tableName);
            const [rows] = await this.dataSource.query(
                "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?)",
                [tables]
            );
            if (Number(rows?.n ?? 0) > 0) {
                this._logger.error(
                    "database.synchronize is ignored on this MariaDB database: synchronising would erase the data of all " +
                        "JSON columns. Use the aethon-arion-db migrations (database.migrationsRun) instead."
                );
                return;
            }
        }
        await this.dataSource.synchronize();
    }

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
