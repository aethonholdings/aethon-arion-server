import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as bodyParser from "body-parser";
import request from "supertest";
import { DataSource } from "typeorm";
import { AuthorisedNode } from "aethon-arion-db";
import { DomainTypes } from "aethon-arion-pipeline";
import { RootModule } from "../src/modules/root/root.module";
import { AuthService } from "../src/modules/auth/auth.service";
import { SimSetService } from "../src/modules/core/endpoints/sim-set/sim-set.service";
import { DefaultExceptionFilter } from "../src/common/filters/default-exception/default-exception.filter";
import { APIRequestInterceptor } from "../src/common/interceptors/api-request/api-request.interceptor";

/** Node authentication over HTTP: authorisation with operator credentials, and the key check on node endpoints. */
describe("Node authentication (e2e)", () => {
    jest.setTimeout(120000);
    let app: INestApplication;
    let auth: AuthService;
    let dataSource: DataSource;
    const server = () => request(app.getHttpServer());
    const login = (body: any) => server().post("/arion/auth/node").send(body);
    const credentials = { username: "operator", password: "operator-password" };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [RootModule] }).compile();
        app = moduleRef.createNestApplication({ bodyParser: false });
        app.setGlobalPrefix("arion");
        app.use(bodyParser.json({ limit: "50mb" }));
        app.useGlobalPipes(new ValidationPipe({ disableErrorMessages: false }));
        app.useGlobalFilters(new DefaultExceptionFilter());
        app.useGlobalInterceptors(new APIRequestInterceptor());
        await app.init();
        auth = app.get(AuthService);
        dataSource = app.get(DataSource);
        await auth.createUser(credentials.username, credentials.password);
        await auth.createUser("former", "former-password");
        await auth.disableUser("former");
        await app.get(SimSetService).create({
            modelName: "C1",
            description: "auth",
            optimiserParams: {
                init: { type: "random" },
                parameterSpace: [{ id: "spans", domain: { type: DomainTypes.DISCRETE, optimise: true, min: 1, max: 2, derivativeStepSize: 1 } }],
                iterations: { learningRate: 1, tolerance: 0.0001, max: 10 }
            }
        } as any);
    });

    afterAll(async () => {
        await dataSource.query("DELETE FROM sim_set");
        await app.close();
    });

    it("authorises a node and records it with its operator and time", async () => {
        const before = Date.now() - 1000;
        const response = await login({ nodeId: "machine-a", hostname: "host-a", ...credentials });
        expect(response.status).toBe(201);
        expect(response.body.payload.nodeId).toBe("machine-a");
        expect(response.body.payload.key).toMatch(/^[A-Za-z0-9_-]{43}$/);
        const node = await dataSource.getRepository(AuthorisedNode).findOneOrFail({ where: { id: "machine-a" }, relations: { authorisedBy: true } });
        expect(node.hostname).toBe("host-a");
        expect(node.authorisedBy?.username).toBe("operator");
        expect(new Date(node.authorisedAt).getTime()).toBeGreaterThanOrEqual(before);
        expect(node.keyHash).not.toContain(response.body.payload.key); // only the hash is stored
        expect(node.revokedAt).toBeNull();
    });

    it("rejects a wrong password, an unknown user and a disabled user alike", async () => {
        for (const body of [
            { nodeId: "machine-b", username: "operator", password: "wrong-password" },
            { nodeId: "machine-b", username: "nobody", password: "operator-password" },
            { nodeId: "machine-b", username: "former", password: "former-password" }
        ]) {
            const response = await login(body);
            expect(response.status).toBe(401);
            expect(JSON.stringify(response.body)).toContain("Invalid credentials");
        }
        expect(await dataSource.getRepository(AuthorisedNode).findOne({ where: { id: "machine-b" } })).toBeNull();
    });

    it("rejects a node id that is not a machine id", async () => {
        expect((await login({ nodeId: "machine:123", ...credentials })).status).toBe(400);
        expect((await login({ ...credentials })).status).toBe(400);
    });

    it("admits a node with its key and refuses requests without a valid key", async () => {
        const { key } = (await login({ nodeId: "machine-c", ...credentials })).body.payload;
        const next = (authorization?: string, nodeId: string = "machine-c:111111") => {
            const r = server().get("/arion/sim-config/next").query({ nodeId });
            return authorization ? r.set("Authorization", authorization) : r;
        };
        expect((await next()).status).toBe(401);
        expect((await next("Bearer not-a-key")).status).toBe(401);
        expect((await next(key)).status).toBe(401); // without the Bearer scheme
        expect((await next(`Bearer ${key}`)).status).toBe(200);
        expect((await server().post("/arion/result").send({})).status).toBe(401);
        expect((await server().post("/arion/run/1/failure").send({})).status).toBe(401);
        // the analyst's read endpoints are not restricted
        expect((await server().get("/arion/sim-set")).status).toBe(200);
    });

    it("refuses a node id that belongs to another node", async () => {
        const { key } = (await login({ nodeId: "machine-d", ...credentials })).body.payload;
        const as = (nodeId: string) => server().get("/arion/sim-config/next").set("Authorization", `Bearer ${key}`).query({ nodeId });
        expect((await as("machine-d")).status).toBe(200);
        expect((await as("machine-d:222222")).status).toBe(200);
        expect((await as("machine-c:111111")).status).toBe(403);
        expect((await as("machine-dd:1")).status).toBe(403);
        const post = await server().post("/arion/result").set("Authorization", `Bearer ${key}`).send({ nodeId: "machine-c:1" });
        expect(post.status).toBe(403);
    });

    it("records when a node was last seen", async () => {
        const { key } = (await login({ nodeId: "machine-e", ...credentials })).body.payload;
        expect((await dataSource.getRepository(AuthorisedNode).findOneByOrFail({ id: "machine-e" })).lastSeenAt).toBeNull();
        await server().get("/arion/sim-config/next").set("Authorization", `Bearer ${key}`).query({ nodeId: "machine-e:1" });
        expect((await dataSource.getRepository(AuthorisedNode).findOneByOrFail({ id: "machine-e" })).lastSeenAt).not.toBeNull();
    });

    it("refuses a revoked key, and replaces the key when a node is authorised again", async () => {
        const first = (await login({ nodeId: "machine-f", ...credentials })).body.payload.key;
        const next = (key: string) => server().get("/arion/sim-config/next").set("Authorization", `Bearer ${key}`).query({ nodeId: "machine-f:1" });
        expect((await next(first)).status).toBe(200);
        await auth.revokeNode("machine-f");
        expect((await next(first)).status).toBe(401);
        const second = (await login({ nodeId: "machine-f", ...credentials })).body.payload.key;
        expect(second).not.toBe(first);
        expect((await next(second)).status).toBe(200); // reinstated with a new key
        expect((await next(first)).status).toBe(401); // the revoked key stays invalid
        const third = (await login({ nodeId: "machine-f", ...credentials })).body.payload.key;
        expect((await next(second)).status).toBe(401); // replaced
        expect((await next(third)).status).toBe(200);
    });

    it("limits login attempts per client", async () => {
        // the CI environment allows 20 attempts a minute; earlier tests used some of them
        const statuses: number[] = [];
        for (let i = 0; i < 25; i++) statuses.push((await login({ nodeId: "machine-g", username: "operator", password: "wrong" })).status);
        expect(statuses).toContain(429);
        expect(statuses[statuses.length - 1]).toBe(429);
    });
});
