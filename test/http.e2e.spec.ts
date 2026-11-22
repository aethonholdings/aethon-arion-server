import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as bodyParser from "body-parser";
import request from "supertest";
import { DataSource } from "typeorm";
import { lastValueFrom } from "rxjs";
import { C1 } from "aethon-arion-c1";
import { DomainTypes, Logger, RandomStreamFactory } from "aethon-arion-pipeline";
import { Result } from "aethon-arion-db";
import { RootModule } from "../src/modules/root/root.module";
import { SimSetService } from "../src/modules/core/endpoints/sim-set/sim-set.service";
import { DefaultExceptionFilter } from "../src/common/filters/default-exception/default-exception.filter";
import { APIRequestInterceptor } from "../src/common/interceptors/api-request/api-request.interceptor";

/** The node protocol over HTTP, with the same global setup as main.ts. */
describe("Node protocol over HTTP (e2e)", () => {
    jest.setTimeout(120000);
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [RootModule] }).compile();
        app = moduleRef.createNestApplication({ bodyParser: false });
        app.setGlobalPrefix("arion");
        app.use(bodyParser.json({ limit: "50mb" }));
        app.useGlobalPipes(new ValidationPipe({ disableErrorMessages: false }));
        app.useGlobalFilters(new DefaultExceptionFilter());
        app.useGlobalInterceptors(new APIRequestInterceptor());
        await app.init();
        await app.get(SimSetService).create({
            modelName: "C1",
            description: "http",
            optimiserParams: {
                init: { type: "random" },
                parameterSpace: [
                    { id: "spans", domain: { type: DomainTypes.DISCRETE, optimise: true, min: 1, max: 2, derivativeStepSize: 1 } }
                ],
                iterations: { learningRate: 1, tolerance: 0.0001, max: 10 }
            }
        } as any);
    });

    afterAll(async () => {
        await app.close();
    });

    it("hands out run tickets and records results idempotently", async () => {
        const next = await request(app.getHttpServer()).get("/arion/sim-config/next").query({ nodeId: "http" });
        expect(next.status).toBe(200);
        const job = next.body.payload;
        expect(Number.isInteger(job.runId)).toBe(true);
        expect(Number.isInteger(job.runIndex)).toBe(true);

        const result = await lastValueFrom(
            C1.run$(job, RandomStreamFactory.seeded(...job.seedKeys), new Logger(), "http")
        );
        const body = JSON.parse(JSON.stringify(result));
        const first = await request(app.getHttpServer()).post("/arion/result").send(body);
        expect(first.status).toBe(201);
        const second = await request(app.getHttpServer()).post("/arion/result").send(body);
        expect(second.status).toBe(201);
        expect(second.body.payload.id).toBe(first.body.payload.id);
        const stored = await app.get(DataSource).getRepository(Result).findOneByOrFail({ id: first.body.payload.id });
        expect(stored.runId).toBe(job.runId);
    });

    it("rejects a result whose run ticket belongs to another simConfig", async () => {
        const next = await request(app.getHttpServer()).get("/arion/sim-config/next").query({ nodeId: "http" });
        const job = next.body.payload;
        const result = await lastValueFrom(
            C1.run$(job, RandomStreamFactory.seeded(...job.seedKeys), new Logger(), "http")
        );
        const body = { ...JSON.parse(JSON.stringify(result)), runId: 999999 };
        const response = await request(app.getHttpServer()).post("/arion/result").send(body);
        expect(response.status).toBe(400);
    });

    it("lists SimSets with whitelisted filters only", async () => {
        const all = await request(app.getHttpServer()).get("/arion/sim-set");
        expect(all.status).toBe(200);
        expect(all.body.payload.length).toBeGreaterThan(0);
        expect(all.body.payload[0].optimiserStates).toBeUndefined();
        const filtered = await request(app.getHttpServer()).get("/arion/sim-set").query({ state: "completed" });
        expect(filtered.status).toBe(200);
        expect(filtered.body.payload.every((s: any) => s.state === "completed")).toBe(true);
        const injected = await request(app.getHttpServer())
            .get("/arion/sim-set")
            .query({ "relations[optimiserStates]": "true" });
        expect(injected.status).toBe(400);
    });

    it("rejects non-numeric ids and returns 404 for deleting a missing record", async () => {
        expect((await request(app.getHttpServer()).get("/arion/org-config/agent-count/abc")).status).toBe(400);
        expect((await request(app.getHttpServer()).delete("/arion/sim-config/999999")).status).toBe(404);
    });

    it("returns numeric org config summaries", async () => {
        const summary = await request(app.getHttpServer()).get("/arion/org-config/summary");
        expect(summary.status).toBe(200);
        for (const row of summary.body.payload) expect(typeof row.orgConfigCount).toBe("number");
    });

    it("accepts a node's failure report for a run and 404s an unknown run", async () => {
        const job = (await request(app.getHttpServer()).get("/arion/sim-config/next").query({ nodeId: "http" })).body.payload;
        const response = await request(app.getHttpServer()).post(`/arion/run/${job.runId}/failure`).send({ error: "boom" });
        expect(response.status).toBe(201);
        expect(response.body.payload.failedRuns).toBe(1);
        expect((await request(app.getHttpServer()).post("/arion/run/999999/failure").send({ error: "x" })).status).toBe(404);
    });

    it("returns 404 for a missing record", async () => {
        const response = await request(app.getHttpServer()).get("/arion/sim-config/999999");
        expect(response.status).toBe(404);
    });
});
