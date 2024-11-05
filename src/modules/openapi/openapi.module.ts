import { Module } from "@nestjs/common";
import { OpenAPIController } from "./endpoints/open-api.controller";
import { OpenAPIService } from "./endpoints/open-api.service";

@Module({
    controllers: [OpenAPIController],
    providers: [OpenAPIService]
})
export class OpenAPIModule {}
