import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
    ConfiguratorParams,
    ConvergenceTest,
    OptimiserState,
    OrgConfig,
    Result,
    SimConfig,
    SimConfigParams,
    SimSet,
    StateSpacePoint
} from "aethon-arion-db";
import { DatabaseService } from "./services/database.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SimSet,
            SimConfig,
            SimConfigParams,
            OrgConfig,
            ConfiguratorParams,
            ConvergenceTest,
            Result,
            StateSpacePoint,
            OptimiserState
        ])
    ],
    providers: [DatabaseService],
    exports: [DatabaseService]
})
export class DatabaseModule {}
