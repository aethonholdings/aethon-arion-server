import { C1 } from "aethon-arion-c1";
import { C1Model } from "aethon-arion-c1/dist/classes/pipeline/c1-model.class";
import { ServerEnvironment } from "src/common/types/server.types";

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
            simulationDays: 100,
            // this following casting is an inexplicable issue with Typescript compilation on inheritance with protected variables
            models: [C1 as C1Model]
        }
    }) as ServerEnvironment;
