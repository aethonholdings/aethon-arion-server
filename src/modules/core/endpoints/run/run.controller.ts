import { Body, Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { RunService } from "./run.service";

export class RunFailureDTO {
    @IsOptional()
    @IsString()
    error?: string;
}

@Controller("run")
@ApiTags("Run")
export class RunController {
    constructor(private readonly runService: RunService) {}

    // endpoint through which a node reports that a dispatched run failed
    @Post(":id/failure")
    @ApiParam({ name: "id", type: Number, description: "The run ticket (runId) returned by GET /sim-config/next", example: 1 })
    @ApiBody({ type: RunFailureDTO, examples: { example1: { value: { error: "Simulation horizon is not a whole number of ticks" } } } })
    @ApiOkResponse({ description: "The run id, the number of failed runs of its simConfig, and whether the simConfig failed" })
    fail(@Param("id", ParseIntPipe) id: number, @Body() body: RunFailureDTO) {
        return this.runService.fail(id, body?.error ?? "unknown error");
    }
}
