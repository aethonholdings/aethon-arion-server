import { environment } from "../environment/test.environment";
import { Test, TestingModule } from "@nestjs/testing";
import { ResultController } from "../../endpoints/result/result.controller";
import { ResultService } from "../../endpoints/result/result.service";
import { DataSource } from "typeorm";
import { ModuleMetadata } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Result } from "aethon-arion-db";
import { ModelService } from "../../services/model/model.service";

describe("Model module: ResultsController", () => {
    let controller: ResultController;
    let dataSource: DataSource;
    let env = environment();

    const testingModuleConfig: ModuleMetadata = {
        imports: [TypeOrmModule.forRoot(env.database), TypeOrmModule.forFeature([Result])],
        controllers: [ResultController],
        providers: [ResultService, ModelService]
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule(testingModuleConfig).compile();
        controller = module.get<ResultController>(ResultController);
        dataSource = module.get<DataSource>(DataSource);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    afterEach(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        dataSource.destroy();
    });
});
