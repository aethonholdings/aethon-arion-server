import { StateSpacePoint } from "aethon-arion-db";
import { StateSpacePointDTO } from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ModelService } from "../../services/model/model.service";

@Injectable()
export class StateSpaceService {
    private _logger: Logger = new Logger(StateSpaceService.name);
    constructor(
        private dataSource: DataSource,
        private modelService: ModelService
    ) {}

    find(resultId: number): Promise<StateSpacePointDTO[]> {
        return this.dataSource
            .getRepository(StateSpacePoint)
            .find({
                where: { resultId: resultId },
                order: { clockTick: "ASC" }
            })
            .catch((err) => {
                throw this.modelService.error(err, this._logger);
            });
    }
}
