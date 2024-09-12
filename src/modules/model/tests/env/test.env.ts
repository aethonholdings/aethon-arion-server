import env from '../../../../../env/environment.dev';
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

const databaseConfig: TypeOrmModuleOptions = env().database as TypeOrmModuleOptions;

export function environment(): { database: TypeOrmModuleOptions } {
    return {
        database: databaseConfig
    };
}
