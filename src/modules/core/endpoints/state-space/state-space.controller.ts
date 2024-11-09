import { Controller, Get, Param } from "@nestjs/common";
import { StateSpaceService } from "./state-space.service";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { StateSpacePointDTOGet } from "../../dto/state-space.dto";

@Controller("state-space")
@ApiTags("StateSpace")
export class StateSpaceController {
    constructor(private readonly stateSpaceService: StateSpaceService) {}

    // endpoint that fetches the state space points for a given result
    @Get(":id")
    @ApiParam({
        name: "id",
        type: "number",
        description: "The id of the result to which the state space belongs",
        example: 1
    })
    index(@Param("id") id: number): Promise<StateSpacePointDTOGet[]> {
        return this.stateSpaceService.find(+id) as Promise<StateSpacePointDTOGet[]>;
    }
}
