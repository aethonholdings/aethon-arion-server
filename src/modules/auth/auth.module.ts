import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthorisedNode, User } from "aethon-arion-db";
import environment from "../../../env/environment";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { NodeAuthGuard } from "./node-auth.guard";

@Module({
    imports: [
        TypeOrmModule.forFeature([User, AuthorisedNode]),
        // login attempts per client address per minute (POST /auth/node only)
        ThrottlerModule.forRoot([{ ttl: 60000, limit: environment().auth?.loginAttemptsPerMinute ?? 5 }])
    ],
    controllers: [AuthController],
    providers: [AuthService, NodeAuthGuard],
    exports: [AuthService, NodeAuthGuard]
})
export class AuthModule {}
