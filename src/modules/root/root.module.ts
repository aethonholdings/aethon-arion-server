import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseModule } from "../database/database.module";
import { CoreModule } from "../core/core.module";
import { OpenAPIModule } from "../openapi/openapi.module";
import environment from "../../../env/environment";
import { ScheduleModule } from "@nestjs/schedule";

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
            autoLoadEntities: true
        }),
        ScheduleModule.forRoot(),
        DatabaseModule,
        CoreModule,
        OpenAPIModule
    ]
})
export class RootModule {}
