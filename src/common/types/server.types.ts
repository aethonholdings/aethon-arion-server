import { ConfiguratorParamData, Model, OptimiserData, OptimiserParameters } from "aethon-arion-pipeline";

export type KeyBuilder = any[];

export type RequestWithMeta = Request & { meta: { id: string; startTimeStamp: number } };

export type ServerEnvironment = {
    root: {
        name: string;
        dev: boolean;
        listen: number;
    };
    database: {
        type: string;
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        synchronize: boolean;
        purgeOnStart?: boolean; // dev only: truncate all tables on startup (never implied by synchronize)
        migrationsRun?: boolean; // run pending aethon-arion-db migrations on startup
        logging?: boolean;
        entities?: any;
    };
    redis: {
        url: string;
        ttl: number;
    };
    options: ArionOptions;
    auth?: {
        nodes?: "required" | "off"; // "off" admits nodes without a key, for switching existing nodes over (default "required")
        loginAttemptsPerMinute?: number; // POST /auth/node attempts per client address per minute (default 5)
    };
};

export type ArionOptions = {
    storeStateSpace: boolean;
    convergenceMargin: number; // runs per simConfig: target standard error of the mean as a fraction of |mean| (e.g. 0.01)
    orgConfigConvergenceMargin?: number; // org configs per convergence test: same, across org config means (default 0.05)
    convergenceAbsoluteError?: number; // absolute standard error floor, for means near 0 (default 0)
    minOrgConfigs: number;
    maxOrgConfigs?: number; // cap on org configs per convergence test (default 200)
    minSimRuns: number;
    maxSimRuns?: number; // cap on runs per simConfig (default 1000)
    maxRunFailures?: number; // failed runs after which a simConfig is marked failed and no longer dispatched (default 3)
    randomStreamType: "static" | "random";
    simulationDays: number;
    models: Model[];
};
