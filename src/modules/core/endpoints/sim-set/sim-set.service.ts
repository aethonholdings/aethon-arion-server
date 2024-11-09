import environment from "../../../../../env/environment";
import { SimSet } from "aethon-arion-db";
import { SimConfigDTO, SimSetDTO } from "aethon-arion-pipeline";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { SimConfigService } from "../sim-config/sim-config.service";
import { ResultService } from "../result/result.service";
import { ModelService } from "../../services/model.service";
import { SimSetDTOCreate } from "../../dto/sim-set.dto";
import { Comparator, Paginated, Paginator } from "aethon-nestjs-paginate";

@Injectable()
export class SimSetService {
    private _logger: Logger = new Logger(SimSetService.name);
    private _dev: boolean = false;

    constructor(
        private dataSource: DataSource,
        private simConfigService: SimConfigService,
        private resultService: ResultService,
        private modelService: ModelService
    ) {
        this._dev = environment().root.dev;
    }

    findAll(query: any): Promise<SimSetDTO[]> {
        return this.dataSource.getRepository(SimSet).find(query);
    }

    findOne(id: number): Promise<SimSetDTO> {
        return this.dataSource.getRepository(SimSet).findOneOrFail({
            relations: ["simConfigs"],
            where: { id: id }
        });
    }

    findSimConfigs(id: number, paginator: Paginator): Promise<Paginated<SimConfigDTO>> {
        if (this._dev) this._logger.log("Fetching SimSet config data");
        paginator.query.where = [["simSetId", Comparator.EQUAL, id.toString()]];
        return this.simConfigService.findAll(paginator);
    }

    findResults(simSetId: number, paginator: Paginator): Promise<any> {
        if (this._dev) this._logger.log("Fetching SimSet result data");
        paginator.query.where = [["simSetId", Comparator.EQUAL, simSetId.toString()]];
        return this.resultService.findAll(paginator);
    }

    create(simSet: SimSetDTOCreate): Promise<SimSetDTO> {
        if (this.modelService.getModelNames().includes(simSet.type)) {
            return this.dataSource.getRepository(SimSet).save(simSet);
        } else {
            throw new Error("Invalid model type");
        }
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimSet));
    }
}
