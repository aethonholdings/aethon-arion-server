import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import environment from "../../../env/environment";

import { DatabaseModule } from "../database/database.module";
import { DatabaseService } from "../database/database.service";
import { ModelModule } from "../model/model.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [environment],
            isGlobal: true
        }),
        TypeOrmModule.forRoot({
            type: environment().database.type as any,
            host: environment().database.host,
            port: environment().database.port,
            username: environment().database.username,
            password: environment().database.password,
            database: environment().database.database,
            synchronize: environment().database.synchronize,
            autoLoadEntities: true
        }),
        DatabaseModule,
        ModelModule
    ]
})
export class RootModule {
    constructor(private databaseService: DatabaseService) {
        if (environment().database.seed) {
            this.databaseService.seedDb();
        }
    }
}
