import { DomainTypes, ModelParamsDTO, OptimiserParameters, SimConfigParamsDTO } from "aethon-arion-pipeline";

export const simSetControllerTestData = {
    basic: {
        modelName: "C1",
        optimiserName: "",
        configuratorName: "",
        description: "Basic test",
        modelParams: {} as ModelParamsDTO,
        simConfigParams: {} as SimConfigParamsDTO,
        optimiserParams: {
            init: { type: "random" },
            parameterSpace: [
                {
                    id: "spans",
                    domain: { type: DomainTypes.DISCRETE, optimise: true, min: 1, max: 3, derivativeStepSize: 1 }
                }
            ],
            iterations: { learningRate: 0.01, tolerance: 0.0001, max: 10 }
        } as OptimiserParameters
    }
};
