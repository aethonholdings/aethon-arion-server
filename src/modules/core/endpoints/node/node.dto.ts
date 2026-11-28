import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Length, Min, ValidateNested } from "class-validator";

export class HeartbeatRunDTO {
    @ApiPropertyOptional() @IsOptional() @IsInt() runId?: number;
    @ApiPropertyOptional() @IsOptional() @IsInt() simConfigId?: number;
    @ApiProperty() @IsInt() @Min(0) clockTick: number;
    @ApiProperty() @IsInt() @Min(0) totalClockTicks: number;
    @ApiProperty() @IsISO8601() startedAt: string;
}

/** A node process's heartbeat (sent every 10 s). */
export class HeartbeatDTO {
    @ApiProperty({ description: "The process's node id, <machine id>:<instance>:<process index>" })
    @IsString()
    @Length(1, 255)
    nodeId: string;

    @ApiProperty({ enum: ["idle", "requesting", "simulating", "posting"] })
    @IsIn(["idle", "requesting", "simulating", "posting", "backing-off", "draining"])
    state: string;

    @ApiPropertyOptional({ type: HeartbeatRunDTO })
    @IsOptional()
    @ValidateNested()
    @Type(() => HeartbeatRunDTO)
    run?: HeartbeatRunDTO | null;

    @ApiProperty() @IsInt() @Min(0) completedRuns: number;
    @ApiProperty() @IsInt() @Min(0) failedRuns: number;
    @ApiPropertyOptional() @IsOptional() @IsInt() averageRunMs?: number | null;
    @ApiPropertyOptional() @IsOptional() @IsString() lastError?: string | null;
    @ApiPropertyOptional() @IsOptional() @IsInt() memoryMb?: number;
    @ApiPropertyOptional({ description: "The node code's git commit" }) @IsOptional() @IsString() @Length(0, 64) version?: string;
    @ApiPropertyOptional() @IsOptional() @IsISO8601() startedAt?: string;
}

export class HeartbeatReplyDTO {
    @ApiProperty({ description: "Commands for the process (none yet; see node plan step 3.1)", isArray: true })
    commands: any[];
    @ApiPropertyOptional({ description: "The node code commit deployed with the server; a process running another is outdated" })
    expectedVersion: string | null;
}
