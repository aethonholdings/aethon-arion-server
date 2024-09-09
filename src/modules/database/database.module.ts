import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SimConfig, SimSet, OrgConfig, Result, StateSpacePoint } from "aethon-arion-db";
import { DatabaseService } from "./database.service";

@Module({
    imports: [TypeOrmModule.forFeature([SimConfig, OrgConfig, Result, SimSet, StateSpacePoint])],
    providers: [DatabaseService],
    exports: [DatabaseService]
})
export class DatabaseModule {}
