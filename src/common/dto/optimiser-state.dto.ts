
import { ApiProperty } from "@nestjs/swagger";
import { SimSet } from "aethon-arion-db";
import { ConvergenceTestDTO, OptimiserData, OptimiserStateDTO, SimSetDTO, StateType } from "aethon-arion-pipeline";

import { IsArray, IsBoolean, IsDate, IsNumber, IsObject, IsOptional, IsString } from "class-validator";

export class OptimiserStateDTOGet implements OptimiserStateDTO<OptimiserData> {
    @IsNumber()
    @ApiProperty({
        name: "id",
        type: Number,
        required: true,
        description: "The unique identifier of the optimiser state",
        example: 1
    })
    id: number;

    @IsNumber()
    @ApiProperty({
        name: "stepCount",
        type: Number,
        required: true,
        description: "The step count of the optimiser state",
        example: 1
    })
    stepCount: number;

    @IsString()
    @ApiProperty({
        name: "status",
        type: String,
        required: true,
        description: "The status of the optimiser state",
        example: "PENDING"
    })
    status: StateType;

    @IsNumber()
    @ApiProperty({
        name: "simSetId",
        type: Number,
        required: true,
        description: "The unique identifier of the sim set",
        example: 1
    })
    simSetId: number;

    @IsDate()
    @IsOptional()
    @ApiProperty({
        name: "start",
        type: Date,
        required: false,
        description: "The start date of the optimiser state",
        example: "2023-01-01T00:00:00Z"
    })
    start?: Date;

    @IsDate()
    @IsOptional()
    @ApiProperty({
        name: "end",
        type: Date,
        required: false,
        description: "The end date of the optimiser state",
        example: "2023-01-01T00:00:00Z"
    })
    end?: Date;

    @IsNumber()
    @IsOptional()
    @ApiProperty({
        name: "durationSec",
        type: Number,
        required: false,
        description: "The duration in seconds of the optimiser state",
        example: 60
    })
    durationSec?: number;

    @IsNumber()
    @IsOptional()
    @ApiProperty({
        name: "percentComplete",
        type: Number,
        required: false,
        description: "The percentage complete of the optimiser state",
        example: 50
    })
    percentComplete?: number;

    @IsObject()
    @ApiProperty({
        name: "optimiserData",
        type: Object,
        required: true,
        description: "The optimiser data of the optimiser state",
        example: {}
    })
    optimiserData: OptimiserData;

    @IsString()
    @IsOptional()
    @ApiProperty({
        name: "modelName",
        type: String,
        required: false,
        description: "The name of the model",
        example: "ModelName"
    })
    modelName?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        name: "optimiserName",
        type: String,
        required: false,
        description: "The name of the optimiser",
        example: "OptimiserName"
    })
    optimiserName?: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        name: "configuratorName",
        type: String,
        required: false,
        description: "The name of the configurator",
        example: "ConfiguratorName"
    })
    configuratorName?: string;

    @IsNumber()
    @IsOptional()
    @ApiProperty({
        name: "performance",
        type: Number,
        required: false,
        description: "The performance of the optimiser state",
        example: 100
    })
    performance?: number;
    
    @IsArray()
    @IsOptional()
    @ApiProperty({
        name: "convergenceTests",
        type: [Object],
        required: false,
        description: "The convergence tests of the optimiser state",
        example: []
    })
    convergenceTests?: ConvergenceTestDTO[];

    @IsObject()
    @IsOptional()
    @ApiProperty({
        name: "simSet",
        type: Object,
        required: false,
        description: "The sim set of the optimiser state",
        example: {}
    })
    simSet: SimSetDTO;

    @IsBoolean()
    @ApiProperty({
        name: "converged",
        type: Boolean,
        required: true,
        description: "The convergence status of the optimiser state",
        example: false
    })
    converged: boolean;
}

