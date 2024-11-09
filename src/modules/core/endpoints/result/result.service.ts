import { Injectable, Logger } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Result, StateSpacePoint, SimConfig } from "aethon-arion-db";
import { Utils, ResultDTO, ResultSet } from "aethon-arion-pipeline";
import { ModelService } from "../../services/model.service";
import environment from "../../../../../env/environment";
import { Paginated, Paginator } from "aethon-nestjs-paginate";

@Injectable()
export class ResultService {
    private _dev: boolean = false;
    private _storeStateSpace: boolean = false;
    private _minRuns: number = 10;
    private _convergenceMargin: number = 0.01;
    private _logger: Logger = new Logger(ResultService.name);

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService
    ) {
        const env = environment();
        this._dev = env.root.dev;
        this._storeStateSpace = env.options.storeStateSpace;
        this._minRuns = env.options.minRuns;
    }

    async create(resultDto: ResultDTO): Promise<ResultDTO> {
        return this.dataSource
            .getRepository(SimConfig)
            .findOneOrFail({
                where: { id: resultDto.simConfigId },
                relations: ["orgConfig", "simSet", "results"]
            })
            .then((simConfig) => {
                // create the result object
                if (this._dev) this._logger.log("Creating result object");
                const result = Result.create(resultDto);
                result.orgConfigId = simConfig.orgConfig.id;
                result.simSetId = simConfig.simSet.id;
                result.agentCount = simConfig.orgConfig.agentCount;
                result.configuratorName = simConfig.orgConfig.configuratorParams.configuratorName;
                result.configuratorParams = simConfig.orgConfig.configuratorParams;
                result.orgConfigType = simConfig.orgConfig.type;
                simConfig.results.push(result);
                result.priorityIntensity = Utils.modulo(resultDto.priorityTensor);
                result.performance = this.modelService.calculatePerformance(simConfig, result);
                // update the simConfig statistics
                if (this._dev) this._logger.log("Updating simConfig statistics");
                const resultSet = new ResultSet(simConfig.results);
                const summaryStatistics = resultSet.getSummary();
                simConfig.avgPerformance = summaryStatistics.avgPerformance;
                const currentStdDev = simConfig.stdDevPerformance;
                simConfig.stdDevPerformance = summaryStatistics.stDevPerformance;
                simConfig.entropy = summaryStatistics.entropy;
                simConfig.runCount++;
                simConfig.simSet.completedRunCount++;
                // check for convergence
                let converged: boolean = false;
                if (simConfig.runCount >= 2 && simConfig.runCount >= this._minRuns) {
                    if (this._dev) this._logger.log("Checking convergence");
                    if (currentStdDev > 0) {
                        const percentChange = Math.abs((simConfig.stdDevPerformance - currentStdDev) / currentStdDev);
                        converged = percentChange < this._convergenceMargin ? true : false;
                    } else {
                        converged = true;
                    }
                }
                if (converged) {
                    if (this._dev) this._logger.log("Simulation converged");
                    simConfig.state = "completed";
                    simConfig.simSet.state = "completed";
                    if (!simConfig.converged) {
                        if (this._dev) this._logger.log("Marking as completed");
                        simConfig.end = new Date();
                        simConfig.durationSec = (simConfig.end.getTime() - simConfig.start.getTime()) / 1000;
                        simConfig.simSet.completedSimConfigCount++;
                        simConfig.converged = true;
                    }
                }

                // save everything
                if (this._dev) this._logger.log("Saving result");
                return Promise.all([simConfig.save(), simConfig.simSet.save(), result.save()]);
            })
            .then((results) => {
                // save the state space if applicable
                const result = results[2];
                if (this._dev) this._logger.log("Result saved with id: " + result.id);
                if (this._storeStateSpace && resultDto.stateSpace && resultDto.stateSpace.length > 0) {
                    if (this._dev) this._logger.log("Saving state space asyncronously");
                    resultDto.stateSpace.forEach((stateSpacePointDto) => {
                        stateSpacePointDto.resultId = result.id;
                    });
                    this.dataSource
                        .getRepository(StateSpacePoint)
                        .save(resultDto.stateSpace)
                        .then(() => {
                            if (this._dev) this._logger.log("State space saved");
                        });
                }
                if (this._dev) this._logger.log("Result " + result.id + " successfully created");
                return result;
            });
    }

    async findAll(paginator: Paginator): Promise<Paginated<ResultDTO>> {
        const repository: Repository<Result> = this.dataSource.getRepository(Result);
        return paginator.run<Result>(repository).then((results) => results as Paginated<ResultDTO>);
    }

    async findOne(id: number): Promise<ResultDTO> {
        return this.dataSource.getRepository(Result).findOneOrFail({
            where: { id: id },
            relations: {
                simConfig: {
                    orgConfig: true
                }
            }
        });
    }
}
