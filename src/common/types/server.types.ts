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
};

export type ArionOptions = {
    storeStateSpace: boolean;
    convergenceMargin: number;
    minOrgConfigs: number;
    minSimRuns: number;
    randomStreamType: "static" | "random";
    simulationDays: number;
    models: Model[];
};
