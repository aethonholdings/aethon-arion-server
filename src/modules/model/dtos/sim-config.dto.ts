import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class SimConfigDTOCreate {
    @IsNumber()
    @ApiProperty({
        name: "orgConfigId",
        type: Number,
        description: "The unique identifier of the OrgConfig to generate the simulation config for",
        example: 1
    })
    orgConfigId: number;

    @IsNumber()
    @ApiProperty({
        name: "days",
        type: Number,
        description: "The number of simulation 'days' to run the simulation for.",
        example: 100
    })
    days: number;

    @IsString()
    @ApiProperty({
        name: "randomStreamType",
        type: "string",
        enum: ["static", "random"],
        description:
            "The type of random stream to use for the simulation. 'static' uses a deterministic sequence from fixed random seeds and is useful for testing, 'random' uses Math.random().",
        example: "random"
    })
    randomStreamType: "static" | "random";
}
