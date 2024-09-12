import { environment } from "../env/test.env";
import { Test, TestingModule } from "@nestjs/testing";
import { OrgConfigController } from "../../endpoints/org-config/org-config.controller";
import { DataSource } from "typeorm";
import { ModuleMetadata } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrgConfigService } from "../../endpoints/org-config/org-config.service";
import { ModelService } from "../../services/model/model.service";
import { OrgConfig } from "aethon-arion-db";
import { OrgConfigDTO } from "aethon-arion-pipeline";
import { orgConfigControllerCreateTestData } from "../data/org-config.controller.test.data";

describe("OrgConfigController", () => {
    let controller: OrgConfigController;
    let dataSource: DataSource;
    let env = environment();

    const testingModuleConfig: ModuleMetadata = {
        imports: [TypeOrmModule.forRoot(env.database), TypeOrmModule.forFeature([OrgConfig])],
        controllers: [OrgConfigController],
        providers: [OrgConfigService, ModelService]
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule(testingModuleConfig).compile();
        controller = module.get<OrgConfigController>(OrgConfigController);
        dataSource = module.get<DataSource>(DataSource);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("should return all org configs", async () => {
        const result = await controller.index();
        expect(result).toBeDefined();
        expect(result).toBeInstanceOf(Array<OrgConfigDTO>);
    });

    it("should create return and delete a single org config", async () => {
        const create = await controller.create(orgConfigControllerCreateTestData.basic);
        expect(create).toBeDefined();
        expect(create.id).toBeDefined();
        const result = await controller.view(create.id);
        expect(result).toBeDefined();
        expect(result.id).toEqual(create.id);
        const deleted = await controller.delete(create.id);
        expect(deleted).toBeDefined();
        expect(deleted).toEqual(create.id);
    });

    afterEach(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        dataSource.destroy();
    });
});
