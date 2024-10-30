import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ResultService } from "./result.service";
import { ResultDTO } from "aethon-arion-pipeline";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ResultDTOCreate, ResultDTOGet } from "../../dto/result.dto";
import { Paginated, GetPaginator, PaginateQuery, Paginator } from "src/common/utils/paginate/paginate.index";
import { resultPaginationConfig } from "src/common/constants/pagination-config.constants";
import { Result } from "aethon-arion-db";

@Controller("result")
@ApiTags("Result")
export class ResultController {
    constructor(private readonly resultService: ResultService) {}

    // endpoint that returns all results for a given simulation set and configuration
    @Get()
    @ApiQuery({type: PaginateQuery})
    @ApiOkResponse({
        description: "All result objects retrieved based on the search query given, paginated",
        type: Paginated<ResultDTOGet>
    })
    @ApiOkResponse({
        description: "All result objects retrieved based on the search query given, paginated",
        type: Paginated<ResultDTOGet>
    })
    async index(
        @GetPaginator<Result>(resultPaginationConfig) paginator: Paginator<ResultDTO>,
    ): Promise<Paginated<ResultDTOGet>> {
        return this.resultService.findAll(paginator) as Promise<Paginated<ResultDTOGet>>;
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
