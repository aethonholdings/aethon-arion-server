import { Controller, Get } from "@nestjs/common";
import { SeedsService } from "./seeds.service";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@Controller("seeds")
@ApiTags("Seeds")
export class SeedsController {
    constructor(private seedsService: SeedsService) {}

    // endpoint that fetches the static random number generator seeds for the simulation
    @Get()
    @ApiOkResponse({
        type: [Number],
        isArray: true,
        description: "The static random number generator seeds for the simulation",
        example: [21400376, 74768599, 76833774, 32500791, 43966213, 26668269, 64358422]
    })
    index(): Promise<number[]> {
        return this.seedsService.seeds();
    }
}
