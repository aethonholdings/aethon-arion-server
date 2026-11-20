import { Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, Repository } from "typeorm";
import { OptimiserState, Result, Run, SimConfig, SimSet } from "aethon-arion-db";
import { withTransactionRetry } from "../../../../common/utils/transaction";
import {
    ConvergenceTestDTO,
    OrgConfigDTO,
    ResultDTO,
    SimConfigDTO,
    SimConfigParamsDTO,
    States
} from "aethon-arion-pipeline";
import { ModelService } from "../../services/model/model.service";
import environment from "../../../../../env/environment";
import { Paginated, Paginator } from "aethon-nestjs-paginate";
import { ConvergenceTestService } from "../../services/convergence-test/convergence-test.service";

@Injectable()
export class SimConfigService {
    private _logger: Logger = new Logger(SimConfigService.name);
    private _dev: boolean = false;
    private _saveStateSpace: boolean = false;

    constructor(
        private dataSource: DataSource,
        private convergenceTestService: ConvergenceTestService,
        private modelService: ModelService
    ) {
        const env = environment();
        this._dev = env.root.dev;
        this._saveStateSpace = env.options.storeStateSpace === true;
    }

    /**
     * Dispatches one run of the next simConfig that needs results to the requesting node.
     *
     * @remarks
     * - Only simConfigs whose convergence test serves at least one active optimiser state of an active SimSet are
     *   dispatched; work orphaned by a deleted, completed or failed SimSet is never handed out.
     * - Dispatch happens in one transaction that locks the simConfig row, so the per-simConfig `runIndex` is unique.
     *   A run ticket (`Run`) is created; its id (`runId`) and `runIndex` are returned with the simConfig. The node
     *   seeds its random streams from (simConfig id, runIndex) and posts the result with `runId`, which makes the
     *   post idempotent.
     */
    async next(nodeId: string): Promise<SimConfigDTO> {
        this._logger.log(`Next simconfig requested by node ${nodeId}`);
        const inactive: string[] = [States.COMPLETED, States.FAILED];

        const dispatched = await withTransactionRetry(this.dataSource, async (tEntityManager: EntityManager) => {
            const candidate = await tEntityManager
                .getRepository(SimConfig)
                .createQueryBuilder("simConfig")
                .select("simConfig.id", "id")
                .innerJoin(
                    "optimiser_state_convergence_tests_convergence_test",
                    "link",
                    "link.convergenceTestId = simConfig.convergenceTestId"
                )
                .innerJoin(OptimiserState, "optimiserState", "optimiserState.id = link.optimiserStateId")
                .innerJoin(SimSet, "simSet", "simSet.id = optimiserState.simSetId")
                .where("simConfig.converged = :converged", { converged: false })
                .andWhere("optimiserState.status NOT IN (:...inactive)", { inactive })
                .andWhere("simSet.state NOT IN (:...inactive)", { inactive })
                .orderBy("simConfig.convergenceTestId", "ASC")
                .addOrderBy("simConfig.id", "ASC")
                .limit(1)
                .getRawOne();
            if (!candidate) return null;

            const simConfig: SimConfig | null = await tEntityManager.getRepository(SimConfig).findOne({
                where: { id: candidate.id, converged: false },
                lock: { mode: "pessimistic_write" },
                loadEagerRelations: false
            });
            if (!simConfig) return null; // converged between the candidate query and the lock

            const runIndex: number = simConfig.dispatchedRuns + 1;
            await tEntityManager.getRepository(SimConfig).update(simConfig.id, {
                dispatchedRuns: runIndex,
                start: simConfig.start ?? new Date(),
                state: States.RUNNING
            });
            const run: Run = await tEntityManager
                .getRepository(Run)
                .save({ simConfigId: simConfig.id, runIndex: runIndex, nodeId: String(nodeId ?? "unknown") });
            return { simConfigId: simConfig.id, runId: run.id, runIndex: runIndex };
        });
        if (!dispatched) return null;

        const simConfig: SimConfig = await this.dataSource.getRepository(SimConfig).findOneOrFail({
            relations: { orgConfig: { configuratorParams: true }, convergenceTest: true },
            where: { id: dispatched.simConfigId }
        });
        if (this._dev) this._logger.log(`SimConfig ${simConfig.id} run ${dispatched.runIndex} dispatched`);

        // update the upstream statistics; a failure here must not prevent the node from receiving its job
        try {
            await withTransactionRetry(this.dataSource, (tEntityManager: EntityManager) =>
                this.convergenceTestService.touch(simConfig.convergenceTest.id, tEntityManager)
            );
        } catch (error) {
            this._logger.error(
                `Convergence test touch failed after dispatching simConfig ${simConfig.id}: ${error?.message || error}`
            );
        }
        return { ...simConfig, runId: dispatched.runId, runIndex: dispatched.runIndex } as SimConfigDTO;
    }

    findOne(id: number): Promise<SimConfigDTO> {
        return this.dataSource.getRepository(SimConfig).findOneOrFail({
            relations: {
                orgConfig: true,
                simConfigParams: true,
                convergenceTest: {
                    optimiserStates: {
                        simSet: true
                    }
                }
            },
            where: { id: id }
        });
    }

    findAll(paginator: Paginator): Promise<Paginated<SimConfigDTO>> {
        const source: Repository<SimConfig> = this.dataSource.getRepository(SimConfig);
        return paginator.run<SimConfig>(source).then((paginated: Paginated<SimConfig>) => {
            const tmp: Paginated<SimConfigDTO> = {
                ...paginated,
                data: paginated.data.map((simConfig) => {
                    return simConfig;
                })
            };
            return tmp;
        });
    }

    findResults(id: number): Promise<ResultDTO[]> {
        return this.dataSource
            .getRepository(Result)
            .find({
                relations: {
                    simConfig: {
                        orgConfig: true,
                        simConfigParams: true
                    }
                },
                where: { simConfigId: id }
            })
            .then((results: Result[]) => {
                return results.map((result) => result);
            });
    }

    create(
        simConfigParamsDTO: SimConfigParamsDTO,
        orgConfigDTO: OrgConfigDTO,
        convergenceTestDTO: ConvergenceTestDTO,
        tEntityManager?: EntityManager
    ): Promise<SimConfig> {
        // ****** SIM CONFIGS
        // generate the sim configs required for each convergence test
        if (this._dev) this._logger.log(`Creating sim configs`);
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        if (
            simConfigParamsDTO.id === convergenceTestDTO.simConfigParams.id &&
            convergenceTestDTO.configuratorParams.id === orgConfigDTO.configuratorParams.id
        ) {
            return tEntityManager.getRepository(SimConfig).save({
                orgConfig: orgConfigDTO,
                state: States.PENDING,
                results: [],
                simConfigParams: simConfigParamsDTO,
                convergenceTest: convergenceTestDTO,
                dispatchedRuns: 0,
                runCount: 0,
                saveStateSpace: this._saveStateSpace,
                days: simConfigParamsDTO.days,
                randomStreamType: simConfigParamsDTO.randomStreamType
            });
        }
        throw new Error(`Inconsistent simConfigParams or orgConfigParams with convergenceTest in OrgConfig generation`);
    }

    delete(id: number): Promise<number> {
        const repository = this.dataSource.getRepository(SimConfig);
        // adjust the simset simconfig counter
        return repository.findOneOrFail({ where: { id: id } }).then(() => {
            return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimConfig));
        });
    }
}
