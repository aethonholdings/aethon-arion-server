import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfiguratorParamsDTO, OptimiserData, OptimiserStateDTO } from "aethon-arion-pipeline";
import { OptimiserStateService } from "./optimiser-state.service";

@Controller("optimiser-state")
@ApiTags("OptimiserState")
export class OptimiserStateController {
    constructor(private optimiserStateService: OptimiserStateService) {}

    @Get(":id")
    view(@Param("id") id: number): Promise<OptimiserStateDTO<OptimiserData>> {
        return this.optimiserStateService.findOne(id);
    }
}
