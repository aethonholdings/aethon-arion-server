import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { ApiProperty, PickType } from "@nestjs/swagger";
import { ModelParamsDTO, SimSetDTO } from "aethon-arion-pipeline";

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

    @IsObject()
    @IsOptional()
    @ApiProperty({
        name: "modelParams",
        type: Object,
        description: "Model parameters for the simulation set",
        example: {
            "param1": "value1",
            "param2": "value2"
        },
        required: false
    })
    modelParams: ModelParamsDTO;
}

export class SimSetDTOCreate extends PickType(SimSetDTOGet, ["description", "modelName", "modelParams"]) {
    @IsOptional()
    modelParams: ModelParamsDTO;

    @IsOptional()
    description: string;
}
