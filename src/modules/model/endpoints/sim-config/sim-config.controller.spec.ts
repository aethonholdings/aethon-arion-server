import { Test, TestingModule } from "@nestjs/testing";
import { SimConfigController } from "./sim-config.controller";
import { SimConfigService } from "./sim-config.service";

describe("SimConfigController", () => {
    let controller: SimConfigController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SimConfigController],
            providers: [SimConfigService]
        }).compile();

        controller = module.get<SimConfigController>(SimConfigController);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });
});
