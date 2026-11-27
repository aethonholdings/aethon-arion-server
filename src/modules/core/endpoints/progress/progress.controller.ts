import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ProgressService } from "./progress.service";
import { ProgressDTO } from "./progress.dto";

@Controller("progress")
@ApiTags("Progress")
export class ProgressController {
    constructor(private readonly progressService: ProgressService) {}

    // endpoint that returns a snapshot of the work in progress, for monitoring
    @Get()
    @ApiOkResponse({ type: ProgressDTO, description: "Nodes, throughput and SimSet convergence progress" })
    index(): Promise<ProgressDTO> {
        return this.progressService.get();
    }
}
