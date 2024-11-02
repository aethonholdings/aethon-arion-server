export interface ServerEnvironment {
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
}

export interface ArionOptions {
    storeStateSpace: boolean;
    convergenceMargin: number;
    minRuns: number;
    randomStreamType: "static" | "random";
    simulationDays: number;
}
