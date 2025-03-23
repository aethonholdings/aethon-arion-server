import { ApiProperty, PickType } from "@nestjs/swagger";
import { ConfiguratorParamData } from "aethon-arion-pipeline";
import { IsBoolean, IsNumber, IsObject, IsString } from "class-validator";

export class ConfiguratorParamsDTOGet {
    @IsNumber()
    @ApiProperty({
        name: "id",
        type: Number,
        description: "The unique identifier of the ConfiguratorParamsDTO",
        example: 1
    })
    id: number;

    @IsString()
    @ApiProperty({
        name: "modelName",
        type: String,
        description: "The signature name of the Model to use for generating the OrgConfigs",
        example: "C1"
    })
    modelName: string;

    @IsString()
    @ApiProperty({
        name: "configuratorName",
        type: String,
        description: "The signature name of the Configurator to use for generating the OrgConfigs",
        example: "C1Configurator"
    })
    configuratorName: string;

    @IsObject()
    @ApiProperty({
        name: "data",
        type: Object,
        description: "The data object containing the parameters for the model Configurator",
        example: {
            board: { controlStep: true },
            gains: { judgment: 0.00001, incentive: 0.00000001, influence: 0.000001 },
            graph: "teams",
            spans: 1,
            layers: 1,
            reporting: { unitPrice: 1, unitPayroll: 1 },
            matrixInit: { judgment: "null", incentive: "null", influence: "null" },
            actionStateProbability: 0.85
        }
    })
    data: ConfiguratorParamData;

    @IsString()
    @ApiProperty({
        name: "hash",
        type: String,
        description: "Unique hash used for indexing and quick search of the ConfiguratorParamsDTO data",
        example: "b7c4067460b6dda6cf01dd9831b13045b4dfc721"
    })
    hash: string;

    @IsBoolean()
    @ApiProperty({
        name: "multipleOrgConfigs",
        type: Boolean,
        description: "Flag indicating whether the ConfiguratorParamsDTO requires multiple OrgConfigs",
        example: true
    })
    multipleOrgConfigs: boolean;
}

export class ConfiguratorParamsDTOCreate extends PickType(ConfiguratorParamsDTOGet, [
    "modelName",
    "configuratorName",
    "data",
    "multipleOrgConfigs"
]) {}
