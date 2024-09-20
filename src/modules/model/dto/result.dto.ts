import { ApiProperty } from "@nestjs/swagger";
import { StateSpacePointDTOCreate } from "./state-space.dto";
import { IsArray, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Transform, Type } from "class-transformer";

export class ResultDTOCreate {
    @IsNumber()
    @ApiProperty({
        name: "simConfigId",
        type: Number,
        description: "The unique identifier of the simulation configuration that produced this result",
        example: 1
    })
    simConfigId: number;

    @IsNumber()
    @ApiProperty({
        name: "runCount",
        type: Number,
        description: "The run count of the simulation",
        example: 1
    })
    runCount: number;

    @IsString()
    @ApiProperty({
        name: "nodeId",
        type: String,
        description: "The unique identifier of the node that produced this result",
        example: "e221a974cfc069b0b8ace096c1153ca3eb4707344ae50fe2f4529003fab2c4e2:649566"
    })
    nodeId: string;

    @Transform( ({ value }) => new Date(value))
    @IsDate()
    @ApiProperty({
        name: "start",
        type: Date,
        format: "date-time",
        description: "The start datetime stamp of the simulation",
        example: "2024-03-01T00:00:00.000Z"
    })
    start: Date;

    @Transform( ({ value }) => new Date(value))
    @IsDate()
    @ApiProperty({
        name: "end",
        type: Date,
        format: "date-time",
        description: "The end datetime stamp of the simulation",
        example: "2024-03-01T00:00:38.000Z"
    })
    end: Date;

    @IsNumber()
    @ApiProperty({
        name: "clockTick",
        type: Number,
        description: "The clock tick of the simulation",
        example: 9599
    })
    clockTick: number;

    @IsNumber()
    @ApiProperty({
        name: "durationSec",
        type: Number,
        description: "The computing time duration of the simulation in seconds",
        example: 38
    })
    durationSec: number;

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({
        name: "agentStates",
        type: [Number],
        description: "The final state of the Agent Set",
        example: [
            0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1,
            0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
            0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0
        ]
    })
    agentStates: number[];

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({
        name: "board",
        type: [Number],
        description: "The final state of the Board",
        example: [436800, 436800, 0, 91, 1, 1, 300, 9600]
    })
    board: number[];

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({
        name: "plant",
        type: [Number],
        description: "The final state of the Plant",
        example: [0, 0, 0, 0, 0, 0, 0, 0]
    })
    plant: number[];

    @IsArray()
    @IsNumber({}, { each: true })
    @ApiProperty({
        name: "reporting",
        type: [Number],
        description: "The final state of the Reporting System",
        example: [0,873600,-873600,91,1,1,300,9600]
    })
    reporting: number[];

    @IsArray()
    @ApiProperty({
        name: "priorityTensor",
        type: [[[Number]]],
        description: "The final state of the priority tensor",
        example: [[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]],[[0.85,0.15],[0.85,0.15]]]
    })
    priorityTensor: number[][][];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StateSpacePointDTOCreate)
    @IsOptional()
    @ApiProperty({
        name: "stateSpace",
        type: StateSpacePointDTOCreate,
        required: false,
        description: "The state space points of the simulation",
        example: []
    })
    stateSpace?: StateSpacePointDTOCreate[];
}
