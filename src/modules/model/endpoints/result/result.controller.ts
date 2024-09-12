import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ResultService } from "./result.service";
import { ResultDTO } from "aethon-arion-pipeline";
import { ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";
import { ResultDTOCreate } from "../../dto/result.dto";

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
    index(@Param("simSetId") simSetId?: number, @Param("simConfigId") simConfigId?: number): Promise<ResultDTO[]> {
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
    view(@Param("id") id: string): Promise<ResultDTO> {
        return this.resultService.findOne(+id);
    }

    // endpoint that creates a new result
    @Post()
    @ApiBody({
        type: ResultDTOCreate,
        description: "The result to create"
    })
    create(@Body() createResultDto: ResultDTOCreate): Promise<ResultDTO> {
        return this.resultService.create(createResultDto as ResultDTO);
    }
}
