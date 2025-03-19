import environment from "../../../../../env/environment";
import { SimSet } from "aethon-arion-db";
import { SimSetDTO } from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { SimConfigService } from "../sim-config/sim-config.service";
import { ResultService } from "../result/result.service";
import { ModelService } from "../../services/model.service";
import { SimSetDTOCreate } from "../../../../common/dto/sim-set.dto";
import { Comparator, Paginator } from "aethon-nestjs-paginate";

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
        return this.dataSource
            .getRepository(SimSet)
            .find(query)
            .then((simSets: SimSet[]) => {
                return simSets.map((simSet) => simSet.toDTO());
            });
    }

    findOne(id: number): Promise<SimSetDTO> {
        return this.dataSource
            .getRepository(SimSet)
            .findOneOrFail({
                where: { id: id }
            })
            .then((simSet: SimSet) => simSet.toDTO());
    }

    findResults(simSetId: number, paginator: Paginator): Promise<any> {
        if (this._dev) this._logger.log("Fetching SimSet result data");
        paginator.query.where = [["simSetId", Comparator.EQUAL, simSetId.toString()]];
        return this.resultService.findAll(paginator);
    }

    create(simSet: SimSetDTOCreate): Promise<SimSetDTO> {
        const model = this.modelService.getModel(simSet.modelName);
        if (model) {
            const tmp: SimSetDTO = { ...simSet } as SimSetDTO;
            if (!tmp.modelParams) simSet.modelParams = model.getParameters();
            tmp.state = "pending";
            return this.dataSource
                .getRepository(SimSet)
                .save(tmp)
        } else {
            throw new Error("Invalid model name");
        }
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimSet));
    }
}
