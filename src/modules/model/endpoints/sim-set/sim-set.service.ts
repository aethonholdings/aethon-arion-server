import { SimSet } from "aethon-arion-db";
import { ConfiguratorParamsDTO, SimConfigDTO, SimSetDTO } from "aethon-arion-pipeline";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DataSource, DeleteResult } from "typeorm";
import { OrgConfigService } from "../org-config/org-config.service";
import { SimConfigService } from "../sim-config/sim-config.service";
import environment from "env/environment";
import { ServerEnvironment } from "src/interfaces/interfaces";
import { Paginated, PaginateQuery } from 'nestjs-paginate';
import { ResultService } from "../result/result.service";

@Injectable()
export class SimSetService {
    private _logger: Logger = new Logger(SimSetService.name);
    private _environment: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private orgConfigService: OrgConfigService,
        private simConfigService: SimConfigService,
        private resultService: ResultService
    ) {}

    findAll(query: any): Promise<SimSetDTO[]> {
        return this.dataSource
            .getRepository(SimSet)
            .find(query)
            .catch((err) => {
                this._logger.log(err);
                throw new HttpException("Invalid query", HttpStatus.BAD_REQUEST);
            });
    }

    findOne(id: number): Promise<SimSetDTO> {
        return this.dataSource
            .getRepository(SimSet)
            .findOne({
                relations: ["simConfigs"],
                where: { id: id }
            })
            .catch((err) => {
                this._logger.log(err);
                throw new HttpException("Invalid query", HttpStatus.BAD_REQUEST);
            });
    }

    findSimConfigs(id: number, paginateQuery: PaginateQuery): Promise<Paginated<SimConfigDTO>> {
        return this.simConfigService.findAll(id, paginateQuery);
    }

    findResults(id: number): Promise<any> {
        if (this._environment.dev)
            this._logger.log("Fetching result data for SimSet " + id);
        return this.resultService.findAll({ simSetId: id });
    }

    create(simSet: SimSetDTO): Promise<SimSetDTO> {
        try {
            return this.dataSource.getRepository(SimSet).save(simSet);
        } catch (err) {
            this._logger.log(err);
            throw new HttpException("Could not create SimSet", HttpStatus.BAD_REQUEST);
        }
    }

    generateSimConfig(simSetId: number, configuratorParamDTO: ConfiguratorParamsDTO): Promise<SimConfigDTO> {
        return this.dataSource
            .getRepository(SimSet)
            .findOne({ where: { id: simSetId } })
            .then((simSet) => {
                return Promise.all([this.orgConfigService.create(configuratorParamDTO), simSet]);
            })
            .then(([orgConfig, simSet]) => {
                simSet.simConfigCount++;
                return Promise.all([simSet.save(), orgConfig]);
            })
            .then(([simSet, orgConfig]) => {
                return this.simConfigService.create(orgConfig.id, simSet.id);
            })
            .catch((err) => {
                this._logger.log(err);
                throw new HttpException("Invalid query", HttpStatus.BAD_REQUEST);
            });
    }

    delete(id: number): Promise<DeleteResult> {
        return this.dataSource
            .getRepository(SimSet)
            .delete(id)
            .catch((err) => {
                this._logger.log(err);
                throw new HttpException("Could not delete SimSet", HttpStatus.BAD_REQUEST);
            });
    }
}
