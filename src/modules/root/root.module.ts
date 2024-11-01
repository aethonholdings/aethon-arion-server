import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseModule } from "../database/database.module";
import { ModelModule } from "../model/model.module";
import { DatabaseService } from "../database/database.service";
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
        ModelModule
    ]
})
export class RootModule {
    constructor(private databaseService: DatabaseService) {
        (env.database.synchronize)? this.databaseService.purgeDb() : null;
    }
}
