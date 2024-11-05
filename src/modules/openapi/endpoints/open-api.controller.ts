import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags, OpenAPIObject } from '@nestjs/swagger';
import { OpenAPIService } from "./open-api.service";

@Controller("open-api")
@ApiTags("OpenAPI")
export class OpenAPIController {
    constructor(private openApiService: OpenAPIService) {}

    @Get()
    @ApiOkResponse({ 
        type: Object,
        isArray: false,
        description: "The OpenAPI specification of the Arion API as an @nestjs/swagger OpenAPIObject", 
    })
    getSpec(): Promise<OpenAPIObject> {
        return this.openApiService.getSpec();
    }
}
