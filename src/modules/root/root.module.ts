import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseModule } from "../database/database.module";
import { ModelModule } from "../model/model.module";
import { OpenAPIModule } from '../openapi/openapi.module';
import environment from "../../../env/environment";

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
        DatabaseModule,
        ModelModule,
        OpenAPIModule
    ]
})
export class RootModule {}
