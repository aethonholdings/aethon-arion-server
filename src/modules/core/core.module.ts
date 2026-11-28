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
import { ConvergenceTestService } from "./services/convergence-test/convergence-test.service";
import { OptimiserStateService } from "./endpoints/optimiser-state/optimiser-state.service";
import { OptimiserStateController } from "./endpoints/optimiser-state/optimiser-state.controller";
import { RunController } from "./endpoints/run/run.controller";
import { RunService } from "./endpoints/run/run.service";
import { AuthModule } from "../auth/auth.module";
import { ProgressController } from "./endpoints/progress/progress.controller";
import { ProgressService } from "./endpoints/progress/progress.service";
import { FleetController } from "./endpoints/fleet/fleet.controller";
import { FleetService } from "./endpoints/fleet/fleet.service";
import { NodeController } from "./endpoints/node/node.controller";
import { NodeService } from "./endpoints/node/node.service";

@Module({
    imports: [AuthModule],
    controllers: [
        SimConfigController,
        ResultController,
        OrgConfigController,
        SimSetController,
        StateSpaceController,
        SeedsController,
        OptimiserStateController,
        RunController,
        ProgressController,
        FleetController,
        NodeController
    ],
    providers: [SimConfigService, ResultService, OrgConfigService, SimSetService, StateSpaceService, SeedsService,
        ModelService,
        OptimiserStateService,
        ConvergenceTestService,
        RunService,
        ProgressService,
        FleetService,
        NodeService
    ]
})
export class CoreModule {}
