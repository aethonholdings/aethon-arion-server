import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { SimConfigDTO, SimSetDTO, StateType } from "aethon-arion-pipeline";

export class SimSetDTOGet implements SimSetDTO {
    @IsString()
    @ApiProperty({
        name: "id",
        type: Number,
        description: "The unique identifier of the simulation set",
        example: "1"
    })
    id: number;

    @IsString()
    @ApiProperty({
        name: "description",
        type: "string",
        description: "Text description of the simulation set",
        example: "Here is a test description"
    })
    description: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        name: "type",
        type: String,
        description: "The signature of the organisation model for which the simulation set is run",
        example: "C1"
    })
    type: string;

    @IsString()
    @ApiProperty({
        name: "simConfigs",
        isArray: true,
        type: Object,
        description: "The simulation configurations for the simulation set"
    })
    simConfigs: SimConfigDTO[];

    @IsString()
    @ApiProperty({
        name: "state",
        type: String,
        description: "The current state of the simulation set",
        example: "running"
    })
    state: StateType;

    @IsNumber()
    @ApiProperty({
        name: "runCount",
        type: Number,
        description: "The number of simConfigs in the simulation set",
        example: 10
    })
    simConfigCount: number;

    @IsNumber()
    @ApiProperty({
        name: "completedRunCount",
        type: Number,
        description: "The number of runs completed in the simulation set",
        example: 5
    })
    completedRunCount: number;

    @IsNumber()
    @ApiProperty({
        name: "completedSimConfigCount",
        type: Number,
        description: "The number of simulation configurations completed in the simulation set",
        example: 5
    })
    completedSimConfigCount: number;
}

export class SimSetDTOCreate extends PickType(SimSetDTOGet, ["description", "type"]) {}
