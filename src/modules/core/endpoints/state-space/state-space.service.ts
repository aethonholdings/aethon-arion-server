import { StateSpacePoint } from "aethon-arion-db";
import { StateSpacePointDTO } from "aethon-arion-pipeline";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class StateSpaceService {
    constructor(private dataSource: DataSource) {}

    find(resultId: number): Promise<StateSpacePointDTO[]> {
        return this.dataSource
            .getRepository(StateSpacePoint)
            .find({
                where: { resultId: resultId },
                order: { clockTick: "ASC" }
            });
    }
}
