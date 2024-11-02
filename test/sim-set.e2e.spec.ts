import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { RootModule } from "../src/modules/root/root.module";

describe("AppController (e2e)", () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [RootModule]
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it("/ (GET)", async () => {
        const response = await request(app.getHttpServer()).get("/sim-config");
        return response;
    });

    afterEach(async () => {
        await app.close();
    });
});
