import { ApiProperty } from "@nestjs/swagger";
import {
    AgentSetTensorsDTO,
    BoardDTO,
    ConfiguratorParamsDTO,
    OrgConfigDTO,
    PlantDTO,
    ReportingDTO,
    SimConfigDTO
} from "aethon-arion-pipeline";
import { IsNumber, IsObject, IsOptional, IsString } from "class-validator";

export class OrgConfigDTOGet implements OrgConfigDTO {
    @IsNumber()
    @ApiProperty({
        name: "id",
        type: Number,
        description: "The unique identifier of the organization configuration",
        example: 1
    })
    id: number;

    @IsString()
    @ApiProperty({
        name: "type",
        type: String,
        description: "The type of model for the organization configuration",
        example: "C1"
    })
    type: string;

    @IsNumber()
    @ApiProperty({
        name: "clockTickSeconds",
        type: Number,
        description: "The number of seconds per simulation clock tick",
        example: 300
    })
    clockTickSeconds: number;

    @IsNumber()
    @ApiProperty({
        name: "agentCount",
        type: Number,
        description: "The number of agents in the organization",
        example: 10
    })
    agentCount: number;

    @IsObject()
    @ApiProperty({
        name: "board",
        type: Object,
        description: "The board configuration tensor for the organization",
        example: { controlStep: false }
    })
    board: BoardDTO;

    @IsObject()
    @ApiProperty({
        name: "agentSet",
        type: Object,
        description: "The agent set configuration tensors for the organization",
        example: {
            priorityTensor: [
                [
                    [0.85, 0.15000000000000002],
                    [0.85, 0.15000000000000002]
                ]
            ],
            influenceTensor: [
                [
                    [
                        [0, 0],
                        [0, 0]
                    ]
                ]
            ],
            judgmentTensor: [
                [
                    [[0], [0]],
                    [[0], [0]]
                ]
            ],
            incentiveTensor: [
                [
                    [
                        [0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0]
                    ],
                    [
                        [0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0]
                    ]
                ]
            ]
        }
    })
    agentSet: AgentSetTensorsDTO;

    @IsObject()
    @ApiProperty({
        name: "plant",
        type: Object,
        description: "The plant configuration tensor for the organization",
        example: { initialState: [0], graph: [[0]] }
    })
    plant: PlantDTO;

    @IsObject()
    @ApiProperty({
        name: "reporting",
        type: Object,
        description: "The reporting tensor for the organization",
        example: { unitPrice: 1, unitPayroll: 1 }
    })
    reporting: ReportingDTO;

    @IsNumber()
    @ApiProperty({
        name: "priorityIntensity",
        type: Number,
        description: "The sum of the squares of all elements in the priority tensor",
        example: 0.85
    })
    priorityIntensity: number;

    @IsNumber()
    @ApiProperty({
        name: "influenceIntensity",
        type: Number,
        description: "The sum of the squares of all elements in the influence tensor",
        example: 0
    })
    influenceIntensity: number;

    @IsNumber()
    @ApiProperty({
        name: "judgmentIntensity",
        type: Number,
        description: "The sum of the squares of all elements in the judgment tensor",
        example: 0
    })
    judgmentIntensity: number;

    @IsNumber()
    @ApiProperty({
        name: "incentiveIntensity",
        type: Number,
        description: "The sum of the squares of all elements in the incentive tensor",
        example: 0
    })
    incentiveIntensity: number;

    @IsObject()
    @ApiProperty({
        name: "configuratorParams",
        type: Object,
        description: "The parameters used to generate the organization configuration",
        example: {
            board: { controlStep: false },
            gains: { judgment: 0.00001, incentive: 0.00000001, influence: 0.000001 },
            graph: "teams",
            spans: 1,
            layers: 1,
            reporting: { unitPrice: 1, unitPayroll: 1 },
            matrixInit: { judgment: "random", incentive: "purposeful", influence: "null" },
            actionStateProbability: 0.85
        }
    })
    configuratorParams: ConfiguratorParamsDTO;

    @IsObject()
    @IsOptional()
    @ApiProperty({
        name: "simConfigs",
        isArray: true,
        required: false,
        type: Object,
        description: "The simulation configurations for the organization",
        example: []
    })
    simConfigs?: SimConfigDTO[];

    @IsString()
    @IsOptional()
    @ApiProperty({
        name: "configuratorName",
        required: false,
        type: String,
        description: "The name of the configurator class used to generate the organization configuration",
        example: "C1Configurator"
    })
    configuratorName?: string;
}
