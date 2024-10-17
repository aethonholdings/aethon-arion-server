import { ServerEnvironment } from "src/common/interfaces/server-environment.interface";

export default () =>
    ({
        root: { name: "dev", dev: true, listen: 3000 },
        database: {
            type: "mysql",
            host: "DBhostIP",
            port: 3306,
            username: "arion",
            password: "*******",
            database: "arion",
            synchronize: false
        },
        redis: {
            url: "redis://***.***.***.***:6379",
            ttl: 60
        },
        options: {
            storeStateSpace: true,
            convergenceMargin: 0.001,
            minRuns: 10,
            randomStreamType: "random",
            simulationDays: 100
        }
    }) as ServerEnvironment;
