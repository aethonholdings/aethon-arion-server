import { Controller, Get } from "@nestjs/common";
import { SeedsService } from "./seeds.service";
import { ApiTags } from "@nestjs/swagger";

@Controller("seeds")
@ApiTags("Seeds")
export class SeedsController {

    constructor(private seedsService: SeedsService) { }

    // endpoint that fetches the static random number generator seeds for the simulation
    @Get("seeds")
    seeds(): Promise<number[]> {
        return this.seedsService.seeds();
    }
}
