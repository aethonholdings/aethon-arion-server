import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { SimConfigService } from "./sim-config.service";
import { ResultDTO, SimConfigDTO } from "aethon-arion-pipeline";
import { Paginate, Paginated, PaginateQuery } from "nestjs-paginate";
import { ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";
import { SimConfigDTOCreate } from "../../dto/sim-config.dto";

@Controller("sim-config")
@ApiTags("SimConfig")
export class SimConfigController {
    constructor(private readonly simConfigService: SimConfigService) {}

    @Get()
    index(
        @Query("simSetId") simSetId: number,
        @Paginate() paginateQuery: PaginateQuery
    ): Promise<Paginated<SimConfigDTO>> {
        return this.simConfigService.findAll(simSetId, paginateQuery);
    }

    // get the next simConfig scheduled for modelling
    @Get("next")
    next(@Query() query: { nodeId: string }): Promise<SimConfigDTO> {
        return this.simConfigService.next(query.nodeId);
    }

    // get the random number generator seeds
    @Get("seeds")
    seeds(): Promise<number[]> {
        return this.simConfigService.seeds();
    }

    @Get(":id")
    view(@Param("id") id: number): Promise<SimConfigDTO> {
        return this.simConfigService.findOne(id);
    }

    @Get(":id/result")
    results(@Param("id") id: number): Promise<ResultDTO[]> {
        return this.simConfigService.findResults(id);
    }

    // endpoint that generates a SimConfig for a SimSet
    @Post()
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the SimSet to generate a SimConfig for",
        example: 1
    })
    @ApiBody({
        type: SimConfigDTOCreate,
        description: "The parameters of the simulation to be created under the simulation set"
    })
    generateSimConfig(
        @Param("id") simSetId: number,
        @Body() SimConfigDTOCreate: SimConfigDTOCreate
    ): Promise<SimConfigDTO> | null {
        return this.simConfigService.create(SimConfigDTOCreate);
    }
}
