import environment from "../../../../../env/environment";
import { OptimiserState, SimSet } from "aethon-arion-db";
import { SimSetDTO, States } from "aethon-arion-pipeline";
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
                where: { id: id },
                relations: { optimiserStates: true }
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
            // this is a long-winded commit to the database, but a more efficient approach fails on TypeORM
            // keepign this as is until improved using the query builder

            // Create the SimSet with an empty optimiserStates array
            const simSet: SimSet = await this.dataSource.getRepository(SimSet).save({
                ...simSetDTO,
                modelParams: model.getParameters(),
                optimiserName: model.getDefaultOptimiser().name,
                state: States.PENDING,
                optimiserStates: []
            });

            // Create the OptimiserState and attach it to the SimSet
            const optimiserState: OptimiserState = await this.dataSource.getRepository(OptimiserState).save({
                ...model.getDefaultOptimiser().step(),
                stepCount: 0,
                simSet: simSet,
                start: new Date(),
                status: States.PENDING,
                percentComplete: 0,
                modelName: model.name,
                optimiserName: model.getDefaultOptimiser().name,
                converged: false
            });

            // Return the new SimSet
            return this.findOne(simSet.id);
        } else {
            throw new Error("Invalid model name");
        }
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimSet));
    }
}
