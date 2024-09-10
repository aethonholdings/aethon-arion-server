import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsString } from "class-validator";

export class ConfiguratorParamsDTOCreate {
    @IsString()
    @ApiProperty({
        name: "configuratorName",
        type: String,
        description: "The signature name of the Configurator to use for generating the OrgConfigs",
        example: "C1"
    })
    configuratorName: string;

    @IsObject()
    @ApiProperty({
        name: "data",
        type: Object,
        description: "The data object containing the parameters for the model Configurator"
    })
    data: any;
}
