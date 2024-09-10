import environment from "env/environment";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Result, StateSpacePoint, SimConfig } from "aethon-arion-db";
import { Utils, ResultDTO, ResultSet } from "aethon-arion-pipeline";
import { ServerEnvironment } from "src/interfaces/interfaces";
import { ModelService } from "../../services/model/model.service";

@Injectable()
export class ResultService {
    private _environment: ServerEnvironment;
    private _logger: Logger = new Logger(ResultService.name);

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService
    ) {
        this._environment = environment();
    }

    create(resultDto: ResultDTO): Promise<number> {
        return this.dataSource
            .getRepository(SimConfig)
            .findOneOrFail({
                where: { id: resultDto.simConfigId },
                relations: ["orgConfig", "simSet", "results"]
            })
            .then((simConfig) => {
                // create the result object
                if (this._environment.dev) this._logger.log("Creating result object");
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
                if (this._environment.dev) this._logger.log("Updating simConfig statistics");
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
                if (simConfig.runCount >= 2 && simConfig.runCount >= this._environment.minRuns) {
                    if (this._environment.dev) this._logger.log("Checking convergence");
                    if (currentStdDev > 0) {
                        const percentChange = (simConfig.stdDevPerformance - currentStdDev) / currentStdDev;
                        converged = percentChange < this._environment.convergenceMargin ? true : false;
                    } else {
                        converged = true;
                    }
                }
                if (converged) {
                    simConfig.state = "completed";
                    simConfig.simSet.state = "completed";
                    if (!simConfig.converged) {
                        simConfig.simSet.completedSimConfigCount++;
                        simConfig.end = new Date();
                        simConfig.durationSec = (simConfig.end.getTime() - simConfig.start.getTime()) / 1000;
                    }
                }

                // save the simConfig
                if (this._environment.dev) this._logger.log("Saving result");
                return Promise.all([simConfig.save(), simConfig.simSet.save(), result.save()]);
            })
            .then(([simConfig, simSet, result]) => {
                // save the state space if applicable
                if (this._environment.dev) this._logger.log("Result saved with id: " + result.id);
                if (this._environment?.storeStateSpace) {
                    if (this._environment.dev) this._logger.log("Saving state space asyncronously");
                    resultDto.stateSpace.forEach((stateSpacePointDto) => {
                        stateSpacePointDto.resultId = result.id;
                    });
                    this.dataSource
                        .getRepository(StateSpacePoint)
                        .save(resultDto.stateSpace)
                        .then(() => {
                            if (this._environment.dev) this._logger.log("State space saved");
                        });
                }
                if (this._environment.dev) this._logger.log("Result " + result.id + " successfully created");
                return result.id;
            })
            .catch((err) => {
                throw this.modelService.badRequest(err, this._logger);
            });
    }

    findAll(params: { simSetId?: number; simConfigId?: number }): Promise<ResultDTO[]> {
        try {
            return this.dataSource.getRepository(Result).find({
                where: {
                    simSetId: params.simSetId,
                    simConfigId: params.simConfigId
                }
            });
        } catch (err) {
            throw this.modelService.badRequest(err, this._logger);
        }
    }

    findOne(id: number): Promise<ResultDTO> {
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
            throw this.modelService.badRequest(err, this._logger);
        }
    }
}
