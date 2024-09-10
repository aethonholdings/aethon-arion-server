import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SimSetDTOCreate {
    @IsString()
    @ApiProperty({
        name: "description",
        type: "string",
        description: "Text description of the simulation set",
        example: "Here is a test description"
    })
    description: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        name: "type",
        type: String,
        description: "The signature of the organisation model for which the simulation set is run",
        example: "C1"
    })
    type: string;
}
