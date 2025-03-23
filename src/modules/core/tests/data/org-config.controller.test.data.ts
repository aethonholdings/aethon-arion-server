import { ConfiguratorParamsDTOCreate } from "../../../../common/dto/configurator-param.dto";

export const orgConfigControllerCreateTestData: { [key: string]: ConfiguratorParamsDTOCreate } = {
    basic: {
        data: {
            board: { controlStep: false },
            gains: { judgment: 0.00001, incentive: 0.00000001, influence: 0.000001 },
            graph: "teams",
            spans: 1,
            layers: 1,
            reporting: { unitPrice: 1, unitPayroll: 1 },
            matrixInit: { judgment: "random", incentive: "purposeful", influence: "null" },
            actionStateProbability: 0.85
        },
        configuratorName: "C1Configurator",
        modelName: "C1",
        multipleOrgConfigs: true,
    }
};
