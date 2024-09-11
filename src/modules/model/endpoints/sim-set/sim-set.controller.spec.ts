import { Test, TestingModule } from "@nestjs/testing";
import { SimSetController } from "./sim-set.controller";
import { SimSetService } from "./sim-set.service";
import { SimConfigService } from "../sim-config/sim-config.service";
import { ResultService } from "../result/result.service";
import { ModelService } from "../../services/model/model.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SimSet } from "aethon-arion-db";
import environment from "../../../../../env/environment.dev";
import { DataSource } from "typeorm";
import { ModuleMetadata } from "@nestjs/common";
import { simSetControllerTestData } from "./sim-set.controller.test-data";
import { SimSetDTO } from 'aethon-arion-pipeline';

describe("SimSetController", () => {
    let controller: SimSetController;
    let dataSource: DataSource;
    const testingModuleConfig: ModuleMetadata = {
        imports: [TypeOrmModule.forRoot(environment().database as any), TypeOrmModule.forFeature([SimSet])],
        controllers: [SimSetController],
        providers: [SimSetService, SimConfigService, ResultService, ModelService]
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule(testingModuleConfig).compile();
        controller = module.get<SimSetController>(SimSetController);
        dataSource = module.get<DataSource>(DataSource);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("returns all sim sets", async () => {
        const result = await controller.index();
        expect(result).toBeInstanceOf(Array<SimSet>);
    });

    it("creates a basic sim set", async () => {
        const create = await controller.create(simSetControllerTestData.basic);
        expect(create).toBeDefined();
        expect(create.type).toStrictEqual(simSetControllerTestData.basic.type);
        expect(create.description).toStrictEqual(simSetControllerTestData.basic.description);
    });

    it("returns a single sim set", async () => {
        const create = await controller.create(simSetControllerTestData.basic);
        expect(create).toBeDefined();
        const view = await controller.view(create.id);
        expect(view.type).toStrictEqual(simSetControllerTestData.basic.type);
        expect(view.description).toStrictEqual(simSetControllerTestData.basic.description);
    });

    afterEach(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        dataSource.destroy();
    });
});
