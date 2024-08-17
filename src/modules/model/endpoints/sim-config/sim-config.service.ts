import * as fs from "fs";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { OrgConfig, Result, SimConfig, SimSet } from "aethon-arion-db";
import { ResultDTO, SimConfigDTO } from "aethon-arion-pipeline";
import environment from "env/environment";
import { ServerEnvironment } from "src/interfaces/interfaces";
import { paginate, Paginated, PaginateQuery } from "nestjs-paginate";

@Injectable()
export class SimConfigService {
    private _logger: Logger = new Logger(SimConfigService.name);
    private _environment: ServerEnvironment = environment();

    constructor(private dataSource: DataSource) {}

    async seeds(): Promise<number[]> {
        try {
            const seeds = JSON.parse(fs.readFileSync("./data/input/seeds/rand.seeds.json", "utf8")) as number[];
            return seeds;
        } catch (err) {
            this._logger.error(err);
            throw new HttpException("Failed to access seeds data", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async next(nodeId: string): Promise<SimConfigDTO> {
        return this.dataSource
            .getRepository(SimConfig)
            .findOne({
                relations: ["orgConfig", "simSet"],
                where: { converged: false },
                order: { id: "ASC" }
            })
            .then((simConfig) => {
                if (simConfig !== null) {
                    if (this._environment.dev) this._logger.log("Next simconfig fetched");
                    if (simConfig.dispatchedRuns === 0) simConfig.start = new Date();
                    simConfig.dispatchedRuns++;
                    simConfig.simSet.state = "running";
                    simConfig.state = "running";
                    simConfig.simSet.save().then(() => {
                        if (this._environment.dev) this._logger.log("SimSet updated");
                    });
                    simConfig.save().then(() => {
                        if (this._environment.dev) this._logger.log("SimConfig updated");
                    });
                }
                return simConfig;
            })
            .catch((err) => {
                this._logger.error(err);
                throw new HttpException("Failed to define next run", HttpStatus.INTERNAL_SERVER_ERROR);
            });
    }

    findOne(id: number): Promise<SimConfigDTO> {
        return this.dataSource
            .getRepository(SimConfig)
            .findOne({
                relations: ["orgConfig", "simSet"],
                where: { id: id }
            })
            .catch((err) => {
                this._logger.error(err);
                throw new HttpException("Invalid query", HttpStatus.BAD_REQUEST);
            });
    }

    findAll(simSetId: number, paginateQuery: PaginateQuery): Promise<Paginated<SimConfigDTO>> {
        const query = this.dataSource
            .getRepository(SimConfig)
            .createQueryBuilder("simConfig")
            .leftJoinAndSelect("simConfig.orgConfig", "orgConfig")
            .where("simConfig.simSetId = :simSetId", { simSetId: simSetId })
            .addOrderBy("simConfig.avgPerformance", "DESC")
            .setFindOptions({ loadEagerRelations: false, relationLoadStrategy: "query" });
        return paginate(paginateQuery, query, {
            defaultLimit: 100,
            maxLimit: 100,
            loadEagerRelations: false,
            sortableColumns: ["avgPerformance"],
            defaultSortBy: [["avgPerformance", "DESC"]]
        })
            .then((paginated) => {
                return paginated as Paginated<SimConfigDTO>;
            })
            .catch((err) => {
                this._logger.error(err);
                throw new HttpException("Invalid query", HttpStatus.BAD_REQUEST);
            });
    }

    findResults(id: number): Promise<ResultDTO[]> {
        return this.dataSource
            .getRepository(Result)
            .find({
                relations: {
                    simConfig: {
                        orgConfig: true,
                        simSet: true
                    }
                },
                where: { simConfigId: id }
            })
            .catch((err) => {
                this._logger.error(err);
                throw new HttpException("Invalid query", HttpStatus.BAD_REQUEST);
            });
    }

    async create(orgConfigId: number, simSetId: number): Promise<SimConfigDTO> {
        return Promise.allSettled([
            this.dataSource.getRepository(SimSet).findOne({
                where: { id: simSetId }
            }),
            await this.dataSource.getRepository(OrgConfig).findOne({
                where: { id: orgConfigId }
            })
        ])
            .then((results) => {
                if (results[0].status === "fulfilled" && results[1].status === "fulfilled") {
                    const simSet: SimSet = results[0].value;
                    const orgConfig: OrgConfig = results[1].value;
                    simSet.simConfigCount++;
                    return this.dataSource.getRepository(SimConfig).save({
                        simSet: simSet,
                        orgConfig: orgConfig,
                        runCount: 0,
                        dispatchedRuns: 0,
                        randomStreamType: this._environment.randomStreamType,
                        days: this._environment.simulationDays,
                        converged: false,
                        running: false,
                        state: "pending"
                    }) as Promise<SimConfigDTO>; // why is this needed?
                } else {
                    throw new Error("Creating simconfig - failed to create SimSet or OrgConfig");
                }
            })
            .catch((err) => {
                this._logger.error(err);
                throw new HttpException("Invalid query", HttpStatus.BAD_REQUEST);
            });
    }
}
