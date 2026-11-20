import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Result, Run, SimConfig, StateSpacePoint } from "aethon-arion-db";
import { withTransactionRetry } from "../../../../common/utils/transaction";
import { ConvergenceCriteria, standardErrorConvergence } from "../../../../common/utils/convergence";
import { Utils, ResultDTO, States, SimConfigDTO } from "aethon-arion-pipeline";
import { ModelService } from "../../services/model/model.service";
import environment from "../../../../../env/environment";
import { Paginated, Paginator } from "aethon-nestjs-paginate";
import { ConvergenceTestService } from "../../services/convergence-test/convergence-test.service";

type SimConfigUpdate = Partial<
    Pick<
        SimConfigDTO,
        "avgPerformance" | "stdDevPerformance" | "runCount" | "state" | "end" | "durationSec" | "converged"
    >
>;

@Injectable()
export class ResultService {
    private _dev: boolean = false;
    private _criteria: ConvergenceCriteria;
    private _logger: Logger = new Logger(ResultService.name);

    constructor(
        private dataSource: DataSource,
        private convergenceTestService: ConvergenceTestService,
        private modelService: ModelService
    ) {
        const env = environment();
        this._dev = env.root.dev;
        this._criteria = {
            minSamples: env.options.minSimRuns,
            maxSamples: env.options.maxSimRuns ?? 1000,
            relativeError: env.options.convergenceMargin,
            absoluteError: env.options.convergenceAbsoluteError ?? 0
        };
    }

    /**
     * Records a result posted by a node and updates the simConfig statistics and convergence, then the upstream
     * convergence test and optimiser state.
     *
     * @remarks
     * - Idempotent per dispatch ticket: a result re-posted with the same `runId` returns the stored result.
     * - The simConfig row is locked for the whole transaction, so concurrent posts for the same simConfig are
     *   serialised and `runCount` and the statistics are computed from all committed results.
     * - A result for a simConfig that has already converged is stored and flagged `late`, but excluded from the
     *   statistics and does not re-run convergence or optimiser logic.
     * - The transaction is retried on deadlocks and lock wait timeouts.
     */
    async create(resultDto: ResultDTO): Promise<ResultDTO> {
        return withTransactionRetry(this.dataSource, async (tEntityManager: EntityManager) => {
            // lock the simConfig row first (no joins, so only this row is locked): posts for the same simConfig,
            // including a re-post of the same run, are serialised from here on
            const locked: SimConfig = await tEntityManager.getRepository(SimConfig).findOneOrFail({
                where: { id: resultDto.simConfigId },
                lock: { mode: "pessimistic_write" },
                loadEagerRelations: false
            });

            // idempotency: a result for this dispatch ticket already exists
            if (resultDto.runId !== undefined && resultDto.runId !== null) {
                const existing = await tEntityManager.getRepository(Result).findOne({ where: { runId: resultDto.runId } });
                if (existing) {
                    if (this._dev) this._logger.log(`Result for run ${resultDto.runId} already recorded`);
                    return existing;
                }
            }

            const simConfig: SimConfig = await tEntityManager.getRepository(SimConfig).findOneOrFail({
                where: { id: locked.id },
                relations: { orgConfig: { configuratorParams: true }, convergenceTest: true }
            });

            if (resultDto.runId !== undefined && resultDto.runId !== null) {
                const run: Run | null = await tEntityManager.getRepository(Run).findOne({ where: { id: resultDto.runId } });
                if (!run || run.simConfigId !== simConfig.id) {
                    throw new BadRequestException(`Run ${resultDto.runId} does not belong to simConfig ${simConfig.id}`);
                }
            }

            const late: boolean = simConfig.converged === true;
            if (this._dev) this._logger.log(late ? "Recording late result" : "Creating result object");
            const { stateSpace, id, ...resultFields } = resultDto as any;
            const result: Result = await tEntityManager.getRepository(Result).save({
                ...resultFields,
                runId: resultDto.runId ?? null,
                late: late,
                orgConfigId: simConfig.orgConfig.id,
                modelName: simConfig.orgConfig.configuratorParams.modelName,
                configuratorName: simConfig.orgConfig.configuratorParams.configuratorName,
                configuratorParams: JSON.parse(JSON.stringify(simConfig.orgConfig.configuratorParams)),
                agentCount: simConfig.orgConfig.agentCount,
                type: simConfig.orgConfig.type,
                priorityIntensity: Utils.modulo(resultDto.priorityTensor),
                performance: this.modelService
                    .getModel(simConfig.orgConfig.configuratorParams.modelName)
                    .getPerformance(resultDto),
                simConfigId: simConfig.id
            } as Result);
            if (resultDto.runId !== undefined && resultDto.runId !== null) {
                await tEntityManager
                    .getRepository(Run)
                    .update(resultDto.runId, { completedAt: new Date(), resultId: result.id });
            }

            // state space, inside the same transaction (a second connection would wait on this transaction's
            // uncommitted result row through the foreign key check and deadlock until the lock wait timeout)
            if (simConfig.saveStateSpace && Array.isArray(stateSpace) && stateSpace.length > 0) {
                await tEntityManager.getRepository(StateSpacePoint).save(
                    stateSpace.map((point: any) => {
                        const { id: pointId, ...pointFields } = point;
                        return { ...pointFields, resultId: result.id };
                    }),
                    { chunk: 1000 }
                );
            }

            if (late) return result;

            // statistics over all committed, non-late results of this simConfig (the row lock serialises posts)
            const stats = await tEntityManager
                .getRepository(Result)
                .createQueryBuilder("result")
                .select("AVG(result.performance)", "avgPerformance")
                .addSelect("STDDEV_SAMP(result.performance)", "stdDevPerformance")
                .addSelect("COUNT(result.id)", "runCount")
                .where("result.simConfigId = :simConfigId", { simConfigId: simConfig.id })
                .andWhere("result.late = :late", { late: false })
                .getRawOne();
            const update: SimConfigUpdate = {
                avgPerformance: stats?.avgPerformance === null ? null : Number(stats.avgPerformance),
                stdDevPerformance: stats?.stdDevPerformance === null ? null : Number(stats.stdDevPerformance),
                runCount: Number(stats?.runCount ?? 0)
            };

            // check for convergence: standard error of the mean performance within tolerance (or the run cap)
            const decision = standardErrorConvergence(
                update.runCount,
                update.avgPerformance,
                update.stdDevPerformance,
                this._criteria
            );
            const converged: boolean = decision.converged;
            if (decision.capped)
                this._logger.warn(`SimConfig ${simConfig.id} stopped at the run cap (${update.runCount} runs)`);
            if (converged) {
                if (this._dev) this._logger.log("Simulation converged. Marking as complete.");
                update.state = States.COMPLETED;
                update.end = new Date();
                update.durationSec = simConfig.start ? (update.end.getTime() - simConfig.start.getTime()) / 1000 : null;
                update.converged = true;
            }
            await tEntityManager.getRepository(SimConfig).update(simConfig.id, update);

            // touch the upstream objects (convergence test, then optimiser states) in the same transaction
            await this.convergenceTestService.touch(simConfig.convergenceTest.id, tEntityManager);
            if (this._dev) this._logger.log("Result " + result.id + " successfully created");
            return result;
        });
    }

    async findAll(paginator: Paginator): Promise<Paginated<ResultDTO>> {
        const repository: Repository<Result> = this.dataSource.getRepository(Result);
        return paginator.run<Result>(repository);
    }

    async findOne(id: number): Promise<ResultDTO> {
        return this.dataSource
            .getRepository(Result)
            .findOneOrFail({
                where: { id: id },
                relations: {
                    simConfig: {
                        orgConfig: true
                    }
                }
            })
            .then((result) => {
                return result;
            });
    }
}
