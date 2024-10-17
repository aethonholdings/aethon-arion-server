import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Result, StateSpacePoint, SimConfig } from "aethon-arion-db";
import { Utils, ResultDTO, ResultSet } from "aethon-arion-pipeline";
import { ModelService } from "../../services/model/model.service";
import { paginate, PaginateConfig, Paginated, PaginateQuery } from "nestjs-paginate";
import environment from "../../../../../env/environment";

export const resultPaginationConfig: PaginateConfig<Result> = {
    defaultLimit: 1000,
    maxLimit: 1000,
    loadEagerRelations: false,
    sortableColumns: ["performance"],
    defaultSortBy: [["performance", "DESC"]]
};

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
                return Promise.all([simConfig.save(), simConfig.simSet.save(), result.save()]).then((resultArray) => {
                    return resultArray;
                });
            })
            .then(([simConfig, simSet, result]) => {
                // save the state space if applicable
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
            })
            .catch((err) => {
                throw this.modelService.error(err, this._logger);
            });
    }

    async findAll(
        params: { simSetId?: number; simConfigId?: number }
    ): Promise<ResultDTO[]> {
        try {
            let query = this.dataSource.getRepository(Result).createQueryBuilder();
            if (params.simSetId) query = query.andWhere("simSetId = :simSetId", { simSetId: params.simSetId });
            if (params.simConfigId)
                query = query.andWhere("simConfigId = :simConfigId", { simConfigId: params.simConfigId });
            
            return query.execute();
        } catch (err) {
            throw this.modelService.error(err, this._logger);
        }
    }

    async findOne(id: number): Promise<ResultDTO> {
        try {
            return this.dataSource.getRepository(Result).findOneOrFail({
                where: { id: id },
                relations: {
                    simConfig: {
                        orgConfig: true
                    }
                }
            });
        } catch (err) {
            throw this.modelService.error(err, this._logger);
        }
    }
}
