import { Module } from "@nestjs/common";
import { SimConfigController } from "./endpoints/sim-config/sim-config.controller";
import { ResultController } from "./endpoints/result/result.controller";
import { SimConfigService } from "./endpoints/sim-config/sim-config.service";
import { ResultService } from "./endpoints/result/result.service";
import { ModelService } from './services/model/model.service';
import { OrgConfigController } from './endpoints/org-config/org-config.controller';
import { OrgConfigService } from './endpoints/org-config/org-config.service';
import { SimSetController } from './endpoints/sim-set/sim-set.controller';
import { SimSetService } from './endpoints/sim-set/sim-set.service';
import { StateSpaceController } from './endpoints/state-space/state-space.controller';
import { StateSpaceService } from './endpoints/state-space/state-space.service';

@Module({
    controllers: [
        SimConfigController,
        ResultController,
        OrgConfigController,
        SimSetController,
        StateSpaceController
    ],
    providers: [
        ModelService,
        SimConfigService,
        ResultService,
        OrgConfigService,
        SimSetService,
        StateSpaceService
    ]
})
export class ModelModule {}
