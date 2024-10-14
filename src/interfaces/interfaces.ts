
export interface ServerEnvironment {
    name: string;
    dev: boolean;
    listen: number;
    database: {
        type: string;
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        synchronize: boolean;
    };
    redis: {
        url: string,
        ttl: number
    };
    storeStateSpace: boolean;
    convergenceMargin: number;
    minRuns: number;
    randomStreamType: "static" | "random";
    simulationDays: number;
}
