import { environment } from "../environment/test.environment";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ModuleMetadata } from "@nestjs/common";
import { SimConfig } from "aethon-arion-db";
import { Paginator } from "aethon-nestjs-paginate";
import { SimConfigController } from "../../endpoints/sim-config/sim-config.controller";
import { SimConfigService } from "../../endpoints/sim-config/sim-config.service";
import { ModelService } from "../../services/model/model.service";
import { indexTestQuery } from "../data/sim-config.controller.test.data";
import { nodeId } from "../data/result.controller.test.data";
import { simConfigPaginationConfig } from "src/modules/core/constants/pagination-config.constants";

describe("Model module: SimConfigController", () => {
    let controller: SimConfigController;
    let dataSource: DataSource;
    const env = environment();

    const testingModuleConfig: ModuleMetadata = {
        imports: [TypeOrmModule.forRoot(env.database), TypeOrmModule.forFeature([SimConfig])],
        controllers: [SimConfigController],
        providers: [SimConfigService, ModelService]
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule(testingModuleConfig).compile();
        controller = module.get<SimConfigController>(SimConfigController);
        dataSource = module.get<DataSource>(DataSource);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("returns paginated sim configs", async () => {
        const result = await controller.index(new Paginator(simConfigPaginationConfig, indexTestQuery, "http://foo/"));
        expect(result.meta).toBeDefined();
        expect(result.data).toBeDefined();
        expect(result.links).toBeDefined();
    });

    it("returns the next sim config", async () => {
        const next = await controller.next(nodeId);
        if (next) {
            expect(next.state).toEqual("running");
        } else {
            // THIS CHECK WON'T WORK ANYMORE BECAUSE PAGINATION MEANS WE WON'T GET ALL THE SIMCONFIGS TO ENSURE THEY ARE ALL COMPLETED, NEED TO FIX THIS
            const index = await controller.index(
                new Paginator(simConfigPaginationConfig, indexTestQuery, "http://foo/")
            );
            index.data.forEach((simConfig) => {
                expect(simConfig.state).not.toEqual("pending");
            });
        }
    });

    afterEach(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        dataSource.destroy();
    });
});
