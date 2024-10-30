import { Body, Controller, Delete, Get, Param, Post, Query, Res } from "@nestjs/common";
import { SimSetService } from "./sim-set.service";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { SimSetDTOCreate, SimSetDTOGet } from "../../../../../src/modules/model/dto/sim-set.dto";
import { ResultDTOGet } from "../../dto/result.dto";
import { SimConfigDTOGet } from "../../dto/sim-config.dto";
import { resultPaginationConfig, simConfigPaginationConfig } from "src/common/constants/pagination-config.constants";
import { GetPaginator, Paginated } from "aethon-nestjs-paginate";

@Controller("sim-set")
@ApiTags("SimSet")
export class SimSetController {
    constructor(private simSetService: SimSetService) {}

    // endpoint that fetches an index of all SimSets
    @Get()
    @ApiOkResponse({
        type: SimSetDTOGet,
        isArray: true,
        description: "An array of all simulation sets, subject to a query filter"
    })
    index(@Query() query?: any): Promise<SimSetDTOGet[]> {
        return this.simSetService.findAll(query) as Promise<SimSetDTOGet[]>;
    }

    // endpoint that fetches the details of a single SimSet based on ID
    @Get(":id")
    @ApiParam({ name: "id", type: Number, description: "The unique identifier of the simulation set", example: 1 })
    @ApiOkResponse({ type: SimSetDTOCreate, description: "The details of the simulation set" })
    view(@Param("id") id: number): Promise<SimSetDTOCreate> {
        return this.simSetService.findOne(id) as Promise<SimSetDTOCreate>;
    }

    // endpoint that generates a new SimSet
    @Post()
    @ApiBody({
        type: SimSetDTOCreate,
        examples: { example1: { value: { description: "Simulation set for testing the new model", type: "C1" } } }
    })
    @ApiOkResponse({ type: SimSetDTOGet, description: "The newly created simulation set" })
    create(@Body() simSet: SimSetDTOCreate): Promise<SimSetDTOGet> {
        return this.simSetService.create(simSet) as Promise<SimSetDTOGet>;
    }

    // endpoint that fetches an array of the Results of a SimSet
    // @Get(":id/result")
    // @ApiParam({
    //     name: "id",
    //     type: Number,
    //     description: "The unique identifier of the simulation set to fetch the results for",
    //     example: 1
    // })
    // @ApiOkResponse({
    //     type: ResultDTOGet,
    //     isArray: true,
    //     description: "An array of Result objects for the specified simulation set"
    // })
    async results(@GetPaginator(resultPaginationConfig) paginator): Promise<Paginated<ResultDTOGet>> {
        return this.simSetService.findResults(paginator);
    }

    // endpoint that fetches an array of SimConfigs for a SimSet
    @Get(":id/sim-config")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the simulation set to fetch the SimConfigs for",
        example: 1
    })
    // @ApiPaginationQuery(simConfigPaginationConfig)
    // @ApiOkPaginatedResponse(SimConfigDTOGet, simConfigPaginationConfig)
    simConfigs(@GetPaginator(simConfigPaginationConfig) paginator): Promise<Paginated<SimConfigDTOGet>> {
        return this.simSetService.findSimConfigs(paginator) as Promise<Paginated<SimConfigDTOGet>>;
    }

    // endpoint that deletes a SimSet
    @Delete(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the simulation set to be deleted",
        example: 1
    })
    @ApiOkResponse({ type: Number, description: "The ID of the simulation set deleted" })
    delete(@Param("id") id: number): Promise<number> {
        return this.simSetService.delete(id);
    }
}
