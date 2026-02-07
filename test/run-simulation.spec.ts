import { ModuleMetadata } from "@nestjs/common";
import { environment } from "../src/modules/core/tests/environment/test.environment";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrgConfig, Result, SimConfig, SimSet } from "aethon-arion-db";
import { SimSetController } from "../src/modules/core/endpoints/sim-set/sim-set.controller";
import { OrgConfigController } from "../src/modules/core/endpoints/org-config/org-config.controller";
import { ResultController } from "../src/modules/core/endpoints/result/result.controller";
import { SimConfigController } from "../src/modules/core/endpoints/sim-config/sim-config.controller";
import { OrgConfigService } from "../src/modules/core/endpoints/org-config/org-config.service";
import { ResultService } from "../src/modules/core/endpoints/result/result.service";
import { SimConfigService } from "../src/modules/core/endpoints/sim-config/sim-config.service";
import { SimSetService } from "../src/modules/core/endpoints/sim-set/sim-set.service";
import { ModelService } from "../src/modules/core/services/model/model.service";
import { simSetControllerTestData } from "../src/modules/core/tests/data/sim-set.controller.test.data";
import { orgConfigControllerCreateTestData } from "../src/modules/core/tests/data/org-config.controller.test.data";
import {
    simConfigControllerSimulationTestResults,
    simConfigControllerTestData
} from "../src/modules/core/tests/data/sim-config.controller.test.data";
import { nodeId, resultControllerCreateTestData } from "../src/modules/core/tests/data/result.controller.test.data";

describe.skip("Model module: run simulation", () => {
    let dataSource: DataSource;
    const controllers: any = {};
    const env = environment();

    const testingModuleConfig: ModuleMetadata = {
        imports: [
            TypeOrmModule.forRoot(env.database),
            TypeOrmModule.forFeature([SimSet, SimConfig, OrgConfig, Result])
        ],
        controllers: [SimSetController, OrgConfigController, SimConfigController, ResultController],
        providers: [SimSetService, OrgConfigService, SimConfigService, ResultService, ModelService]
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule(testingModuleConfig).compile();
        controllers.simSet = module.get<SimSetController>(SimSetController);
        controllers.orgConfig = module.get<OrgConfigController>(OrgConfigController);
        controllers.simConfig = module.get<SimConfigController>(SimConfigController);
        controllers.result = module.get<ResultController>(ResultController);
        dataSource = module.get<DataSource>(DataSource);
    });

    it("creates a simulation set, org config, sim config and results - basic data set", async () => {
        // create simset
        const simSetCreate = await controllers.simSet.create(simSetControllerTestData.basic);
        expect(simSetCreate).toBeDefined();
        expect(simSetCreate.id).toBeDefined();
        // create org config
        const orgConfigCreate = await controllers.orgConfig.create(orgConfigControllerCreateTestData.basic);
        expect(orgConfigCreate).toBeDefined();
        expect(orgConfigCreate.id).toBeDefined();
        // create sim config
        const simConfigDTOCreate = {
            ...simConfigControllerTestData.basic,
            orgConfigId: orgConfigCreate.id,
            simSetId: simSetCreate.id
        };
        const simConfigCreate = await controllers.simConfig.create(simConfigDTOCreate);
        expect(simConfigCreate).toBeDefined();
        expect(simConfigCreate.id).toBeDefined();
        // create results, pretending that a node is sending output
        for (let i = 0; i < resultControllerCreateTestData.basic.length; i++) {
            const simConfig = await controllers.simConfig.next(nodeId);
            if (simConfig) {
                expect(simConfig).toBeDefined();
                expect(simConfig.id).toBeDefined();
                const resultDTO = {
                    ...resultControllerCreateTestData.basic[i],
                    runCount: i,
                    simConfigId: simConfig.id
                };
                const result = await controllers.result.create(resultDTO);
                expect(result).toBeDefined();
                expect(result.id).toBeDefined();
            } else {
                expect(simConfig).toBeUndefined();
            }
        }
        // make sure the results are as expected
        // first for the simConfig
        const simConfig = await controllers.simConfig.view(simConfigCreate.id);
        expect(simConfig).toBeDefined();
        expect(simConfig.dispatchedRuns).toBe(simConfig.runCount);
        expect(simConfig.state).toBe(simConfigControllerSimulationTestResults.basic.state);

        // then for the simSet
        const simSet = await controllers.simSet.view(simSetCreate.id);
        expect(simSet).toBeDefined();
        expect(simSet.state).toBe("completed");
        expect(simSet.simConfigCount).toBe(1);
        expect(simSet.completedRunCount).toBe(simConfig.runCount);

        // teardown
        const deleteSimSet = await controllers.simSet.delete(simSetCreate.id);
        expect(deleteSimSet).toBeDefined();
        const deleteOrgConfig = await controllers.orgConfig.delete(orgConfigCreate.id);
        expect(deleteOrgConfig).toBeDefined();
    });

    afterAll(async () => {
        // Closing the DB connection allows Jest to exit successfully.
        dataSource.destroy();
    });
});
