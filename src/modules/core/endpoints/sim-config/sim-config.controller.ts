import { Body, Controller, Delete, Get, Param, Post, Query, Req } from "@nestjs/common";
import { SimConfigService } from "./sim-config.service";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { SimConfigDTOCreate, SimConfigDTOGet } from "../../../../common/dto/sim-config.dto";
import { ResultDTOGet } from "../../../../common/dto/result.dto";
import { GetPaginator, Paginated, PaginateQuery, Paginator } from "aethon-nestjs-paginate";
import { simConfigPaginationConfig } from "src/modules/core/constants/pagination-config.constants";

@Controller("sim-config")
@ApiTags("SimConfig")
export class SimConfigController {
    constructor(private readonly simConfigService: SimConfigService) {}

    // endpoint that fetches an index of all SimConfigs, optionally by simulation set ID
    @Get()
    @ApiQuery({
        name: "paginateQuery",
        type: PaginateQuery,
        required: false,
        description: "The pagination query setting out the Where and OrderBy clauses and pagination schema requested"
    })
    @ApiOkResponse({
        type: Paginated<SimConfigDTOGet>,
        description: "A Paginated<SimConfig> object"
    })
    index(@GetPaginator(simConfigPaginationConfig) paginator: Paginator): Promise<Paginated<SimConfigDTOGet>> {
        return this.simConfigService.findAll(paginator) as Promise<Paginated<SimConfigDTOGet>>;
    }

    // endpoint that fetches the next SimConfig to be run
    @Get("next")
    @ApiQuery({
        name: "nodeId",
        type: String,
        description: "The identifier of the node requesting the next SimConfig",
        example: "e221a974cfc069b0b8ace096c1153ca3eb4707344ae50fe2f4529003fab2c4e2:649566"
    })
    @ApiOkResponse({
        type: SimConfigDTOGet,
        description: "The next simconfig to be executed by a node"
    })
    next(@Query("nodeId") nodeId: string): Promise<SimConfigDTOGet> {
        return this.simConfigService.next(nodeId) as Promise<SimConfigDTOGet>;
    }

    // endpoint that fetches a single SimConfig by ID
    @Get(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the SimConfig to be fetched",
        example: 1
    })
    @ApiOkResponse({
        type: SimConfigDTOGet,
        description: "The SimConfig object fetched by ID"
    })
    view(@Param("id") id: number): Promise<SimConfigDTOGet> {
        return this.simConfigService.findOne(id) as Promise<SimConfigDTOGet>;
    }

    // endpoint that fetches the results of a SimConfig by ID
    @Get(":id/result")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the SimConfig to fetch the results for",
        example: 1
    })
    @ApiOkResponse({
        type: ResultDTOGet,
        isArray: true,
        description: "An array of Result objects for the specified simulation configuration"
    })
    results(@Param("id") id: number): Promise<ResultDTOGet[]> {
        return this.simConfigService.findResults(id) as Promise<ResultDTOGet[]>;
    }

    // endpoint that deletes a SimConfig by ID
    @Delete(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The ID of the SimConfig to be deleted",
        example: 1
    })
    @ApiOkResponse({
        type: Number,
        description: "The ID of the SimConfig deleted"
    })
    delete(@Param("id") id: number): Promise<number> {
        return this.simConfigService.delete(id);
    }
}
