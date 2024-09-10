import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { SimSetService } from "./sim-set.service";
import { ConfiguratorParamsDTO, SimConfigDTO, SimSetDTO } from "aethon-arion-pipeline";
import { Paginate } from "nestjs-paginate";
import { ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";
import { SimSetDTOValidatorCreate } from "src/modules/dtos/sim-set.dto";

@Controller("sim-set")
@ApiTags("SimSet")
export class SimSetController {
    constructor(private simSetService: SimSetService) {}

    @Get()
    index(@Query() query: any) {
        return this.simSetService.findAll(query);
    }

    @Get(":id")
    @ApiParam({ name: "id", type: Number, description: "The unique identifier of the simulation set", example: 1 })
    view(@Param("id") id: number) {
        return this.simSetService.findOne(id);
    }

    @Post()
    @ApiBody({
        type: SimSetDTOValidatorCreate,
        examples: { example1: { value: { description: "Simulation set for testing the new model", type: "C1" } } }
    })
    create(@Body() simSet: SimSetDTOValidatorCreate) {
        return this.simSetService.create(simSet as SimSetDTO);
    }

    @Post(":id/generate")
    generate(
        @Param("id") simSetId: number,
        @Body() configuratorParamDTO: ConfiguratorParamsDTO
    ): Promise<SimConfigDTO> {
        return this.simSetService.generateSimConfig(simSetId, configuratorParamDTO);
    }

    @Get(":id/result")
    results(@Param("id") simSetId: number) {
        return this.simSetService.findResults(simSetId);
    }

    @Get(":id/sim-config")
    simConfigs(@Param("id") simSetId: number, @Paginate() paginateQuery) {
        return this.simSetService.findSimConfigs(simSetId, paginateQuery);
    }

    @Delete(":id")
    delete(@Param("id") id: number) {
        return this.simSetService.delete(id);
    }
}
