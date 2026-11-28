import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { FleetService } from "./fleet.service";
import { FleetDTO, FleetScaleDTO } from "./fleet.dto";

@Controller("fleet")
@ApiTags("Fleet")
export class FleetController {
    constructor(private readonly fleetService: FleetService) {}

    // endpoint that returns the node fleet's size, instances and their phases
    @Get()
    @ApiOkResponse({ type: FleetDTO, description: "The node fleet, or enabled: false when the server manages none" })
    get(): Promise<FleetDTO> {
        return this.fleetService.get();
    }

    // endpoint that sets the number of node instances (POST: the API clients of the analyst and nodes support
    // GET, POST, PATCH and DELETE only)
    @Post("scale")
    @HttpCode(200)
    @ApiBody({ type: FleetScaleDTO })
    @ApiOkResponse({ type: FleetDTO, description: "The node fleet after the change" })
    scale(@Body() body: FleetScaleDTO): Promise<FleetDTO> {
        return this.fleetService.scale(body.desired);
    }
}
