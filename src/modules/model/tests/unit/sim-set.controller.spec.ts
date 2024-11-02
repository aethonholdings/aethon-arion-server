import { environment } from "../environment/test.environment";
import { Test, TestingModule } from "@nestjs/testing";
import { ModelService } from "../../services/model/model.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SimSet } from "aethon-arion-db";
import { DataSource } from "typeorm";
import { HttpException, ModuleMetadata } from "@nestjs/common";
import { simSetControllerTestData } from "../data/sim-set.controller.test.data";
import { SimSetController } from "../../endpoints/sim-set/sim-set.controller";
import { SimSetService } from "../../endpoints/sim-set/sim-set.service";
import { SimConfigService } from "../../endpoints/sim-config/sim-config.service";
import { ResultService } from "../../endpoints/result/result.service";

describe("Model module: SimSetController", () => {
    let controller: SimSetController;
    let dataSource: DataSource;
    const env = environment();

    const testingModuleConfig: ModuleMetadata = {
        imports: [TypeOrmModule.forRoot(env.database), TypeOrmModule.forFeature([SimSet])],
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

    it("creates, returns and deletes a sim set", async () => {
        const create = await controller.create(simSetControllerTestData.basic);
        expect(create).toBeDefined();
        const view = await controller.view(create.id);
        expect(view.type).toStrictEqual(simSetControllerTestData.basic.type);
        expect(view.description).toStrictEqual(simSetControllerTestData.basic.description);
        const deleted = await controller.delete(create.id);
        expect(deleted).toBeDefined();
        expect(deleted).toStrictEqual(create.id);
        try {
            await controller.view(create.id);
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
        }
    });

    afterEach(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        dataSource.destroy();
    });
});
