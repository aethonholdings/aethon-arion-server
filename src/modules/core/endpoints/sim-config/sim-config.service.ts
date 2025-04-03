import { Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Result, SimConfig } from "aethon-arion-db";
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

    constructor(
        private dataSource: DataSource,
        private convergenceTestService: ConvergenceTestService,
        private modelService: ModelService
    ) {
        const env = environment();
        this._dev = env.root.dev;
    }

    next(nodeId: string): Promise<SimConfigDTO> {
        this._logger.log(`Next simconfig requested by node ${nodeId}`);

        return this.dataSource
            .getRepository(SimConfig)
            .findOne({
                relations: {
                    orgConfig: {
                        configuratorParams: true
                    },
                    convergenceTest: true
                },
                where: { converged: false },
                order: { convergenceTestId: "ASC", id: "ASC" }
            })
            .then((simConfig) => {
                if (simConfig) {
                    if (this._dev) this._logger.log("Next simconfig fetched");
                    if (simConfig.dispatchedRuns === 0) simConfig.start = new Date();
                    simConfig.dispatchedRuns++;
                    simConfig.state = States.RUNNING;
                    return this.dataSource.getRepository(SimConfig).save(simConfig);
                }
                return simConfig;
            })
            .then((simConfig) => {
                if (simConfig) {
                    if (this._dev) this._logger.log("SimConfig updated");
                    this.convergenceTestService.touch(simConfig.convergenceTest.id);
                }
                return simConfig;
            });
    }

    findOne(id: number): Promise<SimConfigDTO> {
        return this.dataSource.getRepository(SimConfig).findOne({
            relations: ["orgConfig", "simSet", "simConfigParams"],
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
