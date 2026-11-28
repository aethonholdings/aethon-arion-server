import { Injectable, Logger } from "@nestjs/common";
import { DataSource, LessThan } from "typeorm";
import { NodeProcess } from "aethon-arion-db";
import environment from "../../../../../env/environment";
import { HeartbeatDTO, HeartbeatReplyDTO } from "./node.dto";

const DAY_MS = 24 * 3600 * 1000;
const PRUNE_EVERY_MS = 10 * 60 * 1000;

/** Node process heartbeats: the latest state of every process, for the Monitor (node plan step 1.3). */
@Injectable()
export class NodeService {
    private _logger: Logger = new Logger(NodeService.name);
    private _lastPrune: number = 0;
    private _expectedVersion: string | null;

    constructor(private dataSource: DataSource) {
        this._expectedVersion = environment().nodes?.expectedVersion ?? null;
    }

    /** Records a heartbeat; `machineId` is the authorised node's machine id (from its key). */
    async heartbeat(heartbeat: HeartbeatDTO, machineId?: string): Promise<HeartbeatReplyDTO> {
        const now = new Date();
        const parts = heartbeat.nodeId.split(":");
        await this.dataSource.getRepository(NodeProcess).save({
            id: heartbeat.nodeId,
            machineId: machineId ?? parts[0],
            instance: parts.length >= 3 ? parts.slice(1, -1).join(":") : null,
            state: heartbeat.state,
            runId: heartbeat.run?.runId ?? null,
            simConfigId: heartbeat.run?.simConfigId ?? null,
            clockTick: heartbeat.run?.clockTick ?? null,
            totalClockTicks: heartbeat.run?.totalClockTicks ?? null,
            runStartedAt: heartbeat.run?.startedAt ? new Date(heartbeat.run.startedAt) : null,
            completedRuns: heartbeat.completedRuns,
            failedRuns: heartbeat.failedRuns,
            averageRunMs: heartbeat.averageRunMs ?? null,
            lastError: heartbeat.lastError ? String(heartbeat.lastError).slice(0, 2000) : null,
            memoryMb: heartbeat.memoryMb ?? null,
            version: heartbeat.version ?? null,
            startedAt: heartbeat.startedAt ? new Date(heartbeat.startedAt) : null,
            lastHeartbeatAt: now
        });
        if (now.getTime() - this._lastPrune > PRUNE_EVERY_MS) {
            this._lastPrune = now.getTime();
            await this.prune(now);
        }
        return { commands: [], expectedVersion: this._expectedVersion };
    }

    /** Removes processes not heard from for a day. */
    async prune(now: Date = new Date()): Promise<number> {
        const result = await this.dataSource.getRepository(NodeProcess).delete({ lastHeartbeatAt: LessThan(new Date(now.getTime() - DAY_MS)) });
        if (result.affected) this._logger.log(`Removed ${result.affected} node processes not heard from for a day`);
        return result.affected ?? 0;
    }

    get expectedVersion(): string | null {
        return this._expectedVersion;
    }
}
