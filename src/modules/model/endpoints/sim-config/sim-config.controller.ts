import { Controller, Get, Param, Query } from "@nestjs/common";
import { SimConfigService } from "./sim-config.service";
import { ResultDTO, SimConfigDTO } from "aethon-arion-pipeline";
import { Paginate, Paginated, PaginateQuery } from "nestjs-paginate";
import { ApiTags } from "@nestjs/swagger";

@Controller("sim-config")
@ApiTags('SimConfig')
export class SimConfigController {
    constructor(private readonly configService: SimConfigService) {}

    @Get()
    index(@Query("simSetId") simSetId: number, @Paginate() paginateQuery: PaginateQuery): Promise<Paginated<SimConfigDTO>> {
        return this.configService.findAll(simSetId, paginateQuery);
    }

    // get the next simConfig scheduled for modelling
    @Get("next")
    next(@Query() query: { nodeId: string }): Promise<SimConfigDTO> {
        return this.configService.next(query.nodeId);
    }

    // get the random number generator seeds
    @Get("seeds")
    seeds(): Promise<number[]> {
        return this.configService.seeds();
    }

    @Get(":id")
    view(@Param("id") id: number): Promise<SimConfigDTO> {
        return this.configService.findOne(id);
    }

    @Get(":id/result")
    results(@Param("id") id: number): Promise<ResultDTO[]> {
        return this.configService.findResults(id);
    }

}
