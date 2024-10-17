import { Controller, Get, Post, Body, Param, Query, Res, StreamableFile } from "@nestjs/common";
import { ResultService } from "./result.service";
import { ResultDTO } from "aethon-arion-pipeline";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { ResultDTOCreate, ResultDTOGet } from "../../dto/result.dto";
import { Paginate, Paginated, PaginateQuery } from "nestjs-paginate";

@Controller("result")
@ApiTags("Result")
export class ResultController {
    constructor(private readonly resultService: ResultService) {}

    // endpoint that returns all results for a given simulation set and configuration
    @Get()
    @ApiParam({
        name: "simSetId",
        type: Number,
        description: "The unique identifier of the simulation set to retrieve results for",
        required: false,
        example: 1
    })
    @ApiParam({
        name: "simConfigId",
        type: Number,
        description: "The unique identifier of the simulation configuration to retrieve results for",
        required: false,
        example: 1
    })
    @ApiOkResponse({
        type: ResultDTOGet,
        isArray: true,
        description: "An array of all simulation results, subject to a query filter by SimConfigId or SimSetId"
    })
    async index(
        @Query("simSetId") simSetId?: number,
        @Query("simConfigId") simConfigId?: number
    ): Promise<ResultDTO[]> {
        return this.resultService.findAll({ simSetId: simSetId, simConfigId: simConfigId });
    }

    // endpoint that returns a single result by id
    @Get(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the result to retrieve",
        example: 1
    })
    @ApiOkResponse({
        type: ResultDTOGet,
        description: "The result object retrieved by ID"
    })
    view(@Param("id") id: string): Promise<ResultDTOGet> {
        return this.resultService.findOne(+id) as Promise<ResultDTOGet>;
    }

    // endpoint that creates a new result
    @Post()
    @ApiBody({
        type: ResultDTOCreate,
        description: "The result to create"
    })
    @ApiOkResponse({
        type: ResultDTOGet,
        description: "The result object created"
    })
    create(@Body() createResultDto: ResultDTOCreate): Promise<ResultDTO> {
        return this.resultService.create(createResultDto) as Promise<ResultDTO>;
    }
}
