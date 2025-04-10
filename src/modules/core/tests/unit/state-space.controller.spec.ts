import { environment } from "../environment/test.environment";
import { Test, TestingModule } from "@nestjs/testing";
import { StateSpaceController } from "../../endpoints/state-space/state-space.controller";
import { DataSource } from "typeorm";
import { ModuleMetadata } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StateSpaceService } from "../../endpoints/state-space/state-space.service";
import { ModelService } from "../../services/model/model.service";
import { StateSpacePoint } from "aethon-arion-db";

describe("Model module: StateSpaceController", () => {
    let controller: StateSpaceController;
    let dataSource: DataSource;
    const env = environment();

    const testingModuleConfig: ModuleMetadata = {
        imports: [TypeOrmModule.forRoot(env.database), TypeOrmModule.forFeature([StateSpacePoint])],
        controllers: [StateSpaceController],
        providers: [StateSpaceService, ModelService]
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule(testingModuleConfig).compile();
        controller = module.get<StateSpaceController>(StateSpaceController);
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
