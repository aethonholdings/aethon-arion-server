import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { OrgConfigService } from "./org-config.service";
import { OrgConfigDTO } from "aethon-arion-pipeline";
import { ApiBody, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ConfiguratorParamsDTOCreate } from "../../dto/configurator-param.dto";

@Controller("org-config")
@ApiTags("OrgConfig")
export class OrgConfigController {
    constructor(private readonly orgConfigService: OrgConfigService) {}

    // endpoint that fetches an index of all OrgConfigs, optionally by model type
    @Get()
    @ApiQuery({
        name: "type",
        type: String,
        required: false,
        description: "Optional - filter OrgConfigurations by the type of model",
        example: "C1"
    })
    index(@Query("type") type: string): Promise<OrgConfigDTO[]> {
        return this.orgConfigService.findAll(type);
    }

    // endpoint that fetches a single OrgConfig by ID
    @Get(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The ID of the OrgConfig to be fetched",
        example: 1
    })
    view(@Param("id") id: number): Promise<OrgConfigDTO> {
        return this.orgConfigService.findOne(id);
    }

    // endpoint that creates a new OrgConfig based on the specified model Configurator input parameters
    @Post()
    @ApiBody({
        type: ConfiguratorParamsDTOCreate,
        description: "The parameters required to generate the OrgConfig, based on the selected model Configurator class",
    })
    create(@Body() configuratorParamsDTO: ConfiguratorParamsDTOCreate): Promise<OrgConfigDTO> {
        return this.orgConfigService.create(configuratorParamsDTO);
    }

    // endpoint that deletes an OrgConfig by ID
    @Delete(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The ID of the OrgConfig to be deleted",
        example: 1
    })
    delete(@Param("id") id: number): Promise<number> {
        return this.orgConfigService.delete(id);
    }
}
