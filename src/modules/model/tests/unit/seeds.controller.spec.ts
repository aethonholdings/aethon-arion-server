import { Test, TestingModule } from "@nestjs/testing";
import { SeedsController } from "../../endpoints/seeds/seeds.controller";
import { DataSource } from "typeorm";
import { ModuleMetadata } from "@nestjs/common";
import { SeedsService } from "../../endpoints/seeds/seeds.service";
import { ModelService } from "../../services/model/model.service";

describe("SeedsController", () => {
    let controller: SeedsController;
    let dataSource: DataSource;

    const testingModuleConfig: ModuleMetadata = {
        controllers: [SeedsController],
        providers: [SeedsService, ModelService]
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule(testingModuleConfig).compile();
        controller = module.get<SeedsController>(SeedsController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("should return the seeds array", async () => {
        const seeds: number[] = await controller.index();
        expect(seeds).toBeDefined();
        expect(seeds).toBeInstanceOf(Array<number>);
        expect(seeds.length).not.toBe(0);
    });
});
