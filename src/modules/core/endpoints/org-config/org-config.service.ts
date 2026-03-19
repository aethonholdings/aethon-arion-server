import { OrgConfig, SimConfig } from "aethon-arion-db";
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

    create(
        configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParamData>,
        tEntityManager?: EntityManager
    ): Promise<OrgConfig> {
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        const model = this.modelService.getModel(configuratorParamsDTO.modelName);
        const configuratorName = configuratorParamsDTO.configuratorName || model.getDefaultConfigurator().name;
        return tEntityManager.getRepository(OrgConfig).save({
            ...model.getConfigurator(configuratorName).generate(configuratorParamsDTO),
            simConfigs: [],
            configuratorParams: configuratorParamsDTO,
            type: model.name
        });
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
            .getRawMany();
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(OrgConfig));
    }
}
