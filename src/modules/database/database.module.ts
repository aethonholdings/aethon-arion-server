import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SimConfig, SimSet, OrgConfig, Result, StateSpacePoint } from "aethon-arion-db";

@Module({
    imports: [TypeOrmModule.forFeature([
        SimConfig, 
        OrgConfig, 
        Result, 
        SimSet,
        StateSpacePoint
    ])],
    providers: [],
    exports: []
})
export class DatabaseModule {}
