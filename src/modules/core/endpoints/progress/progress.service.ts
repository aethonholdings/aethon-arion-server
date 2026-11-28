import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { States } from "aethon-arion-pipeline";
import { ProgressDTO, ProgressNodeDTO, ProgressProcessDTO, ProgressSimSetDTO } from "./progress.dto";
import environment from "../../../../../env/environment";

/** Seconds without a heartbeat after which a process counts as silent. */
export const SILENT_AFTER_SECONDS = 30;

/** Minutes over which node activity and throughput are measured. */
export const ACTIVITY_WINDOW_MINUTES = 5;

const num = (value: any): number => Number(value ?? 0);
const iso = (value: any): string | null => (value ? new Date(value).toISOString() : null);

/** A read-only snapshot of the work in progress: nodes, throughput and SimSet convergence, for monitoring. */
@Injectable()
export class ProgressService {
    private _expectedVersion: string | null = environment().nodes?.expectedVersion ?? null;

    constructor(private dataSource: DataSource) {}

    async get(): Promise<ProgressDTO> {
        const w = ACTIVITY_WINDOW_MINUTES;
        const q = (sql: string, params: any[] = []) => this.dataSource.query(sql, params);
        const [[activity], [hour], [inFlight], instances, nodes, simSets, processRows] = await Promise.all([
            q(
                `SELECT SUM(dispatchedAt > NOW() - INTERVAL ? MINUTE) AS dispatched,
                        SUM(completedAt > NOW() - INTERVAL ? MINUTE) AS results,
                        SUM(failedAt > NOW() - INTERVAL ? MINUTE) AS failed
                 FROM run WHERE dispatchedAt > NOW() - INTERVAL 1 DAY`,
                [w, w, w]
            ),
            q(`SELECT COUNT(*) AS n FROM run WHERE completedAt > NOW() - INTERVAL 1 HOUR`),
            q(
                `SELECT COUNT(*) AS n FROM run
                 WHERE dispatchedAt > NOW() - INTERVAL 30 MINUTE AND resultId IS NULL AND failedAt IS NULL`
            ),
            // node processes active in the window, with the machine id they belong to (before the ':')
            q(
                `SELECT SUBSTRING_INDEX(nodeId, ':', 1) AS machine, COUNT(DISTINCT nodeId) AS instances,
                        SUM(completedAt > NOW() - INTERVAL ? MINUTE) AS results
                 FROM run WHERE dispatchedAt > NOW() - INTERVAL ? MINUTE GROUP BY machine`,
                [w, w]
            ),
            q(
                `SELECT id, hostname, lastSeenAt, revokedAt, lastSeenAt > NOW() - INTERVAL ? MINUTE AS active
                 FROM authorised_node ORDER BY lastSeenAt DESC`,
                [w]
            ),
            q(
                `SELECT s.id, s.description, s.state, s.currentOptimiserStateId,
                        (SELECT COUNT(*) FROM optimiser_state o WHERE o.simSetId = s.id) AS steps,
                        cur.status AS currentStepStatus, cur.percentComplete AS currentStepPercentComplete
                 FROM sim_set s LEFT JOIN optimiser_state cur ON cur.id = s.currentOptimiserStateId
                 WHERE s.state NOT IN (?, ?)
                    OR EXISTS (SELECT 1 FROM optimiser_state o WHERE o.simSetId = s.id AND o.end > NOW() - INTERVAL 1 DAY)
                 ORDER BY s.id DESC`,
                [States.COMPLETED, States.FAILED]
            ),
            q(
                `SELECT *, TIMESTAMPDIFF(SECOND, lastHeartbeatAt, NOW()) AS age FROM node_process
                 WHERE lastHeartbeatAt > NOW() - INTERVAL 1 HOUR ORDER BY instance, id`
            )
        ]);
        const processes: ProgressProcessDTO[] = processRows.map((p: any) => ({
            id: p.id,
            machineId: p.machineId,
            instance: p.instance ?? null,
            state: p.state,
            runId: p.runId === null ? null : num(p.runId),
            simConfigId: p.simConfigId === null ? null : num(p.simConfigId),
            clockTick: p.clockTick === null ? null : num(p.clockTick),
            totalClockTicks: p.totalClockTicks === null ? null : num(p.totalClockTicks),
            runStartedAt: iso(p.runStartedAt),
            completedRuns: num(p.completedRuns),
            failedRuns: num(p.failedRuns),
            averageRunMs: p.averageRunMs === null ? null : num(p.averageRunMs),
            lastError: p.lastError ?? null,
            memoryMb: p.memoryMb === null ? null : num(p.memoryMb),
            version: p.version ?? null,
            lastHeartbeatAt: iso(p.lastHeartbeatAt) as string,
            silent: num(p.age) > SILENT_AFTER_SECONDS,
            outdated: !!this._expectedVersion && !!p.version && p.version !== this._expectedVersion
        }));
        // average run time across processes, weighted by their completed runs
        const timed = processes.filter((p) => p.averageRunMs !== null && p.completedRuns > 0);
        const weight = timed.reduce((sum, p) => sum + p.completedRuns, 0);
        const averageRunMs = weight > 0 ? Math.round(timed.reduce((sum, p) => sum + (p.averageRunMs as number) * p.completedRuns, 0) / weight) : null;

        const ids: number[] = simSets.map((s: any) => num(s.id));
        const counts: { [id: number]: any } = {};
        if (ids.length > 0) {
            // each simConfig once per SimSet (a convergence test can serve several optimiser states)
            const rows = await q(
                `SELECT t.simSetId, COUNT(*) AS total, SUM(t.converged = 1) AS converged,
                        SUM(t.state = ?) AS running, SUM(t.state = ?) AS failed, SUM(t.runCount) AS results,
                        MAX(t.lastResultAt) AS lastResultAt
                 FROM (SELECT DISTINCT o.simSetId, sc.id, sc.converged, sc.state, sc.runCount,
                              (SELECT MAX(r.completedAt) FROM run r WHERE r.simConfigId = sc.id) AS lastResultAt
                       FROM optimiser_state o
                       JOIN optimiser_state_convergence_tests_convergence_test l ON l.optimiserStateId = o.id
                       JOIN sim_config sc ON sc.convergenceTestId = l.convergenceTestId
                       WHERE o.simSetId IN (?)) t
                 GROUP BY t.simSetId`,
                [States.RUNNING, States.FAILED, ids]
            );
            for (const row of rows) counts[num(row.simSetId)] = row;
        }

        const byMachine: { [machine: string]: any } = {};
        for (const row of instances) byMachine[row.machine] = row;
        const nodeRows: ProgressNodeDTO[] = nodes.map((n: any) => ({
            id: n.id,
            hostname: n.hostname ?? null,
            lastSeenAt: iso(n.lastSeenAt),
            active: num(n.active) === 1 && !n.revokedAt,
            instances: num(byMachine[n.id]?.instances),
            results: num(byMachine[n.id]?.results),
            revoked: !!n.revokedAt
        }));

        const results = num(activity?.results);
        return {
            generatedAt: new Date().toISOString(),
            activity: {
                windowMinutes: w,
                dispatchedRuns: num(activity?.dispatched),
                results,
                failedRuns: num(activity?.failed),
                resultsPerMinute: Math.round((results / w) * 10) / 10,
                resultsLastHour: num(hour?.n),
                inFlightRuns: num(inFlight?.n),
                activeInstances: instances.reduce((sum: number, row: any) => sum + num(row.instances), 0),
                averageRunMs
            },
            nodes: nodeRows,
            processes,
            expectedNodeVersion: this._expectedVersion,
            simSets: simSets.map(
                (s: any): ProgressSimSetDTO => ({
                    id: num(s.id),
                    description: s.description,
                    state: s.state,
                    steps: num(s.steps),
                    currentStepId: s.currentOptimiserStateId ? num(s.currentOptimiserStateId) : null,
                    currentStepStatus: s.currentStepStatus ?? null,
                    currentStepPercentComplete: s.currentStepPercentComplete === null || s.currentStepPercentComplete === undefined ? null : num(s.currentStepPercentComplete),
                    simConfigs: num(counts[num(s.id)]?.total),
                    convergedSimConfigs: num(counts[num(s.id)]?.converged),
                    runningSimConfigs: num(counts[num(s.id)]?.running),
                    failedSimConfigs: num(counts[num(s.id)]?.failed),
                    results: num(counts[num(s.id)]?.results),
                    lastResultAt: iso(counts[num(s.id)]?.lastResultAt)
                })
            )
        };
    }
}
