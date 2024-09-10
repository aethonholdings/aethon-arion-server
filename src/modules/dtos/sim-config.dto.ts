import { ApiProperty } from "@nestjs/swagger";
import { StateType } from "aethon-arion-pipeline";
import { IsDate, IsNumber, IsString } from "class-validator";

// needs to implement SimConfigDTO
export class SimConfigDTOValidator {
    @IsNumber()
    @ApiProperty({
        description: "The unique identifier of the simulation configuration"
    })
    id: number;

    @IsNumber()
    @ApiProperty({
        description: "The unique identifier of the simulation set to which the configuration belongs"
    })
    simSetId: number;

    @IsNumber()
    @ApiProperty({
        description:
            "The unique identifier of the organisation model configuration with which the simulation configuration is associated"
    })
    orgConfigId: number;

    @IsNumber()
    @ApiProperty({
        description: "The number of completed runs associated with the simulation configuration"
    })
    runCount: number;

    @IsNumber()
    @ApiProperty({
        description: "The number of simulation 'days' that the run is to be executed for"
    })
    days: number;

    @IsString()
    @ApiProperty({
        description: "The type of random stream to be used for the simulation.  One of 'static' or 'random'"
    })
    randomStreamType: "static" | "random";

    @IsDate()
    @ApiProperty({
        description: "The start timestamp of the simulation run",
        format: "date-time"
    })
    start: Date;

    @IsDate()
    @ApiProperty({
        description: "The end timestamp of the simulation run",
        format: "date-time"
    })
    end: Date;

    @IsNumber()
    @ApiProperty({
        description: "The duration of the simulation run in seconds"
    })
    durationSec: number;

    @IsNumber()
    @ApiProperty({
        description: "The average performance of all runs under the simulation configuration"
    })
    avgPerformance: number;

    @IsNumber()
    @ApiProperty({
        description: "The standard deviation of the performance of all runs under the simulation configuration"
    })
    stdDevPerformance: number;

    @IsNumber()
    @ApiProperty({
        description: "The entropy of the performance of all runs under the simulation configuration"
    })
    entropy: number;

    // does not include debug?:string[]; not sure what this is meant to do!

    @IsString()
    @ApiProperty({
        description:
            "The current state of the simulation configuration.  One of 'running', 'pending', 'completed', or 'failed'"
    })
    state: StateType;
}
