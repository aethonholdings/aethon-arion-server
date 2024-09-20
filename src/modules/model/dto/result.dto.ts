import { ApiProperty, PickType } from "@nestjs/swagger";
import { StateSpacePointDTOCreate } from "./state-space.dto";
import { IsArray, IsDate, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { Transform, Type } from "class-transformer";
import { ConfiguratorParamsDTO, SimConfigDTO } from "aethon-arion-pipeline";
import { ConfiguratorParamsDTOGet } from "./configurator-param.dto";

export class ResultDTOGet {
    @IsNumber()
    @ApiProperty({
        name: "id",
        type: Number,
        description: "The unique identifier of the simulation result",
        example: 1
    })
    id: number;

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
        name: "orgConfigId",
        type: Number,
        description: "The ID of the organization configuration that produced this result",
        example: 1
    })
    orgConfigId: number;

    @IsNumber()
    @ApiProperty({
        name: "simSetId",
        type: Number,
        description: "The unique identifier of the simulation set that produced this result",
        example: 1
    })
    simSetId: number;

    @IsObject()
    @ApiProperty({
        name: "simConfig",
        type: Object,
        description: "The simulation configuration that produced this result",
        example: {}
    })
    simConfig: SimConfigDTO;

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

    @IsNumber()
    @ApiProperty({
        name: "performance",
        type: Number,
        required: false,
        description: "The value of the final performance metric of the result",
        example: 0.85
    })
    performance?: number;


    @IsNumber()
    @ApiProperty({
        name: "priorityIntensity",
        type: Number,
        required: false,
        description: "The sum of the squares of the values of the final priority tensor of the result",
        example: 0.85
    })
    priorityIntensity: number;

    @IsNumber()
    @ApiProperty({
        name: "agentCount",
        type: Number,
        required: false,
        description: "The number of agents in the simulation",
        example: 10
    })
    agentCount: number;

    @IsString()
    @ApiProperty({
        name: "orgConfigType",
        type: String,
        required: false,
        description: "The type of organization configuration that produced this result",
        example: "C1"
    })
    orgConfigType?: string;

    @IsString()
    @ApiProperty({
        name: "configuratorName",
        type: String,
        required: false,
        description: "The name of the configurator that produced this result",
        example: "C1Configurator"})
    configuratorName: string;

    @IsObject()
    @ApiProperty({
        name: "configuratorParams",
        type: ConfiguratorParamsDTOGet,
        description: "The parameters of the configurator that produced this result",
        example: {
            configuratorName: "C1Configurator",
            data: {
                spans: 1,
                layers: 1,
                gains: { influence: 0.000001, judgment: 0.00001, incentive: 1e-8 },
                graph: "teams",
                actionStateProbability: 0.85,
                matrixInit: { influence: "null", judgment: "random", incentive: "purposeful" },
                reporting: { unitPayroll: 1, unitPrice: 1 },
                board: { controlStep: false }
            }
        }
    })
    configuratorParams: ConfiguratorParamsDTO;
}

export class ResultDTOCreate extends PickType(ResultDTOGet, [
    "simConfigId",
    "runCount",
    "nodeId",
    "start",
    "end",
    "clockTick",
    "durationSec",
    "agentStates",
    "board",
    "plant",
    "reporting",
    "priorityTensor",
    "stateSpace"
]) {}
