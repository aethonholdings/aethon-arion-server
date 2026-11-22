import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, IsNull, Not } from "typeorm";
import { Run, SimConfig } from "aethon-arion-db";
import { States } from "aethon-arion-pipeline";
import environment from "../../../../../env/environment";
import { withTransactionRetry } from "../../../../common/utils/transaction";
import { ConvergenceTestService } from "../../services/convergence-test/convergence-test.service";

@Injectable()
export class RunService {
    private _logger: Logger = new Logger(RunService.name);
    private _maxRunFailures: number;

    constructor(
        private dataSource: DataSource,
        private convergenceTestService: ConvergenceTestService
    ) {
        this._maxRunFailures = environment().options.maxRunFailures ?? 3;
    }

    /**
     * Records that a dispatched run failed on its node (for example, the simulation threw). Once a simConfig has
     * `maxRunFailures` failed runs it is marked failed: it is no longer dispatched (a simConfig that crashes every
     * node would otherwise block the queue, since dispatch always hands out the lowest unconverged simConfig), and
     * the failure propagates to its convergence test, optimiser state and SimSet.
     *
     * Idempotent: reporting a run that already failed or already has a result changes nothing.
     */
    async fail(runId: number, error: string): Promise<{ runId: number; failedRuns: number; simConfigFailed: boolean }> {
        return withTransactionRetry(this.dataSource, async (tEntityManager: EntityManager) => {
            const run: Run | null = await tEntityManager.getRepository(Run).findOne({ where: { id: runId } });
            if (!run) throw new NotFoundException(`Run ${runId} not found`);
            // lock the simConfig row first, as result posting does, so failures and results are serialised
            const simConfig: SimConfig = await tEntityManager.getRepository(SimConfig).findOneOrFail({
                where: { id: run.simConfigId },
                lock: { mode: "pessimistic_write" },
                loadEagerRelations: false
            });
            if (run.resultId !== null && run.resultId !== undefined) {
                throw new BadRequestException(`Run ${runId} already has a result`);
            }
            if (!run.failedAt) {
                await tEntityManager.getRepository(Run).update(run.id, {
                    failedAt: new Date(),
                    error: String(error ?? "unknown error").slice(0, 4000)
                });
            }
            const failedRuns: number = await tEntityManager
                .getRepository(Run)
                .count({ where: { simConfigId: simConfig.id, failedAt: Not(IsNull()) } });
            let simConfigFailed: boolean = simConfig.state === States.FAILED;
            if (!simConfigFailed && !simConfig.converged && failedRuns >= this._maxRunFailures) {
                this._logger.warn(`SimConfig ${simConfig.id} failed after ${failedRuns} failed runs: ${error}`);
                await tEntityManager.getRepository(SimConfig).update(simConfig.id, { state: States.FAILED, end: new Date() });
                simConfigFailed = true;
                await this.convergenceTestService.touch(simConfig.convergenceTestId, tEntityManager);
            }
            return { runId: run.id, failedRuns, simConfigFailed };
        });
    }
}
