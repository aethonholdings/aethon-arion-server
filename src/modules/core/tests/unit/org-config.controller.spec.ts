import { environment } from "../environment/test.environment";
import { Test, TestingModule } from "@nestjs/testing";
import { OrgConfigController } from "../../endpoints/org-config/org-config.controller";
import { DataSource } from "typeorm";
import { ModuleMetadata } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrgConfigService } from "../../endpoints/org-config/org-config.service";
import { ModelService } from "../../services/model/model.service";
import { OrgConfigDTO } from "aethon-arion-pipeline";
import { OrgConfig } from "aethon-arion-db";

describe("Model module: OrgConfigController", () => {
    let controller: OrgConfigController;
    let dataSource: DataSource;
    const env = environment();

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

    afterEach(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        dataSource.destroy();
    });
});
