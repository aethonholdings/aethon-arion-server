import { Module } from "@nestjs/common";
import { SimConfigController } from "./endpoints/sim-config/sim-config.controller";
import { ResultController } from "./endpoints/result/result.controller";
import { SimConfigService } from "./endpoints/sim-config/sim-config.service";
import { ResultService } from "./endpoints/result/result.service";
import { OrgConfigController } from "./endpoints/org-config/org-config.controller";
import { OrgConfigService } from "./endpoints/org-config/org-config.service";
import { SimSetController } from "./endpoints/sim-set/sim-set.controller";
import { SimSetService } from "./endpoints/sim-set/sim-set.service";
import { StateSpaceController } from "./endpoints/state-space/state-space.controller";
import { StateSpaceService } from "./endpoints/state-space/state-space.service";
import { SeedsController } from "./endpoints/seeds/seeds.controller";
import { SeedsService } from "./endpoints/seeds/seeds.service";
import { ModelService } from "./services/model/model.service";
import { OptimiserService } from "./services/optimiser/optimiser.service";
import { ConfiguratorParamsService } from "./services/configurator-params/configurator-params.service";
import { ConvergenceTestService } from "./services/convergence-test/convergence-test.service";

@Module({
    controllers: [
        SimConfigController,
        ResultController,
        OrgConfigController,
        SimSetController,
        StateSpaceController,
        SeedsController
    ],
    providers: [SimConfigService, ResultService, OrgConfigService, SimSetService, StateSpaceService, SeedsService,
        ModelService,
        OptimiserService,
        ConfiguratorParamsService,
        ConvergenceTestService
    ]
})
export class CoreModule {}
