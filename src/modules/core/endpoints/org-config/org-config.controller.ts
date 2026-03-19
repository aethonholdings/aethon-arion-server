import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { OrgConfigService } from "./org-config.service";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ConfiguratorParamsDTOCreate } from "../../../../common/dto/configurator-param.dto";
import { OrgConfigDTOGet, OrgConfigSummaryDTO } from "../../../../common/dto/org-config.dto";

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
    @ApiOkResponse({
        type: OrgConfigDTOGet,
        isArray: true,
        description: "An array of OrgConfig objects mathing the specified type, if supplied"
    })
    index(@Query("type") type?: string): Promise<OrgConfigDTOGet[]> {
        return this.orgConfigService.findAll(type) as Promise<OrgConfigDTOGet[]>;
    }

    // endpoint that fetches all OrgConfigs that currently have at least one running SimConfig
    @Get("running")
    @ApiOkResponse({
        type: OrgConfigDTOGet,
        isArray: true,
        description: "All OrgConfig objects that have at least one SimConfig in the running state"
    })
    running(): Promise<OrgConfigDTOGet[]> {
        return this.orgConfigService.findRunning() as Promise<OrgConfigDTOGet[]>;
    }

    // endpoint that fetches all OrgConfigs with a given agent count, including simConfigs
    @Get("agent-count/:agentCount")
    @ApiParam({
        name: "agentCount",
        type: Number,
        description: "The agent count to filter OrgConfigs by",
        example: 13
    })
    @ApiOkResponse({
        type: OrgConfigDTOGet,
        isArray: true,
        description: "All OrgConfig objects with the specified agent count, including their SimConfigs"
    })
    byAgentCount(@Param("agentCount") agentCount: number): Promise<OrgConfigDTOGet[]> {
        return this.orgConfigService.findByAgentCount(agentCount) as Promise<OrgConfigDTOGet[]>;
    }

    // endpoint that returns a performance summary grouped by agent count
    @Get("summary")
    @ApiOkResponse({
        type: OrgConfigSummaryDTO,
        isArray: true,
        description: "Avg, best and stdDev performance grouped by agent count across all org configs"
    })
    summary(): Promise<OrgConfigSummaryDTO[]> {
        return this.orgConfigService.getSummary();
    }

    // endpoint that fetches a single OrgConfig by ID
    @Get(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The ID of the OrgConfig to be fetched",
        example: 1
    })
    @ApiOkResponse({
        type: OrgConfigDTOGet,
        description: "The OrgConfig object matching the specified ID"
    })
    view(@Param("id") id: number): Promise<OrgConfigDTOGet> {
        return this.orgConfigService.findOne(id) as Promise<OrgConfigDTOGet>;
    }

    // endpoint that creates a new OrgConfig based on the specified model Configurator input parameters
    @Post()
    @ApiBody({
        type: ConfiguratorParamsDTOCreate,
        description: "The parameters required to generate the OrgConfig, based on the selected model Configurator class"
    })
    @ApiOkResponse({
        type: OrgConfigDTOGet,
        description: "The newly created OrgConfig object"
    })
    create(@Body() configuratorParamsDTO: ConfiguratorParamsDTOCreate): Promise<OrgConfigDTOGet | OrgConfigDTOGet[]> {
        return this.orgConfigService.create(configuratorParamsDTO) as Promise<OrgConfigDTOGet | OrgConfigDTOGet[]>;
    }

    // endpoint that deletes an OrgConfig by ID
    @Delete(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The ID of the OrgConfig to be deleted",
        example: 1
    })
    @ApiOkResponse({
        type: Number,
        description: "The ID of the OrgConfig deleted",
        example: 1
    })
    delete(@Param("id") id: number): Promise<number> {
        return this.orgConfigService.delete(id);
    }
}
