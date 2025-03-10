import { StateSpacePoint } from "aethon-arion-db";
import { StateSpacePointDTO } from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ResultService } from "../result/result.service";

@Injectable()
export class StateSpaceService {
    private _logger: Logger = new Logger(StateSpaceService.name);
    constructor(private dataSource: DataSource) {}

    find(resultId: number): Promise<StateSpacePointDTO[]> {
        return this.dataSource.getRepository(StateSpacePoint).find({
            where: { resultId: resultId },
            order: { clockTick: "ASC" }
        }).then((stateSpacePoints: StateSpacePoint[]) => {
            return stateSpacePoints.map((stateSpacePoint) => stateSpacePoint.toDTO());
        });
    }
}
