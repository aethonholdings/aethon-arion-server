import { DataSource } from "typeorm";
import { AuthorisedNode, entities, migrations, User } from "aethon-arion-db";
import { resetDatabase } from "../src/cli/reset";
import { AuthService } from "../src/modules/auth/auth.service";

/** db:reset: every table dropped, all migrations re-applied, optionally keeping operators and authorised nodes. */
describe("Database reset (e2e)", () => {
    jest.setTimeout(120000);
    const database = (process.env.ARION_DB_NAME || "arion") + "_reset";
    const options = (name: string) => ({
        type: "mysql" as const,
        host: process.env.ARION_DB_HOST || "localhost",
        port: Number(process.env.ARION_DB_PORT || 3306),
        username: process.env.ARION_DB_USER || "root",
        password: process.env.ARION_DB_PASSWORD || "",
        database: name
    });
    let admin: DataSource, ds: DataSource;

    const count = async (table: string) => Number((await ds.query(`SELECT COUNT(*) AS n FROM \`${table}\``))[0].n);
    const seed = async () => {
        const auth = new AuthService(ds);
        await auth.createUser("operator", "operator-password");
        await auth.authoriseNode("machine-1", "host-1", "operator", "operator-password");
        await ds.query("INSERT INTO sim_config_params (days, randomStreamType) VALUES (1, 'random')");
        await ds.query("CREATE TABLE `stray` (`id` int PRIMARY KEY)"); // a table no migration knows
    };

    beforeAll(async () => {
        admin = await new DataSource(options("mysql")).initialize();
        await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        await admin.query(`CREATE DATABASE \`${database}\``);
        ds = await new DataSource({ ...options(database), entities, migrations, synchronize: false }).initialize();
        await ds.runMigrations();
    });

    afterAll(async () => {
        await ds?.destroy();
        await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        await admin.destroy();
    });

    it("empties the database and leaves the schema at the current migration", async () => {
        await seed();
        const summary = await resetDatabase(ds);
        expect(summary.droppedTables).toContain("stray");
        expect(summary.appliedMigrations.length).toBe(migrations.length);
        expect(await ds.showMigrations()).toBe(false); // nothing pending
        const tables: string[] = (await ds.query("SHOW TABLES")).map((row: any) => Object.values(row)[0]);
        expect(tables).not.toContain("stray");
        for (const metadata of ds.entityMetadatas) {
            expect(tables).toContain(metadata.tableName);
            expect(await count(metadata.tableName)).toBe(0);
        }
    });

    it("keeps operator accounts and authorised nodes with --keep-auth", async () => {
        await seed();
        const node = await ds.getRepository(AuthorisedNode).findOneByOrFail({ id: "machine-1" });
        const summary = await resetDatabase(ds, { keepAuth: true });
        expect(summary.keptRows).toEqual({ user: 1, authorised_node: 1 });
        expect(await count("sim_config_params")).toBe(0);
        const user = await ds.getRepository(User).findOneByOrFail({ username: "operator" });
        const kept = await ds.getRepository(AuthorisedNode).findOneByOrFail({ id: "machine-1" });
        expect(kept.keyHash).toBe(node.keyHash); // the node's key still works
        expect(kept.authorisedByUserId).toBe(user.id);
        expect(new Date(kept.authorisedAt).getTime()).toBe(new Date(node.authorisedAt).getTime());
        // the password still verifies
        await expect(new AuthService(ds).authoriseNode("machine-2", null, "operator", "operator-password")).resolves.toBeDefined();
    });
});
