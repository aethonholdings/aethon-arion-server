import * as fs from "fs";
import { Injectable, Logger } from "@nestjs/common";
import { ModelService } from "../../services/model.service";

@Injectable()
export class SeedsService {
    private _logger: Logger = new Logger(SeedsService.name);

    constructor(private modelService: ModelService) {}

    async seeds(): Promise<number[]> {
        try {
            const seeds = JSON.parse(fs.readFileSync("./data/input/seeds/rand.seeds.json", "utf8")) as number[];
            return seeds;
        } catch (err) {
            throw this.modelService.error(err, this._logger);
        }
    }
}
