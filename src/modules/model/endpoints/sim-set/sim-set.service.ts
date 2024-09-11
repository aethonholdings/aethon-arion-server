import environment from "../../../../../env/environment";
import { SimSet } from "aethon-arion-db";
import { SimConfigDTO, SimSetDTO } from "aethon-arion-pipeline";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { SimConfigService } from "../sim-config/sim-config.service";
import { ServerEnvironment } from "../../../../../src/interfaces/interfaces";
import { Paginated, PaginateQuery } from "nestjs-paginate";
import { ResultService } from "../result/result.service";
import { ModelService } from "../../services/model/model.service";

@Injectable()
export class SimSetService {
    private _logger: Logger = new Logger(SimSetService.name);
    private _environment: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private simConfigService: SimConfigService,
        private resultService: ResultService,
        private modelService: ModelService
    ) {}

    findAll(query: any): Promise<SimSetDTO[]> {
        return this.dataSource
            .getRepository(SimSet)
            .find(query)
            .catch((err) => {
                throw this.modelService.error(err, this._logger);
            });
    }

    findOne(id: number): Promise<SimSetDTO> {
        return this.dataSource
            .getRepository(SimSet)
            .findOneOrFail({
                relations: ["simConfigs"],
                where: { id: id }
            })
            .catch((err) => {
                throw this.modelService.error(err, this._logger, err.message, HttpStatus.NOT_FOUND);
            });
    }

    findSimConfigs(id: number, paginateQuery: PaginateQuery): Promise<Paginated<SimConfigDTO>> {
        return this.simConfigService.findAll(id, paginateQuery).catch((err) => {
            throw this.modelService.error(err, this._logger);
        });
    }

    findResults(id: number): Promise<any> {
        if (this._environment.dev) this._logger.log("Fetching result data for SimSet " + id);
        return this.resultService.findAll({ simSetId: id }).catch((err) => {
            throw this.modelService.error(err, this._logger);
        });
    }

    create(simSet: SimSetDTO): Promise<SimSetDTO> {
        try {
            if (this.modelService.getModelNames().includes(simSet.type)) {
                return this.dataSource.getRepository(SimSet).save(simSet);
            } else {
                throw new Error("Invalid model type");
            }
        } catch (err) {
            throw this.modelService.error(err, this._logger);
        }
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimSet));
    }
}
