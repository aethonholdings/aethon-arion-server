import { Injectable, Logger } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { OrgConfig, Result, SimConfig, SimConfigParams, SimSet } from "aethon-arion-db";
import { OrgConfigDTO, ResultDTO, SimConfigDTO, SimConfigParamsDTO, SimSetDTO, States } from "aethon-arion-pipeline";
import { ModelService } from "../../services/model/model.service";
import { SimConfigDTOCreate } from "../../../../common/dto/sim-config.dto";
import environment from "../../../../../env/environment";
import { Paginated, Paginator } from "aethon-nestjs-paginate";

@Injectable()
export class SimConfigService {
    private _logger: Logger = new Logger(SimConfigService.name);
    private _dev: boolean = false;
    private _randomStreamType: "static" | "random" = "random"; // toDo: type to RandomStreamType
    private _simulationDays = 100;

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService
    ) {
        const env = environment();
        this._dev = env.root.dev;
        this._randomStreamType = env.options.randomStreamType;
        this._simulationDays = env.options.simulationDays;
    }

    next(nodeId: string): Promise<SimConfigDTO> {
        this._logger.log(`Next simconfig requested by node ${nodeId}`);
        return this.dataSource
            .getRepository(SimConfig)
            .findOne({
                relations: {
                    orgConfig: {
                        configuratorParams: true
                    }
                },
                where: { converged: false },
                order: { id: "ASC" }
            })
            .then((simConfig) => {
                if (simConfig !== null) {
                    if (this._dev) this._logger.log("Next simconfig fetched");
                    if (simConfig.dispatchedRuns === 0) simConfig.start = new Date();
                    simConfig.dispatchedRuns++;
                    simConfig.state = "running";
                    return simConfig.save().then((simConfig) => {
                        if (this._dev) this._logger.log("SimConfig updated");
                        return simConfig.toDTO();
                    });
                }
            });
    }

    findOne(id: number): Promise<SimConfigDTO> {
        return this.dataSource
            .getRepository(SimConfig)
            .findOne({
                relations: ["orgConfig", "simSet", "simConfigParams"],
                where: { id: id }
            })
            .then((simConfig) => {
                return simConfig.toDTO();
            });
    }

    findAll(paginator: Paginator): Promise<Paginated<SimConfigDTO>> {
        const source: Repository<SimConfig> = this.dataSource.getRepository(SimConfig);
        return paginator.run<SimConfig>(source).then((paginated: Paginated<SimConfig>) => {
            const tmp: Paginated<SimConfigDTO> = {
                ...paginated,
                data: paginated.data.map((simConfig) => {
                    return simConfig.toDTO();
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
                return results.map((result) => result.toDTO());
            });
    }

    // THIS BIT WILL CRASH
    create(orgConfigDTO: OrgConfigDTO, simConfigParmsDTO: SimConfigParamsDTO): Promise<SimConfigDTO> {
        const queries = Promise.all([
            this.dataSource.getRepository(SimConfigParams).findOneOrFail({ where: { id: simConfigParmsDTO.id } }),
            this.dataSource
                .getRepository(OrgConfig)
                .findOneOrFail({ where: { id: orgConfigDTO.id }, relations: { configuratorParams: true } })
        ]);

        return queries
            .then(([simConfigParams, orgConfig]) => {
                if (simConfigParams && orgConfig) {
                    return this.dataSource.getRepository(SimConfig).save({
                        orgConfig: orgConfig,
                        runCount: 0,
                        dispatchedRuns: 0,
                        randomStreamType: simConfigParams.randomStreamType
                            ? simConfigParams.randomStreamType
                            : this._randomStreamType,
                        days: simConfigParams.days ? simConfigParams.days : this._simulationDays,
                        converged: false,
                        running: false,
                        saveStateSpace: false,
                        state: States.PENDING,
                        simConfigParams: simConfigParams,
                    });
                } else {
                    throw new Error("Incompatible model signature with SimSet");
                }
            })
            .then((results) => {
                return results[0];
            });
    }

    delete(id: number): Promise<number> {
        const repository = this.dataSource.getRepository(SimConfig);
        // adjust the simset simconfig counter
        return repository
            .findOneOrFail({ where: { id: id } })
            .then(() => {
                return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimConfig));
            });
    }
}
