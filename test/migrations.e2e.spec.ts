import { DataSource } from "typeorm";
import { entities, migrations } from "aethon-arion-db";

/** The aethon-arion-db migrations build the schema the entities expect, and revert cleanly. */
describe("Database migrations (e2e)", () => {
    jest.setTimeout(120000);
    const database = (process.env.ARION_DB_NAME || "arion") + "_migrations";
    const connection = (name: string) =>
        new DataSource({
            type: "mysql",
            host: process.env.ARION_DB_HOST || "localhost",
            port: Number(process.env.ARION_DB_PORT || 3306),
            username: process.env.ARION_DB_USER || "root",
            password: process.env.ARION_DB_PASSWORD || "",
            database: name,
            entities: entities,
            migrations: migrations,
            synchronize: false
        });
    let admin: DataSource, ds: DataSource;

    beforeAll(async () => {
        admin = await connection("mysql").initialize(); // administrative connection to create the test database
        await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        await admin.query(`CREATE DATABASE \`${database}\``);
        ds = await connection(database).initialize();
    });

    afterAll(async () => {
        await ds?.destroy();
        await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        await admin.destroy();
    });

    it("builds the full schema on a fresh database", async () => {
        const applied = await ds.runMigrations();
        expect(applied.map((m) => m.name)).toEqual(migrations.map((m: any) => new m().name));
        const runner = ds.createQueryRunner();
        for (const metadata of ds.entityMetadatas) {
            const table = await runner.getTable(metadata.tableName);
            expect(table).toBeDefined();
            // every column the entities map exists
            for (const column of metadata.columns) expect(table!.findColumnByName(column.databaseName)).toBeDefined();
        }
        const performance = (await runner.getTable("result"))!.findColumnByName("performance")!;
        expect(performance.type).toBe("double");
        await runner.release();
        expect(await ds.showMigrations()).toBe(false); // nothing pending
    });

    it("reverts every migration and re-applies them", async () => {
        for (let i = 0; i < migrations.length; i++) await ds.undoLastMigration();
        expect((await ds.query("SHOW TABLES")).length).toBe(1); // only the migrations bookkeeping table
        const reapplied = await ds.runMigrations();
        expect(reapplied.length).toBe(migrations.length);
    });

    it("keeps data through the column conversions of the later migrations", async () => {
        // revert to the baseline, insert float data, then migrate forward again
        for (let i = 0; i < migrations.length - 1; i++) await ds.undoLastMigration();
        await ds.query("INSERT INTO sim_config_params (days, randomStreamType) VALUES (1, 'random')");
        await ds.query("INSERT INTO configurator_params (modelName, configuratorName, data, hash, multipleOrgConfigs) VALUES ('C1', 'C', '{}', 'h', 1)");
        await ds.query("INSERT INTO convergence_test (simConfigParamsId, configuratorParamsId, avgPerformance) VALUES (1, 1, 184.75)");
        await ds.runMigrations();
        const [row] = await ds.query("SELECT avgPerformance FROM convergence_test");
        expect(Number(row.avgPerformance)).toBeCloseTo(184.75, 4);
    });
});
