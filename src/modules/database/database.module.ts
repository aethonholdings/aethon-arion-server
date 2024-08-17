import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseService } from "./database.service";

import { SimConfig, SimSet, OrgConfig, Result, StateSpacePoint } from "aethon-arion-db";

@Module({
    imports: [TypeOrmModule.forFeature([
        SimConfig, 
        OrgConfig, 
        Result, 
        SimSet,
        StateSpacePoint
    ])],
    providers: [DatabaseService],
    exports: [DatabaseService]
})
export class DatabaseModule {}
