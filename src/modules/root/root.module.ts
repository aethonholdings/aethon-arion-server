import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseModule } from "../database/database.module";
import { CoreModule } from "../core/core.module";
import { OpenAPIModule } from "../openapi/openapi.module";
import environment from "../../../env/environment";
import { ScheduleModule } from "@nestjs/schedule";
import { migrations } from "aethon-arion-db";

const env = environment();

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [environment],
            isGlobal: true
        }),
        TypeOrmModule.forRoot({
            ...env.database,
            type: env.database.type as any,
            autoLoadEntities: true,
            // schema synchronisation is done by DatabaseService, which refuses it where it would destroy data (MariaDB
            // stores JSON columns as LONGTEXT, so TypeORM drops and re-creates them on every synchronisation)
            synchronize: false,
            migrations: migrations,
            migrationsRun: env.database.migrationsRun ?? false
        }),
        ScheduleModule.forRoot(),
        DatabaseModule,
        CoreModule,
        OpenAPIModule
    ]
})
export class RootModule {}
