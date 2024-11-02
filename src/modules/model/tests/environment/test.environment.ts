import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export function environment(): { database: TypeOrmModuleOptions } {
    return {
        database: {
            type: "mysql",
            host: "localhost",
            port: 3306,
            username: "root",
            password: "NuckyThompson123",
            database: "arion",
            synchronize: true,
            logging: false,
            entities: ["src/../node_modules/aethon-arion-db/**/*.entity{.ts,.js}"]
        }
    };
}
