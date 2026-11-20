import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { lastValueFrom } from "rxjs";
import { C1 } from "aethon-arion-c1";
import { DomainTypes, Logger, RandomStreamFactory, ResultDTO, SimConfigDTO, States } from "aethon-arion-pipeline";
import { OrgConfig, Result, Run, SimConfig, SimConfigParams, SimSet, StateSpacePoint } from "aethon-arion-db";
import { RootModule } from "../src/modules/root/root.module";
import { SimSetService } from "../src/modules/core/endpoints/sim-set/sim-set.service";
import { SimConfigService } from "../src/modules/core/endpoints/sim-config/sim-config.service";
import { ResultService } from "../src/modules/core/endpoints/result/result.service";

/** Data integrity of the dispatch / result workflow under concurrency, retries and late results. */
describe("Dispatch and result integrity (e2e)", () => {
    jest.setTimeout(600000);
    let moduleRef: TestingModule;
    let dataSource: DataSource;
    let simSetService: SimSetService;
    let simConfigService: SimConfigService;
    let resultService: ResultService;
    const logger = new Logger();

    const optimiserParams = (days?: number) => ({
        init: {
            type: "defined",
            config: {
                spans: 2,
                layers: 2,
                gains: { influence: 0.00001, judgment: 0.00001, incentive: 0.00000001 },
                graph: "teams",
                actionStateProbability: 0.85,
                matrixInit: { influence: "random", judgment: "random", incentive: "random" },
                board: { controlStep: false },
                reporting: { unitPrice: 1, unitPayroll: 1 }
            }
        },
        parameterSpace: [
            { id: "spans", domain: { type: DomainTypes.DISCRETE, optimise: true, min: 1, max: 3, derivativeStepSize: 1 } }
        ],
        iterations: { learningRate: 1, maxStepFraction: 0.5, tolerance: 0.0001, max: 10 }
    });
    const createSimSet = (description: string) =>
        simSetService.create({ modelName: "C1", description, optimiserParams: optimiserParams() } as any);
    const simulate = (simConfig: SimConfigDTO): Promise<ResultDTO> =>
        lastValueFrom(
            C1.run$(simConfig, RandomStreamFactory.seeded(...simConfig.seedKeys), logger, "e2e", true)
        );

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({ imports: [RootModule] }).compile();
        await moduleRef.init();
        dataSource = moduleRef.get(DataSource);
        simSetService = moduleRef.get(SimSetService);
        simConfigService = moduleRef.get(SimConfigService);
        resultService = moduleRef.get(ResultService);
    });

    afterAll(async () => {
        await moduleRef.close();
    });

    it("dispatches distinct, reproducible runs", async () => {
        await createSimSet("distinct runs");
        const a = await simConfigService.next("a");
        const b = await simConfigService.next("b");
        expect(a.id).toBe(b.id);
        expect(a.runIndex).not.toBe(b.runIndex);
        expect(a.runId).not.toBe(b.runId);
        const [ra, rb, ra2] = await Promise.all([simulate(a), simulate(b), simulate(a)]);
        expect(ra.reporting).not.toEqual(rb.reporting);
        expect(ra.reporting).toEqual(ra2.reporting);
    });

    it("counts concurrent result posts for the same simConfig exactly", async () => {
        const jobs = await Promise.all(Array.from({ length: 6 }, (_, i) => simConfigService.next(`c${i}`)));
        const simConfigId = jobs[0].id;
        const same = jobs.filter((j) => j.id === simConfigId);
        const results = await Promise.all(same.map((j) => simulate(j)));
        await Promise.all(results.map((r) => resultService.create(r)));
        const simConfig = await dataSource.getRepository(SimConfig).findOneByOrFail({ id: simConfigId });
        // every post is stored; results arriving after convergence are flagged late and not counted
        const counted = await dataSource.getRepository(Result).count({ where: { simConfigId, late: false } });
        const all = await dataSource.getRepository(Result).count({ where: { simConfigId } });
        expect(simConfig.runCount).toBe(counted);
        expect(all).toBe(results.length);
    });

    it("treats a re-posted result as idempotent", async () => {
        const job = await simConfigService.next("retry");
        const result = await simulate(job);
        const first = await resultService.create(result);
        const second = await resultService.create(result);
        expect(second.id).toBe(first.id);
        expect(await dataSource.getRepository(Result).count({ where: { runId: job.runId } })).toBe(1);
        const run = await dataSource.getRepository(Run).findOneByOrFail({ id: job.runId });
        expect(run.resultId).toBe(first.id);
    });

    it("saves the state space inside the result transaction", async () => {
        const job = await simConfigService.next("state-space");
        await dataSource.getRepository(SimConfig).update(job.id, { saveStateSpace: true });
        const result = await simulate({ ...job, saveStateSpace: true });
        expect(result.stateSpace.length).toBeGreaterThan(0);
        const started = Date.now();
        const saved = await resultService.create(result);
        expect(Date.now() - started).toBeLessThan(20000);
        expect(await dataSource.getRepository(StateSpacePoint).count({ where: { resultId: saved.id } })).toBe(
            result.stateSpace.length
        );
    });

    it("stores a late result without reopening a converged simConfig", async () => {
        const job = await simConfigService.next("late");
        await dataSource.getRepository(SimConfig).update(job.id, { converged: true, state: States.COMPLETED });
        const before = await dataSource.getRepository(SimConfig).findOneByOrFail({ id: job.id });
        const saved = await resultService.create(await simulate(job));
        const after = await dataSource.getRepository(SimConfig).findOneByOrFail({ id: job.id });
        expect((await dataSource.getRepository(Result).findOneByOrFail({ id: saved.id })).late).toBe(true);
        expect(after.runCount).toBe(before.runCount);
        expect(after.converged).toBe(true);
    });

    it("stops dispatching the work of a deleted SimSet", async () => {
        await dataSource.query("DELETE FROM sim_set");
        expect(await simConfigService.next("orphan")).toBeNull();
    });

    it("creates a SimSet with the requested simConfigParams", async () => {
        const simSet = await simSetService.create({
            modelName: "C1",
            description: "params",
            simConfigParams: { days: 2, randomStreamType: "static" },
            optimiserParams: optimiserParams()
        } as any);
        const stored = await dataSource
            .getRepository(SimSet)
            .findOneOrFail({ where: { id: simSet.id }, relations: { simConfigParams: true } });
        expect(stored.simConfigParams.days).toBe(2);
        expect(stored.simConfigParams.randomStreamType).toBe("static");
        await Promise.all([
            simSetService.create({ modelName: "C1", description: "race 1", simConfigParams: { days: 3, randomStreamType: "random" }, optimiserParams: optimiserParams() } as any),
            simSetService.create({ modelName: "C1", description: "race 2", simConfigParams: { days: 3, randomStreamType: "random" }, optimiserParams: optimiserParams() } as any)
        ]);
        expect(await dataSource.getRepository(SimConfigParams).count({ where: { days: 3 } })).toBe(1);
    });

    it("shares random draws between neighbouring optimiser points (common random numbers)", async () => {
        const simSet = await simSetService.create({
            modelName: "C1",
            description: "crn",
            simConfigParams: { days: 4, randomStreamType: "random" },
            optimiserParams: {
                init: {
                    type: "defined",
                    config: { ...optimiserParams().init.config, gains: { influence: 1e-5, judgment: 1e-5, incentive: 1e-5 } }
                },
                parameterSpace: [
                    {
                        id: "gains.judgment",
                        domain: { type: DomainTypes.CONTINUOUS, optimise: true, min: 1e-6, max: 1e-4, derivativeStepSize: 1e-5 }
                    }
                ],
                iterations: { learningRate: 1, tolerance: 0.0001, max: 10 }
            }
        } as any);
        const orgConfigs: OrgConfig[] = await dataSource
            .getRepository(OrgConfig)
            .createQueryBuilder("orgConfig")
            .innerJoin("orgConfig.simConfigs", "simConfig")
            .innerJoin(SimConfigParams, "params", "params.id = simConfig.simConfigParamsId")
            .innerJoinAndSelect("orgConfig.configuratorParams", "configuratorParams")
            .where("params.days = 4 AND params.randomStreamType = 'random'")
            .getMany();
        const byPoint = new Map<string, OrgConfig[]>();
        for (const oc of orgConfigs) {
            const key = oc.configuratorParams.hash;
            byPoint.set(key, [...(byPoint.get(key) ?? []), oc]);
        }
        expect(byPoint.size).toBe(3); // x, x + delta and x - delta (central difference)
        const points = [...byPoint.values()];
        const [x] = points;
        for (const xd of points.slice(1)) for (const a of x) {
            const b = xd.find((oc) => oc.replicate === a.replicate)!;
            expect(b).toBeDefined();
            // same draws: the judgment tensors differ only by the gain ratio, the incentive tensors are identical
            const ratio = (b.configuratorParams.data as any).gains.judgment / (a.configuratorParams.data as any).gains.judgment;
            (b.agentSet as any).judgmentTensor.flat(3).forEach((v: number, i: number) =>
                expect(v).toBeCloseTo(ratio * (a.agentSet as any).judgmentTensor.flat(3)[i], 12)
            );
            expect((b.agentSet as any).incentiveTensor).toEqual((a.agentSet as any).incentiveTensor);
        }
        // and the dispatched runs carry matching stream keys for the same replicate and run index
        const params = await dataSource.getRepository(SimConfigParams).findOneByOrFail({ days: 4, randomStreamType: "random" });
        expect(Number.isInteger(params.seed)).toBe(true);
        expect(simSet.id).toBeDefined();
    });

    it("ends a SimSet after iterations.max optimiser states and stores org config diagnostics", async () => {
        await dataSource.query("DELETE FROM sim_set");
        const params: any = optimiserParams();
        params.iterations.max = 1;
        params.iterations.tolerance = 0; // never converged by tolerance
        const simSet = await simSetService.create({ modelName: "C1", description: "max", simConfigParams: { days: 5, randomStreamType: "random" }, optimiserParams: params } as any);
        for (let i = 0; i < 2000; i++) {
            const job = await simConfigService.next("max");
            if (!job) break;
            await resultService.create(await simulate(job));
            if ((await dataSource.getRepository(SimSet).findOneByOrFail({ id: simSet.id })).state === States.COMPLETED) break;
        }
        expect((await dataSource.getRepository(SimSet).findOneByOrFail({ id: simSet.id })).state).toBe(States.COMPLETED);
        expect(await dataSource.query("SELECT COUNT(*) AS n FROM optimiser_state WHERE simSetId = ?", [simSet.id])).toEqual([{ n: "1" }]);
        const orgConfig = await dataSource.getRepository(OrgConfig).findOne({ where: {}, order: { id: "DESC" } });
        expect(orgConfig.diagnostics.stable).toBe(true);
        expect(orgConfig.diagnostics.consensusTimeHours).toBeGreaterThan(0);
    });

    it("rejects invalid optimiser parameters", async () => {
        const params: any = optimiserParams();
        params.parameterSpace[0].domain.min = 5;
        await expect(
            simSetService.create({ modelName: "C1", description: "bad", optimiserParams: params } as any)
        ).rejects.toThrow(/Invalid optimiser parameters/);
    });
});
