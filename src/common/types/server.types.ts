import { Model } from "aethon-arion-pipeline";

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
    minRuns: number;
    randomStreamType: "static" | "random";
    simulationDays: number;
    models: Model[];
};
