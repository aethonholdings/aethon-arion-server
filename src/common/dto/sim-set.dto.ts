import { IsArray, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { ModelParamsDTO, OptimiserParameters, SimConfigParamsDTO, SimSetDTO, StateType } from "aethon-arion-pipeline";
import { OptimiserState } from "aethon-arion-db";

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
    @IsOptional()
    @ApiProperty({
        name: "description",
        type: "string",
        description: "Text description of the simulation set",
        example: "Here is a test description",
        required: false
    })
    description: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        name: "modelName",
        type: String,
        description: "The signature of the organisation model for which the simulation set is run",
        example: "C1"
    })
    modelName: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        name: "optimiserName",
        type: String,
        description: "The name of the optimiser used for the simulation set",
        example: "Gradient Ascent"
    })
    optimiserName: string;

    @IsString()
    @IsOptional()
    @ApiProperty({
        name: "configuratorName",
        type: String,
        description: "The name of the configurator used for the simulation set",
        example: "C1BaseConfigurator"
    })
    configuratorName: string;

    @IsIn(["running", "pending", "completed", "failed"])
    @ApiProperty({
        name: "state",
        type: String,
        description: "The state of the simulation set",
        example: "running"
    })
    state: StateType;

    @IsObject()
    @IsOptional()
    @ApiProperty({
        name: "modelParams",
        type: Object,
        description: "Model parameters for the simulation set",
        example: {
            param1: "value1",
            param2: "value2"
        },
        required: false
    })
    modelParams: ModelParamsDTO;

    @IsArray()
    @IsOptional()
    @ApiProperty({
        name: "optimiserStates",
        type: "array",
        description: "The states of the optimiser",
        required: false
    })
    optimiserStates: OptimiserState[];

    @IsObject()
    @IsOptional()
    @ApiProperty({
        name: "simConfigParams",
        type: Object,
        description: "The parameters for simulation configurations in this SimSet",
        required: false
    })
    simConfigParams: SimConfigParamsDTO;

    @IsObject()
    @IsOptional()
    @ApiProperty({
        name: "optimiserParams",
        type: Object,
        description: "The parameters for the optimiser in this SimSet",
        required: false
    })
    optimiserParams: OptimiserParameters;

    @IsNumber()
    @IsOptional()
    @ApiProperty({
        name: "currentOptimiserStateId",
        type: Number,
        description: "The current optimiser state ID",
        example: 1,
        required: false
    })
    currentOptimiserStateId: number | null;

    @IsArray()
    @IsOptional()
    @ApiProperty({
        name: "currentConvergenceTestIds",
        type: "array",
        description: "The current convergence test IDs",
        required: false
    })
    currentConvergenceTestIds: number[];
}

export class SimSetDTOCreate extends PickType(SimSetDTOGet, [
    "description",
    "modelName",
    "modelParams",
    "optimiserName",
    "configuratorName",
    "simConfigParams",
    "optimiserParams"
]) {
    @IsOptional()
    description: string;

    @IsOptional()
    modelParams: ModelParamsDTO;
}
