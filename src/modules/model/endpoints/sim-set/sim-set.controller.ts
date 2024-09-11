import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { SimSetService } from "./sim-set.service";
import { ResultDTO, SimConfigDTO, SimSetDTO } from "aethon-arion-pipeline";
import { Paginate, Paginated } from "nestjs-paginate";
import { ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";
import { SimSetDTOCreate } from "../../../../../src/modules/model/dto/sim-set.dto";

@Controller("sim-set")
@ApiTags("SimSet")
export class SimSetController {
    constructor(private simSetService: SimSetService) {}

    // endpoint that fetches an index of all SimSets
    @Get()
    index(@Query() query?: any): Promise<SimSetDTO[]> {
        return this.simSetService.findAll(query);
    }

    // endpoint that fetches the details of a single SimSet based on ID
    @Get(":id")
    @ApiParam({ name: "id", type: Number, description: "The unique identifier of the simulation set", example: 1 })
    view(@Param("id") id: number): Promise<SimSetDTO> {
        return this.simSetService.findOne(id);
    }

    // endpoint that generates a new SimSet
    @Post()
    @ApiBody({
        type: SimSetDTOCreate,
        examples: { example1: { value: { description: "Simulation set for testing the new model", type: "C1" } } }
    })
    create(@Body() simSet: SimSetDTOCreate): Promise<SimSetDTO> {
        return this.simSetService.create(simSet as SimSetDTO);
    }

    // endpoint that fetches an array of the Results of a SimSet
    @Get(":id/result")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the simulation set to fetch the results for",
        example: 1
    })
    results(@Param("id") simSetId: number): Promise<ResultDTO[]> {
        return this.simSetService.findResults(simSetId);
    }

    // endpoint that fetches an array of SimConfigs for a SimSet
    @Get(":id/sim-config")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the simulation set to fetch the SimConfigs for",
        example: 1
    })
    simConfigs(@Param("id") simSetId: number, @Paginate() paginateQuery): Promise<Paginated<SimConfigDTO>> {
        return this.simSetService.findSimConfigs(simSetId, paginateQuery);
    }

    // endpoint that deletes a SimSet
    @Delete(":id")
    @ApiParam({
        name: "id",
        type: Number,
        description: "The unique identifier of the simulation set to be deleted",
        example: 1
    })
    delete(@Param("id") id: number): Promise<number> {
        return this.simSetService.delete(id);
    }
}
