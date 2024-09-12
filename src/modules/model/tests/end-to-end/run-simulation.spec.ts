import { ModuleMetadata } from "@nestjs/common";
import { environment } from "../environment/test.environment";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrgConfig, Result, SimConfig, SimSet } from "aethon-arion-db";
import { SimSetController } from "../../endpoints/sim-set/sim-set.controller";
import { OrgConfigController } from "../../endpoints/org-config/org-config.controller";
import { ResultController } from "../../endpoints/result/result.controller";
import { SimConfigController } from "../../endpoints/sim-config/sim-config.controller";
import { OrgConfigService } from "../../endpoints/org-config/org-config.service";
import { ResultService } from "../../endpoints/result/result.service";
import { SimConfigService } from "../../endpoints/sim-config/sim-config.service";
import { SimSetService } from "../../endpoints/sim-set/sim-set.service";
import { ModelService } from "../../services/model/model.service";
import { simSetControllerTestData } from "../data/sim-set.controller.test.data";
import { orgConfigControllerCreateTestData } from "../data/org-config.controller.test.data";
import {
    simConfigControllerSimulationTestResults,
    simConfigControllerTestData
} from "../data/sim-config.controller.test.data";
import { nodeId, resultControllerCreateTestData } from "../data/result.controller.test.data";

describe("Model module: run simulation", () => {
    let dataSource: DataSource;
    const controllers: any = {};
    let env = environment();

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
        }
        // make sure the results are as expected
        // first for the simConfig
        const simConfig = await controllers.simConfig.view(simConfigCreate.id);
        expect(simConfig).toBeDefined();
        expect(simConfig.dispatchedRuns).toBe(resultControllerCreateTestData.basic.length);
        expect(simConfig.dispatchedRuns).toBe(simConfig.runCount);
        expect(simConfig.state).toBe(simConfigControllerSimulationTestResults.basic.state);
        expect(simConfig.avgPerformance).toBe(simConfigControllerSimulationTestResults.basic.avgPerformance);
        expect(simConfig.entropy).toBe(simConfigControllerSimulationTestResults.basic.entropy);

        // then for the simSet
        const simSet = await controllers.simSet.view(simSetCreate.id);
        expect(simSet).toBeDefined();
        expect(simSet.state).toBe("completed");
        expect(simSet.simConfigCount).toBe(1);
        expect(simSet.completedRunCount).toBe(resultControllerCreateTestData.basic.length);

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
