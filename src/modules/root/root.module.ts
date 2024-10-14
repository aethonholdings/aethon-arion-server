import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager"; 
import { DatabaseModule } from "../database/database.module";
import { ModelModule } from "../model/model.module";
import { DatabaseService } from "../database/database.service";
import { RedisClientOptions } from "redis";
import environment from "../../../env/environment";

const env = environment();
const redisStore = require('cache-manager-redis-store').redisStore;

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
        CacheModule.register<RedisClientOptions>({
            store: redisStore,
            url: environment().redis.url,
            isGlobal: true
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
