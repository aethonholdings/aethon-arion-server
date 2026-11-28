import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { lastValueFrom } from "rxjs";
import { C1 } from "aethon-arion-c1";
import { DomainTypes, Logger, RandomStreamFactory, SimConfigDTO } from "aethon-arion-pipeline";
import { RootModule } from "../../src/modules/root/root.module";
import { SimSetService } from "../../src/modules/core/endpoints/sim-set/sim-set.service";
import { SimConfigService } from "../../src/modules/core/endpoints/sim-config/sim-config.service";
import { ResultService } from "../../src/modules/core/endpoints/result/result.service";

/**
 * Benchmark, not part of CI: job dispatch cost with a deep optimiser history and a large experiment. Run with
 *   npx jest --config ./test/jest-e2e.json --testRegex "bench/.*\\.bench\\.ts$" --runInBand
 * (BENCH_STEPS sets the depth of the optimiser history, default 12).
 */
describe("dispatch benchmark", () => {
    jest.setTimeout(3600000);
    let moduleRef: TestingModule;
    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({ imports: [RootModule] }).compile();
        await moduleRef.init();
    });
    afterAll(async () => moduleRef.close());

    it("times next() and result posts", async () => {
        const simSets = moduleRef.get(SimSetService), simConfigs = moduleRef.get(SimConfigService), results = moduleRef.get(ResultService);
        const logger = new Logger();
        const simulate = (job: SimConfigDTO) => lastValueFrom(C1.run$(job, RandomStreamFactory.seeded(...job.seedKeys), logger, "bench", false));
        const steps = Number(process.env.BENCH_STEPS || 12);
        await simSets.create({
            modelName: "C1", description: "deep", simConfigParams: { days: 1, randomStreamType: "random" },
            optimiserParams: {
                init: { type: "defined", config: { spans: 2, layers: 2, graph: "teams", matrixInit: { influence: "random", judgment: "random", incentive: "purposeful" } } },
                parameterSpace: [
                    { id: "gains.influence", domain: { type: DomainTypes.CONTINUOUS, optimise: true, min: 0.000003, max: 0.0001, derivativeStepSize: 0.000003 } },
                    { id: "gains.incentive", domain: { type: DomainTypes.CONTINUOUS, optimise: true, min: 0.000001, max: 0.0001, derivativeStepSize: 0.000001 } },
                    { id: "matrixInit.influence", domain: { type: DomainTypes.CATEGORICAL, optimise: true, categories: ["random", "hybrid", "purposeful"] } }
                ],
                iterations: { learningRate: 0.001, maxStepFraction: 0.05, tolerance: 0, max: steps + 1 }
            }
        } as any);
        const ds = moduleRef.get(DataSource);
        const stateCount = async () => Number((await ds.query("SELECT COUNT(*) n FROM optimiser_state"))[0].n);
        while ((await stateCount()) < steps) {
            const job = await simConfigs.next("bench");
            if (!job) break;
            await results.create(await simulate(job));
        }
        await simSets.create({
            modelName: "C1", description: "experiment", optimiserName: "C1ControlExperimentOptimiser",
            simConfigParams: { days: 1, randomStreamType: "random" },
            optimiserParams: { config: { spans: 3, layers: 2, matrixInit: { influence: "random", judgment: "random", incentive: "purposeful" } }, orgConfigs: 100 }
        } as any);
        const t0 = Date.now();
        const jobs: SimConfigDTO[] = [];
        for (let i = 0; i < 20; i++) jobs.push(await simConfigs.next("bench"));
        const nextMs = (Date.now() - t0) / 20;
        const t1 = Date.now();
        for (const job of jobs.slice(0, 10)) await results.create(await simulate(job));
        const postMs = (Date.now() - t1) / 10;
        console.log(`BENCH states=${await stateCount()} next=${nextMs.toFixed(0)}ms post+simulate=${postMs.toFixed(0)}ms`);
    });
});
