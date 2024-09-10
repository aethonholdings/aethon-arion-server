import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { SimConfigService } from "./sim-config.service";
import { ResultDTO, SimConfigDTO } from "aethon-arion-pipeline";
import { Paginate, Paginated, PaginateQuery } from "nestjs-paginate";
import { ApiBody, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { SimConfigDTOCreate } from "../../dto/sim-config.dto";

@Controller("sim-config")
@ApiTags("SimConfig")
export class SimConfigController {
    constructor(private readonly simConfigService: SimConfigService) { }

    // endpoint that fetches an index of all SimConfigs, optionally by simulation set ID
    @Get()
    @ApiQuery({
        name: "simSetId",
        type: Number,
        required: false,
        description: "The unique identifier of the simulation set to filter the SimConfigs by",
        example: 1
    })
    @ApiQuery({
        name: "paginateQuery",
        type: Object,
        description: "The pagination query to be applied to the results"
    })
    index(
        @Query("simSetId") simSetId: number,
        @Paginate() paginateQuery: PaginateQuery
    ): Promise<Paginated<SimConfigDTO>> {
        return this.simConfigService.findAll(simSetId, paginateQuery);
    }

    // endpoint that fetches the next SimConfig to be run
    @Get("next")
    @ApiQuery({
        name: "nodeId",
        type: String,
        description: "The identifier of the node requesting the next SimConfig",
        example: "e221a974cfc069b0b8ace096c1153ca3eb4707344ae50fe2f4529003fab2c4e2:649566"
    })
    next(@Query("nodeId") nodeId: string): Promise<SimConfigDTO> {
        return this.simConfigService.next(nodeId);
    }

    // endpoint that fetches the static random number generator seeds for the simulation
    @Get("seeds")
    seeds(): Promise<number[]> {
        return this.simConfigService.seeds();
    }

    // endpoint that fetches a single SimConfig by ID
    @Get(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the SimConfig to be fetched",
        example: 1
    })
    view(@Param("id") id: number): Promise<SimConfigDTO> {
        return this.simConfigService.findOne(id);
    }

    // endpoint that fetches the results of a SimConfig by ID
    @Get(":id/result")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the SimConfig to fetch the results for",
        example: 1
    })
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

    // endpoint that deletes a SimConfig by ID
    @Delete(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The ID of the SimConfig to be deleted",
        example: 1
    })
    delete(@Param("id") id: number): Promise<number> {
        return this.simConfigService.delete(id);
    }
}
