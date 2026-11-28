import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ProgressNodeDTO {
    @ApiProperty({ description: "Machine id the node's key is bound to" }) id: string;
    @ApiPropertyOptional() hostname: string | null;
    @ApiPropertyOptional({ description: "Last request from any process of this machine (written at most once a minute)" })
    lastSeenAt: string | null;
    @ApiProperty({ description: "Seen within the activity window" }) active: boolean;
    @ApiProperty({ description: "Node processes (machine id:instance) that took a run within the activity window" })
    instances: number;
    @ApiProperty({ description: "Results this machine posted within the activity window" }) results: number;
    @ApiProperty() revoked: boolean;
}

export class ProgressActivityDTO {
    @ApiProperty() windowMinutes: number;
    @ApiProperty({ description: "Runs handed out within the window" }) dispatchedRuns: number;
    @ApiProperty({ description: "Results recorded within the window" }) results: number;
    @ApiProperty({ description: "Runs reported failed within the window" }) failedRuns: number;
    @ApiProperty() resultsPerMinute: number;
    @ApiProperty({ description: "Results recorded in the last hour" }) resultsLastHour: number;
    @ApiProperty({ description: "Runs dispatched in the last 30 minutes with no result or failure yet" }) inFlightRuns: number;
    @ApiProperty({ description: "Distinct node processes that took a run within the window" }) activeInstances: number;
    @ApiPropertyOptional({ description: "Average run time of the processes heard from in the last hour (ms)" }) averageRunMs: number | null;
}

export class ProgressProcessDTO {
    @ApiProperty({ description: "<machine id>:<instance>:<process index>" }) id: string;
    @ApiProperty() machineId: string;
    @ApiPropertyOptional() instance: string | null;
    @ApiProperty({ description: "idle, requesting, simulating or posting" }) state: string;
    @ApiPropertyOptional() runId: number | null;
    @ApiPropertyOptional() simConfigId: number | null;
    @ApiPropertyOptional() clockTick: number | null;
    @ApiPropertyOptional() totalClockTicks: number | null;
    @ApiPropertyOptional() runStartedAt: string | null;
    @ApiProperty() completedRuns: number;
    @ApiProperty() failedRuns: number;
    @ApiPropertyOptional() averageRunMs: number | null;
    @ApiPropertyOptional() lastError: string | null;
    @ApiPropertyOptional() memoryMb: number | null;
    @ApiPropertyOptional() version: string | null;
    @ApiProperty() lastHeartbeatAt: string;
    @ApiProperty({ description: "No heartbeat for more than 30 s" }) silent: boolean;
    @ApiProperty({ description: "Runs other node code than the server deployed" }) outdated: boolean;
}

export class ProgressSimSetDTO {
    @ApiProperty() id: number;
    @ApiProperty() description: string;
    @ApiProperty() state: string;
    @ApiProperty({ description: "Optimiser states (steps) so far" }) steps: number;
    @ApiPropertyOptional() currentStepId: number | null;
    @ApiPropertyOptional() currentStepStatus: string | null;
    @ApiPropertyOptional() currentStepPercentComplete: number | null;
    @ApiProperty() simConfigs: number;
    @ApiProperty() convergedSimConfigs: number;
    @ApiProperty() runningSimConfigs: number;
    @ApiProperty() failedSimConfigs: number;
    @ApiProperty({ description: "Results counted towards convergence" }) results: number;
    @ApiPropertyOptional() lastResultAt: string | null;
}

export class ProgressDTO {
    @ApiProperty() generatedAt: string;
    @ApiProperty({ type: ProgressActivityDTO }) activity: ProgressActivityDTO;
    @ApiProperty({ type: ProgressNodeDTO, isArray: true }) nodes: ProgressNodeDTO[];
    @ApiProperty({ type: ProgressProcessDTO, isArray: true, description: "Node processes heard from in the last hour" })
    processes: ProgressProcessDTO[];
    @ApiPropertyOptional({ description: "The node code version deployed with the server" }) expectedNodeVersion: string | null;
    @ApiProperty({ type: ProgressSimSetDTO, isArray: true, description: "Running SimSets, and those finished in the last 24 hours" })
    simSets: ProgressSimSetDTO[];
}
