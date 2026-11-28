import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { FleetService } from "./fleet.service";
import { FleetDTO, FleetScaleDTO } from "./fleet.dto";

@Controller("fleet")
@ApiTags("Fleet")
export class FleetController {
    constructor(private readonly fleetService: FleetService) {}

    // endpoint that returns the node fleet's size and instances
    @Get()
    @ApiOkResponse({ type: FleetDTO, description: "The node fleet, or enabled: false when the server manages none" })
    get(): Promise<FleetDTO> {
        return this.fleetService.get();
    }

    // endpoint that sets the number of node instances
    @Put()
    @ApiBody({ type: FleetScaleDTO })
    @ApiOkResponse({ type: FleetDTO, description: "The node fleet after the change" })
    scale(@Body() body: FleetScaleDTO): Promise<FleetDTO> {
        return this.fleetService.scale(body.desired);
    }
}
