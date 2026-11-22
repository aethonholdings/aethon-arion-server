import { TypeOrmModuleOptions } from "@nestjs/typeorm";

/**
 * Database for the unit tests, from environment variables (no credentials in the repository):
 * ARION_DB_HOST (default localhost), ARION_DB_PORT (3306), ARION_DB_USER (root), ARION_DB_PASSWORD (empty),
 * ARION_DB_NAME (arion). The schema is synchronised from the entities.
 */
export function environment(): { database: TypeOrmModuleOptions } {
    return {
        database: {
            type: "mysql",
            host: process.env.ARION_DB_HOST || "localhost",
            port: Number(process.env.ARION_DB_PORT || 3306),
            username: process.env.ARION_DB_USER || "root",
            password: process.env.ARION_DB_PASSWORD || "",
            database: process.env.ARION_DB_NAME || "arion",
            synchronize: true,
            logging: false,
            entities: ["src/../node_modules/aethon-arion-db/dist/entities/**/*.entity{.js,.ts}"]
        }
    };
}
