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
    @ApiProperty({ type: ProgressSimSetDTO, isArray: true, description: "Running SimSets, and those finished in the last 24 hours" })
    simSets: ProgressSimSetDTO[];
}
