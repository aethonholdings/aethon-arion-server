import { StateSpacePoint } from "aethon-arion-db";
import { StateSpacePointDTO } from "aethon-arion-pipeline";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class StateSpaceService {
    private _logger: Logger = new Logger(StateSpaceService.name);
    constructor(private dataSource: DataSource) {}

    findOne(resultId: number): Promise<StateSpacePointDTO[]> {
        return this.dataSource
            .getRepository(StateSpacePoint)
            .find({
                where: { resultId: resultId },
                order: { clockTick: "ASC" }
            })
            .catch((err) => {
                this._logger.error(err);
                throw new HttpException("Invalid query", HttpStatus.BAD_REQUEST);
            });
    }
}
