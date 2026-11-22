import { DataSource } from "typeorm";

/** Jest global setup of the e2e suites: recreates the empty e2e database (see test/e2e-env.ts). */
export default async function (): Promise<void> {
    const database = (process.env.ARION_DB_NAME || "arion").replace(/_e2e$/, "") + "_e2e";
    const admin = await new DataSource({
        type: "mysql",
        host: process.env.ARION_DB_HOST || "localhost",
        port: Number(process.env.ARION_DB_PORT || 3306),
        username: process.env.ARION_DB_USER || "root",
        password: process.env.ARION_DB_PASSWORD || "",
        database: "mysql"
    }).initialize();
    try {
        await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        await admin.query(`CREATE DATABASE \`${database}\``);
    } finally {
        await admin.destroy();
    }
}
