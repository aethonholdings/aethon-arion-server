import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { lastValueFrom } from "rxjs";
import { C1 } from "aethon-arion-c1";
import { DomainTypes, Logger, RandomStreamFactory, SimConfigDTO, States } from "aethon-arion-pipeline";
import { ConvergenceTest, OptimiserState, SimConfig, SimSet } from "aethon-arion-db";
import { RootModule } from "../src/modules/root/root.module";
import { SimSetService } from "../src/modules/core/endpoints/sim-set/sim-set.service";
import { SimConfigService } from "../src/modules/core/endpoints/sim-config/sim-config.service";
import { ResultService } from "../src/modules/core/endpoints/result/result.service";
import environment from "../env/environment";

/**
 * Drives the full dispatch -> simulate -> post result -> convergence -> optimiser loop against a real database,
 * acting as the calculation node. Uses the server environment options (keep days, minOrgConfigs and minSimRuns
 * small in the test environment).
 */
describe("Optimiser loop (e2e)", () => {
    jest.setTimeout(600000);
    const env = environment();
    let moduleRef: TestingModule;
    let dataSource: DataSource;
    let simSetService: SimSetService;
    let simConfigService: SimConfigService;
    let resultService: ResultService;
    let simSetId: number;
    const originalRandom = Math.random;
    const seed = Number(process.env.ARION_E2E_SEED ?? 1);

    beforeAll(async () => {
        // seed Math.random (used by the configurator and the dynamic random streams) so that the optimiser
        // trajectory, and in particular the reuse of convergence tests across optimiser states, is reproducible
        let a = seed >>> 0;
        Math.random = () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        moduleRef = await Test.createTestingModule({ imports: [RootModule] }).compile();
        await moduleRef.init();
        dataSource = moduleRef.get(DataSource);
        simSetService = moduleRef.get(SimSetService);
        simConfigService = moduleRef.get(SimConfigService);
        resultService = moduleRef.get(ResultService);

        const simSet = await simSetService.create({
            modelName: "C1",
            description: "optimiser loop e2e",
            optimiserParams: {
                init: {
                    type: "defined",
                    config: {
                        spans: 2,
                        layers: 2,
                        gains: { influence: 0.00001, judgment: 0.00001, incentive: 0.00000001 },
                        graph: "top-down",
                        actionStateProbability: 0.85,
                        matrixInit: { influence: "random", judgment: "random", incentive: "random" },
                        board: { controlStep: false },
                        reporting: { unitPrice: 1, unitPayroll: 1 }
                    }
                },
                parameterSpace: [
                    {
                        id: "spans",
                        domain: { type: DomainTypes.DISCRETE, optimise: true, min: 1, max: 3, derivativeStepSize: 1 }
                    },
                    {
                        id: "graph",
                        domain: { type: DomainTypes.CATEGORICAL, optimise: true, categories: ["teams", "top-down"] }
                    }
                ],
                iterations: { learningRate: 1, maxStepFraction: 0.5, tolerance: 0.0001, max: 10 }
            }
        } as any);
        simSetId = simSet.id;
    });

    afterAll(async () => {
        Math.random = originalRandom;
        await moduleRef.close();
    });

    it("counts every dispatch when nodes poll concurrently", async () => {
        const polls = 20;
        const before = await dataSource.getRepository(SimConfig).sum("dispatchedRuns");
        const dispatched = await Promise.all(Array.from({ length: polls }, (_, i) => simConfigService.next(`n${i}`)));
        const after = await dataSource.getRepository(SimConfig).sum("dispatchedRuns");
        expect(dispatched.filter((d) => d).length).toBe(polls);
        expect((after ?? 0) - (before ?? 0)).toBe(polls);
    });

    it("runs at least two optimiser steps with correctly converged convergence tests", async () => {
        const logger = new Logger();
        const optimiserStates = dataSource.getRepository(OptimiserState);
        for (let i = 0; i < 5000; i++) {
            const simConfig: SimConfigDTO = await simConfigService.next("e2e");
            if (!simConfig) break;
            const result = await lastValueFrom(C1.run$(simConfig, RandomStreamFactory.seeded(simConfig.id, simConfig.runIndex), logger, "e2e"));
            await resultService.create(result);
            const states = await optimiserStates.count({ where: { simSet: { id: simSetId } } });
            const simSet = await dataSource.getRepository(SimSet).findOneByOrFail({ id: simSetId });
            if (states >= 3 || simSet.state === States.COMPLETED) break;
        }

        const states = await optimiserStates.find({
            where: { simSet: { id: simSetId } },
            relations: { convergenceTests: { configuratorParams: true } },
            order: { id: "ASC" }
        });
        expect(states.length).toBeGreaterThanOrEqual(2);

        // every optimiser state must be linked to one convergence test per distinct configuratorParams hash it
        // requires, including tests reused from earlier states
        for (const state of states) {
            const requiredHashes = new Set(
                (state.optimiserData as any).dataPoints.map((dp: any) => dp.data.inputs.hash)
            );
            const linkedHashes = new Set(state.convergenceTests.map((ct) => ct.configuratorParams.hash));
            expect(linkedHashes).toEqual(requiredHashes);
        }

        // the scenario must exercise the reuse of an existing convergence test by a later optimiser state
        const reused = states
            .slice(1)
            .some((state) =>
                state.convergenceTests.some((ct) => states[0].convergenceTests.some((ct0) => ct0.id === ct.id))
            );
        expect(reused).toBe(true);

        // a converged multi-orgConfig test must have a baseline from minOrgConfigs plus at least one more orgConfig
        const tests = await dataSource
            .getRepository(ConvergenceTest)
            .find({ where: { converged: true }, relations: { configuratorParams: true } });
        expect(tests.length).toBeGreaterThan(0);
        for (const test of tests) {
            if (test.configuratorParams.multipleOrgConfigs) {
                expect(test.orgConfigCount).toBeGreaterThan(env.options.minOrgConfigs);
            }
            expect(test.completedSimConfigCount).toBe(test.simConfigCount);
        }

        // dispatches are never lost
        const simConfigs = await dataSource.getRepository(SimConfig).find();
        for (const simConfig of simConfigs) {
            expect(simConfig.dispatchedRuns).toBeGreaterThanOrEqual(simConfig.runCount);
        }
    });
});
