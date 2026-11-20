import { OrgConfig, SimConfig, SimConfigParams } from "aethon-arion-db";
import { newBaseSeed, orgConfigSeed } from "../../../../common/utils/convergence";
import { ConfiguratorParamData, ConfiguratorParamsDTO, OrgConfigDTO } from "aethon-arion-pipeline";
import { OrgConfigSummaryDTO } from "src/common/dto/org-config.dto";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { ModelService } from "../../services/model/model.service";
import { ServerEnvironment } from "src/common/types/server.types";
import environment from "env/environment";

@Injectable()
export class OrgConfigService {
    private _dev: boolean = false;
    private _logger: Logger = new Logger(OrgConfigService.name);
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService
    ) {
        this._dev = this._env.root.dev;
    }

    findOne(id: number): Promise<OrgConfigDTO> {
        return this.dataSource.getRepository(OrgConfig).findOneOrFail({
            where: { id: id },
            relations: { simConfigs: { simConfigParams: true }, configuratorParams: true }
        });
    }

    findAll(type?: string): Promise<OrgConfigDTO[]> {
        return this.dataSource
            .getRepository(OrgConfig)
            .find({ where: { configuratorParams: { modelName: type } }, relations: { configuratorParams: true } });
    }

    /**
     * Generates and stores an org config. With a replicate index, the configurator's random draws are seeded from
     * (base seed, replicate), so replicate k of every optimiser point shares its draws (common random numbers).
     */
    async create(
        configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParamData>,
        tEntityManager?: EntityManager,
        replicate?: number,
        baseSeed?: number
    ): Promise<OrgConfig> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        const model = this.modelService.getModel(configuratorParamsDTO.modelName);
        const configuratorName = configuratorParamsDTO.configuratorName || model.getDefaultConfigurator().name;
        const seed: number | undefined = replicate !== undefined ? orgConfigSeed(baseSeed, replicate) : undefined;
        return tEntityManager.getRepository(OrgConfig).save({
            ...model.getConfigurator(configuratorName).generate(configuratorParamsDTO, seed),
            replicate: replicate ?? null,
            simConfigs: [],
            configuratorParams: configuratorParamsDTO,
            type: model.name
        });
    }

    /**
     * The base seed of the simulation parameters, assigned on first use (0 for "static", a random draw for
     * "random"); a conditional update keeps concurrent first uses consistent.
     */
    async baseSeed(simConfigParamsId: number, tEntityManager?: EntityManager): Promise<number> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        const repository = tEntityManager.getRepository(SimConfigParams);
        const params: SimConfigParams = await repository.findOneByOrFail({ id: simConfigParamsId });
        if (params.seed !== null && params.seed !== undefined) return params.seed;
        await repository
            .createQueryBuilder()
            .update(SimConfigParams)
            .set({ seed: newBaseSeed(params.randomStreamType) })
            .where("id = :id", { id: simConfigParamsId })
            .andWhere("seed IS NULL")
            .execute();
        return (await repository.findOneByOrFail({ id: simConfigParamsId })).seed;
    }

    findRunning(): Promise<OrgConfigDTO[]> {
        return this.dataSource
            .getRepository(OrgConfig)
            .createQueryBuilder('orgConfig')
            .leftJoinAndSelect('orgConfig.simConfigs', 'simConfig')
            .leftJoinAndSelect('orgConfig.configuratorParams', 'configuratorParams')
            .where(qb => {
                const sub = qb.subQuery()
                    .select('sc.orgConfigId')
                    .from(SimConfig, 'sc')
                    .where('sc.state = :state')
                    .getQuery();
                return 'orgConfig.id IN ' + sub;
            })
            .setParameter('state', 'running')
            .getMany();
    }

    findByAgentCount(agentCount: number): Promise<OrgConfigDTO[]> {
        return this.dataSource.getRepository(OrgConfig).find({
            where: { agentCount },
            relations: { simConfigs: true, configuratorParams: true }
        });
    }

    getSummary(): Promise<OrgConfigSummaryDTO[]> {
        return this.dataSource.getRepository(OrgConfig)
            .createQueryBuilder('orgConfig')
            .select('orgConfig.agentCount', 'agentCount')
            .addSelect('COUNT(DISTINCT orgConfig.id)', 'orgConfigCount')
            .addSelect('AVG(simConfig.avgPerformance)', 'avgPerformance')
            .addSelect('MAX(simConfig.avgPerformance)', 'bestPerformance')
            .addSelect('STDDEV(simConfig.avgPerformance)', 'stdDevPerformance')
            .leftJoin('orgConfig.simConfigs', 'simConfig')
            .groupBy('orgConfig.agentCount')
            .orderBy('orgConfig.agentCount', 'ASC')
            .getRawMany()
            // the MySQL driver returns aggregates (COUNT, AVG of decimals) as strings; return numbers
            .then((rows: any[]) =>
                rows.map((row) => ({
                    agentCount: Number(row.agentCount),
                    orgConfigCount: Number(row.orgConfigCount),
                    avgPerformance: row.avgPerformance === null ? null : Number(row.avgPerformance),
                    bestPerformance: row.bestPerformance === null ? null : Number(row.bestPerformance),
                    stdDevPerformance: row.stdDevPerformance === null ? null : Number(row.stdDevPerformance)
                }))
            );
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(OrgConfig));
    }
}
