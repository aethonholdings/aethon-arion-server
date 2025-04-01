import { Injectable, Logger } from "@nestjs/common";
import { DataSource, In, Repository } from "typeorm";
import { ConvergenceTest, OptimiserState, OrgConfig, Result, SimConfig, StateSpacePoint } from "aethon-arion-db";
import { Utils, ResultDTO, States, SimConfigDTO, ConvergenceTestDTO } from "aethon-arion-pipeline";
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
    private _minRuns: number = 10;
    private _convergenceMargin: number = 0.01;
    private _logger: Logger = new Logger(ResultService.name);

    constructor(
        private dataSource: DataSource,
        private convergenceTestService: ConvergenceTestService,
        private modelService: ModelService
    ) {
        const env = environment();
        this._dev = env.root.dev;
        this._minRuns = env.options.minRuns;
        this._convergenceMargin = env.options.convergenceMargin;
    }

    async create(resultDto: ResultDTO): Promise<ResultDTO> {
        let simConfig: SimConfig;
        return this.dataSource.transaction(async (tEntityManager) => {
            // find the simConfig
            return await tEntityManager
                .getRepository(SimConfig)
                .findOneOrFail({
                    where: { id: resultDto.simConfigId },
                    relations: {
                        orgConfig: { configuratorParams: true },
                        convergenceTest: {
                            simConfigParams: true,
                            configuratorParams: true,
                            simConfigs: true,
                            optimiserStates: true
                        },
                        results: true
                    }
                })
                .then(async (simConfigTmp: SimConfig) => {
                    simConfig = simConfigTmp;
                    // ******** RESULT
                    // create the result object
                    if (this._dev) this._logger.log("Creating result object");
                    return tEntityManager.getRepository(Result).save({
                        ...resultDto,
                        orgConfigId: simConfig.orgConfig.id,
                        modelName: simConfig.orgConfig.configuratorParams.modelName,
                        configuratorName: simConfig.orgConfig.configuratorParams.configuratorName,
                        configuratorParams: JSON.parse(JSON.stringify(simConfig.orgConfig.configuratorParams)),
                        agentCount: simConfig.orgConfig.agentCount,
                        priorityIntensity: Utils.modulo(resultDto.priorityTensor),
                        performance: this.modelService
                            .getModel(simConfig.orgConfig.configuratorParams.modelName)
                            .getPerformance(resultDto),
                        simConfig: simConfig
                    });
                })
                .then(async (result: Result) => {
                    if (this._dev) {
                        this._logger.log(`Result object id:${result.id} created`);
                        this._logger.log("Updating simConfig");
                    }
                    // ******** SIMCONFIG
                    // update the simConfig statistics
                    const resultSet = await tEntityManager
                        .getRepository(Result)
                        .createQueryBuilder("result")
                        .select("AVG(result.performance)", "avgPerformance")
                        .addSelect("STDDEV(result.performance)", "stDevPerformance")
                        .where("result.simConfigId = :simConfigId", { simConfigId: simConfig.id })
                        .getRawOne();
                    let update: SimConfigUpdate = {
                        avgPerformance: resultSet.avgPerformance,
                        stdDevPerformance: resultSet.stDevPerformance,
                        runCount: simConfig.runCount + 1
                    };

                    // check for convergence
                    let converged: boolean = false;
                    if (update.runCount >= 2 && update.runCount >= this._minRuns) {
                        if (this._dev) this._logger.log("Checking convergence");
                        if (simConfig.stdDevPerformance > 0) {
                            const percentChange = Math.abs(
                                (simConfig.stdDevPerformance - simConfig.stdDevPerformance) /
                                    simConfig.stdDevPerformance
                            );
                            converged = percentChange < this._convergenceMargin ? true : false;
                        } else {
                            converged = true;
                        }
                    }
                    if (converged) {
                        if (this._dev) this._logger.log("Simulation converged. Marking as complete.");
                        update.state = States.COMPLETED;
                        update.end = new Date();
                        update.durationSec = (update.end.getTime() - simConfig.start.getTime()) / 1000;
                        update.converged = true;
                        simConfig.convergenceTest.completedSimConfigCount++;
                    }

                    // save the simconfig
                    await tEntityManager.getRepository(SimConfig).update(simConfig.id, update);
                    return result;
                })
                .then(async (result: Result) => {
                    if (this._dev) {
                        this._logger.log("SimConfig updated");
                        this._logger.log("Updating convergence test");
                    }
                    // ******** CONVERGENCE TEST
                    this.convergenceTestService.touch(simConfig.convergenceTest);                    
                    return result;
                })
                .then(async (result: Result) => {
                    // ******** OPTIMISER STEP
                    const optimiserStateIdArray: number[] = simConfig.convergenceTest.optimiserStates.map(
                        (optimiserState) => optimiserState.id
                    );
                    const optimiserStates = await tEntityManager.getRepository(OptimiserState).find({
                        where: { id: In(optimiserStateIdArray) },
                        relations: { simSet: true, convergenceTests: true }
                    });
                    if (optimiserStates && optimiserStates.length > 0) {
                        const completedOptimiserStates: OptimiserState[] = [];
                        if (this._dev) this._logger.log("Updating optimiser states");
                        for (let optimiserStateTmp of optimiserStates) {
                            let running: boolean = false;
                            let completed: boolean = true;
                            let converged: boolean = false;
                            for (let convergenceTestTmp of optimiserStateTmp.convergenceTests) {
                                if (convergenceTestTmp.state === States.RUNNING) running = true;
                                if (convergenceTestTmp.state !== States.COMPLETED) completed = false;
                                if (!convergenceTestTmp.converged) converged = false;
                            }
                            if (running) {
                                optimiserStateTmp.status = States.RUNNING;
                            } else if (completed) {
                                optimiserStateTmp.status = States.COMPLETED;
                                optimiserStateTmp.end = new Date();
                                optimiserStateTmp.durationSec =
                                    (optimiserStateTmp.end.getTime() - optimiserStateTmp.start.getTime()) / 1000;
                                optimiserStateTmp.percentComplete = 1;
                                completedOptimiserStates.push(optimiserStateTmp);
                            } else {
                                optimiserStateTmp.status = States.PENDING;
                            }
                            optimiserStateTmp.converged = converged;
                        }
                        await tEntityManager.getRepository(OptimiserState).save(optimiserStates);
                        if (this._dev) this._logger.log("Optimiser states updated");
                        if(completedOptimiserStates.length > 0) {
                            if (this._dev) this._logger.log("Stepping completed optimisers");
                            for(let completedOptimiserState of completedOptimiserStates) {
                                let modelTmp = this.modelService.getModel(completedOptimiserState.modelName);
                                let optimiserTmp = modelTmp.getOptimiser(completedOptimiserState.optimiserName);
                                let newState = optimiserTmp.step(completedOptimiserState);
                            }
                        }
                    }
                    return result;
                })
                .then(async (result: Result) => {
                    if (this._dev) this._logger.log("Convergence test saved");
                    // save the state space if applicable
                    if (simConfig.saveStateSpace && resultDto.stateSpace && resultDto.stateSpace.length > 0) {
                        if (this._dev) this._logger.log("Saving state space");
                        resultDto.stateSpace.forEach((stateSpacePointDto) => {
                            stateSpacePointDto.resultId = result.id;
                        });
                        await this.dataSource
                            .getRepository(StateSpacePoint)
                            .save(resultDto.stateSpace)
                            .then(() => {
                                if (this._dev) this._logger.log("State space saved");
                            });
                    }
                    if (this._dev) this._logger.log("Result " + result.id + " successfully created");
                    return result;
                });
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
