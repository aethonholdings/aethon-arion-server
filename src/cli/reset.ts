import { DataSource } from "typeorm";

/** Tables kept by `db:reset --keep-auth`: operator accounts and authorised nodes. */
export const AUTH_TABLES = ["user", "authorised_node"];

export type ResetSummary = { droppedTables: string[]; appliedMigrations: string[]; keptRows: { [table: string]: number } };

/**
 * Re-initialises the database: drops every table in it (data, schema and the migrations record), then applies all
 * aethon-arion-db migrations, leaving an empty database at the current schema version. With `keepAuth`, the rows of
 * the user and authorised_node tables are restored afterwards, so operators and nodes stay authorised.
 *
 * The data source must be configured with the migrations and must not synchronise.
 */
export async function resetDatabase(dataSource: DataSource, options: { keepAuth?: boolean } = {}): Promise<ResetSummary> {
    const database: string = dataSource.options.database as string;
    const tables: string[] = (
        await dataSource.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'", [database])
    ).map((row: any) => row.name);

    // the authorisation rows to restore, read before anything is dropped
    const kept: { [table: string]: any[] } = {};
    if (options.keepAuth) {
        for (const table of AUTH_TABLES) {
            if (tables.includes(table)) kept[table] = await dataSource.query(`SELECT * FROM \`${table}\``);
        }
    }

    // one connection, so that FOREIGN_KEY_CHECKS applies to every DROP
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
        await runner.query("SET FOREIGN_KEY_CHECKS = 0");
        for (const table of tables) await runner.query(`DROP TABLE \`${table}\``);
    } finally {
        await runner.query("SET FOREIGN_KEY_CHECKS = 1");
        await runner.release();
    }

    const applied = await dataSource.runMigrations({ transaction: "each" });

    const keptRows: { [table: string]: number } = {};
    // users first: authorised nodes refer to them
    for (const table of AUTH_TABLES) {
        const rows = kept[table] ?? [];
        if (rows.length > 0) await dataSource.createQueryBuilder().insert().into(table).values(rows).execute();
        if (options.keepAuth) keptRows[table] = rows.length;
    }
    return { droppedTables: tables, appliedMigrations: applied.map((migration) => migration.name), keptRows };
}
