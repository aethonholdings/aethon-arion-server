import environment from "../../../../../env/environment";
import { SimSet } from "aethon-arion-db";
import { SimSetDTO } from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
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

    async create(simSetDTO: SimSetDTOCreate): Promise<SimSetDTO> {
        const model = this.modelService.getModel(simSetDTO.modelName);
        if (model) {
            // Create a new SimSet record
            const simSet: SimSet = await this.dataSource.getRepository(SimSet).save({
                ...simSetDTO,
                modelParams: simSetDTO.modelParams ? simSetDTO.modelParams : model.getParameters(),
                optimiserName: simSetDTO.optimiserName ? simSetDTO.optimiserName : model.getDefaultOptimiser().name,
                state: "pending"
            });

            // initialise the optimiser
            return simSet;
        } else {
            throw new Error("Invalid model name");
        }
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimSet));
    }
}
