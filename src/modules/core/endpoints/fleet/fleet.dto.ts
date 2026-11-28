import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

export class FleetInstanceDTO {
    @ApiProperty() id: string;
    @ApiProperty() type: string;
    @ApiProperty({ description: "Auto Scaling lifecycle state, e.g. Pending, InService, Terminating" }) state: string;
    @ApiPropertyOptional() availabilityZone: string;
}

export class FleetDTO {
    @ApiProperty({ description: "False when the server is not configured to manage a node fleet" }) enabled: boolean;
    @ApiPropertyOptional() group?: string;
    @ApiPropertyOptional({ description: "Instances the group is set to run" }) desired?: number;
    @ApiPropertyOptional() min?: number;
    @ApiPropertyOptional({ description: "The most instances the group may run" }) max?: number;
    @ApiPropertyOptional({ type: FleetInstanceDTO, isArray: true }) instances?: FleetInstanceDTO[];
}

export class FleetScaleDTO {
    @ApiProperty({ description: "Instances to run (0 stops the fleet)", example: 2 })
    @IsInt()
    @Min(0)
    @Max(100)
    desired: number;
}
