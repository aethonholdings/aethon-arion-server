import { ApiProperty, PickType } from "@nestjs/swagger";
import { OrgConfigDTO, ResultDTO, SimConfigDTO, SimSetDTO, StateType } from "aethon-arion-pipeline";
import { Transform } from "class-transformer";
import { IsDate, IsIn, IsNumber, IsObject, IsOptional, IsString } from "class-validator";

export class SimConfigDTOGet implements SimConfigDTO {
    @IsNumber()
    @ApiProperty({
        name: "id",
        type: Number,
        description: "The unique identifier of the simulation configuration",
        example: 1
    })
    id: number;

    @IsObject()
    @ApiProperty({
        name: "simSet",
        type: Object,
        description: "The simulation set to which this simulation configuration belongs",
        example: {
            id: 1,
            description: "SimSet 1",
            type: "C1",
            state: "running",
            simConfigCount: 10,
            completedRunCount: 5,
            completedSimConfigCount: 5
        }
    })
    simSet: SimSetDTO;

    @IsNumber()
    @ApiProperty({
        name: "simSetId",
        type: Number,
        description: "The unique identifier of the simulation set to generate a SimConfig for",
        example: 1
    })
    simSetId: number;

    @IsObject()
    @ApiProperty({
        name: "orgConfig",
        type: Object,
        description: "The organizational configuration for this simulation configuration",
        example: {
            id: 1,
            type: "C1",
            clockTickSeconds: 1,
            agentCount: 100,
            board: {},
            agentSet: {},
            plant: {},
            reporting: {},
            priorityIntensity: 1,
            influenceIntensity: 1,
            judgmentIntensity: 1,
            incentiveIntensity: 1,
            configuratorParams: {},
            configuratorName: "C1"
        }
    })
    orgConfig: OrgConfigDTO;

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
        name: "runCount",
        type: Number,
        description: "The number of runs executed for the simulation configuration",
        example: 4
    })
    runCount: number;

    @IsNumber()
    @IsOptional()
    @ApiProperty({
        name: "days",
        type: Number,
        required: false,
        description: "The number of simulation 'days' to run the simulation for.",
        example: 100
    })
    days: number;

    @IsIn(["static", "random"])
    @IsOptional()
    @ApiProperty({
        name: "randomStreamType",
        type: "string",
        required: false,
        enum: ["static", "random"],
        description:
            "The type of random stream to use for the simulation. 'static' uses a deterministic sequence from fixed random seeds and is useful for testing, 'random' uses Math.random().",
        example: "random"
    })
    randomStreamType: "static" | "random";

    @Transform(({ value }) => new Date(value))
    @IsDate()
    @ApiProperty({
        name: "start",
        type: Date,
        format: "date-time",
        description: "The start date and time of the simulation",
        example: "2021-01-01T00:00:00Z"
    })
    start: Date;

    @Transform(({ value }) => new Date(value))
    @IsDate()
    @ApiProperty({
        name: "end",
        type: Date,
        format: "date-time",
        description: "The end date and time of the simulation",
        example: "2021-01-01T00:00:00Z"
    })
    end: Date;

    @IsNumber()
    @ApiProperty({
        name: "durationSec",
        type: Number,
        description: "The duration of the simulation in seconds",
        example: 100
    })
    durationSec: number;

    @IsNumber()
    @ApiProperty({
        name: "avgPerformance",
        type: Number,
        description: "The average performance across all results of the SimConfig",
        example: 9450.81
    })
    avgPerformance: number;

    @IsNumber()
    @ApiProperty({
        name: "stdDevPerformance",
        type: Number,
        description: "The standard deviation of performance across all results of the SimConfig",
        example: 0.81
    })
    stdDevPerformance: number;

    @IsNumber()
    @ApiProperty({
        name: "entropy",
        type: Number,
        description: "The entropy of the results of the simulation",
        example: 8.2
    })
    entropy: number;

    @IsObject()
    @IsOptional()
    @ApiProperty({
        name: "results",
        type: Object,
        required: false,
        description: "The results of the simulation"
    })
    results: ResultDTO[];

    @IsString()
    @ApiProperty({
        name: "state",
        type: "string",
        description: "The state of the simulation configuration",
        example: "running"
    })
    state: StateType;
}

export class SimConfigDTOCreate extends PickType(SimConfigDTOGet, [
    "simSetId",
    "orgConfigId",
    "days",
    "randomStreamType"
]) {}
