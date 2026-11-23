import { C1 } from "aethon-arion-c1";
import { Model } from "aethon-arion-pipeline";
import { ServerEnvironment } from "src/common/types/server.types";

/**
 * Test and CI environment: copy to env/environment.ts (npm run test:setup). Database from environment variables
 * (ARION_DB_HOST, ARION_DB_PORT, ARION_DB_USER, ARION_DB_PASSWORD, ARION_DB_NAME); small sample sizes and a
 * 1-day horizon keep the end-to-end tests fast. The e2e assertions depend on these options.
 */
export default () =>
    ({
        root: { name: "ci", dev: false, listen: 3000 },
        database: {
            type: "mysql",
            host: process.env.ARION_DB_HOST || "localhost",
            port: Number(process.env.ARION_DB_PORT || 3306),
            username: process.env.ARION_DB_USER || "root",
            password: process.env.ARION_DB_PASSWORD || "",
            database: process.env.ARION_DB_NAME || "arion",
            synchronize: true,
            purgeOnStart: false,
            migrationsRun: false
        },
        redis: { url: "redis://localhost:6379", ttl: 60 },
        options: {
            storeStateSpace: false,
            convergenceMargin: 0.25,
            orgConfigConvergenceMargin: 0.25,
            convergenceAbsoluteError: 0,
            minOrgConfigs: 3,
            maxOrgConfigs: 200,
            minSimRuns: 3,
            maxSimRuns: 1000,
            maxRunFailures: 3,
            randomStreamType: "random",
            simulationDays: 1,
            models: [C1 as unknown as Model]
        },
        auth: { nodes: "required", loginAttemptsPerMinute: 20 }
    }) as ServerEnvironment;
