import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import environment from "../../../env/environment";

import { DatabaseModule } from "../database/database.module";
import { ModelModule } from "../model/model.module";

const env = environment();

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [environment],
            isGlobal: true
        }),
        TypeOrmModule.forRoot({
            type: env.database.type as any,
            host: env.database.host,
            port: env.database.port,
            username: env.database.username,
            password: env.database.password,
            database: env.database.database,
            synchronize: env.database.synchronize,
            autoLoadEntities: true
        }),
        DatabaseModule,
        ModelModule
    ]
})
export class RootModule {}
