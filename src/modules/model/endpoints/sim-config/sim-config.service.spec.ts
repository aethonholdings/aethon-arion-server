import { Test, TestingModule } from "@nestjs/testing";
import { SimConfigService } from "./sim-config.service";

describe("SimConfigService", () => {
    let service: SimConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SimConfigService]
        }).compile();

        service = module.get<SimConfigService>(SimConfigService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });
});
