import { SimConfigDTO, SimSetDTO, StateType } from "aethon-arion-pipeline";
import { SimConfigDTOValidator } from "./sim-config.dto";
import { PickType } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class SimSetDTOValidator implements SimSetDTO {
    @IsNumber()
    @ApiProperty({
        description: "The unique identifier of the simulation set"
    })
    id: number;

    @IsString()
    @ApiProperty({
        description: "Text description of the simulation set",
        example: "Simulation set for testing the new model"
    })
    description: string;

    @IsObject()
    @ValidateNested()
    @Type(() => SimConfigDTOValidator)
    @ApiProperty({
        type: SimConfigDTOValidator,
        isArray: true,
        description: "An array of simulation configurations associated with the simulation set",
        example: "C1"
    })
    simConfigs: SimConfigDTO[];

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: "The signature of the organisation model for which the simulation set is run"
    })
    type: string;

    @IsString()
    @ApiProperty({
        description: "The current state of the simulation set. One of 'running', 'pending', 'completed', or 'failed'"
    })
    state: StateType;

    @IsNumber()
    @ApiProperty({
        description: "The number of simulation configurations associated with the simulation set"
    })
    simConfigCount: number;

    @IsNumber()
    @ApiProperty({
        description: "The number of completed simulation runs associated with the simulation set"
    })
    completedRunCount: number;

    @IsNumber()
    @ApiProperty({
        description: "The number of completed simulation configurations associated with the simulation set"
    })
    completedSimConfigCount: number;
}

export class SimSetDTOValidatorCreate extends PickType(SimSetDTOValidator, ["type", "description"]) {}
