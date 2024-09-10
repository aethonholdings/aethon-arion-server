import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsString } from "class-validator";

export class ConfiguratorParamsDTOCreate {
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
            spans: 1,
            layers: 1,
            gains: { influence: 0.000001, judgment: 0.00001, incentive: 1e-8 },
            graph: "teams",
            actionStateProbability: 0.85,
            matrixInit: { influence: "null", judgment: "random", incentive: "purposeful" },
            reporting: { unitPayroll: 1, unitPrice: 1 },
            board: { controlStep: false }
        }
    })
    data: any;
}
