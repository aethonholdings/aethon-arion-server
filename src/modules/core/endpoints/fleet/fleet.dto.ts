import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";

/**
 * Where a node instance is on its way to taking work:
 * - launching: AWS is starting the instance
 * - building: the instance is up and setting up the node (install, build), about 5 minutes
 * - running: the node processes are running
 * - stopping: the instance is being terminated
 */
export type FleetInstancePhase = "launching" | "building" | "running" | "stopping";

export class FleetInstanceDTO {
    @ApiProperty() id: string;
    @ApiProperty() type: string;
    @ApiProperty({ description: "Auto Scaling lifecycle state, e.g. Pending, InService, Terminating" }) state: string;
    @ApiProperty({ enum: ["launching", "building", "running", "stopping"] }) phase: FleetInstancePhase;
    @ApiPropertyOptional() availabilityZone?: string;
    @ApiPropertyOptional() launchTime?: string;
}

export class FleetCountsDTO {
    @ApiProperty() launching: number;
    @ApiProperty() building: number;
    @ApiProperty() running: number;
    @ApiProperty() stopping: number;
    @ApiProperty({ description: "Instances on their way to taking work: target minus running, at least 0" }) pending: number;
}

export class FleetDTO {
    @ApiProperty({ description: "False when the server is not configured to manage a node fleet" }) enabled: boolean;
    @ApiPropertyOptional() group?: string;
    @ApiPropertyOptional({ description: "Instances the group is set to run" }) desired?: number;
    @ApiPropertyOptional() min?: number;
    @ApiPropertyOptional({ description: "The most instances the group may run" }) max?: number;
    @ApiPropertyOptional({ type: FleetCountsDTO }) counts?: FleetCountsDTO;
    @ApiPropertyOptional({ type: FleetInstanceDTO, isArray: true }) instances?: FleetInstanceDTO[];
    @ApiPropertyOptional({ description: "Why the group could not start instances recently (e.g. no Spot capacity)" })
    lastError?: string | null;
}

export class FleetScaleDTO {
    @ApiProperty({ description: "Instances to run (0 stops the fleet)", example: 2 })
    @IsInt()
    @Min(0)
    @Max(100)
    desired: number;
}
