import { ModelParamsDTO, OptimiserParameters, SimConfigParamsDTO } from "aethon-arion-pipeline";

export const simSetControllerTestData = {
    basic: {
        modelName: "C1",
        optimiserName: "",
        configuratorName: "",
        description: "Basic test",
        modelParams: {} as ModelParamsDTO,
        simConfigParams: {} as SimConfigParamsDTO,
        optimiserParams: {} as OptimiserParameters
    }
};
