import { Injectable, Logger } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { ConvergenceTest, OrgConfig, SimConfig } from "aethon-arion-db";
import {
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    OptimiserStateDTO,
    SimConfigParamsDTO,
    States
} from "aethon-arion-pipeline";
import { ServerEnvironment } from "src/common/types/server.types";
import environment from "env/environment";
import { OrgConfigService } from "../../endpoints/org-config/org-config.service";
import { SimConfigService } from "../../endpoints/sim-config/sim-config.service";

@Injectable()
export class ConvergenceTestService {
    private _logger: Logger = new Logger(ConvergenceTestService.name);
    private _dev: boolean = false;
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private orgConfigService: OrgConfigService,
        private simConfigService: SimConfigService
    ) {
        this._dev = this._env.root.dev;
    }

    create(
        configuratorParamsDTOs: ConfiguratorParamsDTO<ConfiguratorParamData>[],
        simConfigParamsDTO: SimConfigParamsDTO,
        optimiserState: OptimiserStateDTO<ConfiguratorParamData>,
        tEntityManager?: EntityManager
    ): Promise<ConvergenceTest[]> {
        // create a new convergence test
        if (!Array.isArray(configuratorParamsDTOs)) configuratorParamsDTOs = [configuratorParamsDTOs];
        if (!tEntityManager) tEntityManager = this.dataSource.createEntityManager();
        if (this._dev) this._logger.log(`Creating convergence tests`);
        // cycle through all the required config parameters and look for a corresponding convergence test
        // at the SimSets SimConfigParams level

        return tEntityManager
            .getRepository(ConvergenceTest)
            .find({
                where: {
                    configuratorParams: {
                        id: In(configuratorParamsDTOs.map((param) => param.id))
                    },
                    simConfigParams: { id: simConfigParamsDTO.id }
                }
            })
            .then(async (convergenceTests: ConvergenceTest[]) => {
                // if the convergence test does not exist, create it
                for (let configuratorParamDTO of configuratorParamsDTOs) {
                    let convergenceTest = convergenceTests.find(
                        (convergenceTest: ConvergenceTest) =>
                            convergenceTest?.configuratorParams.id === configuratorParamDTO.id
                    );
                    if (!convergenceTest) {
                        convergenceTest = await tEntityManager.getRepository(ConvergenceTest).save({
                            configuratorParams: configuratorParamDTO,
                            simConfigParams: simConfigParamsDTO,
                            state: States.PENDING,
                            orgConfigCount: 0,
                            simConfigCount: 0,
                            completedSimConfigCount: 0,
                            resultCount: 0,
                            dispatchedRuns: 0,
                            converged: false,
                            optimiserStates: [optimiserState]
                        });
                    }
                    convergenceTests = [...convergenceTests, convergenceTest];
                }
                return convergenceTests;
            })
            .then(async (convergenceTests: ConvergenceTest[]) => {
                // generate the sim and org configurations for the convergence test
                for (let convergenceTest of convergenceTests) {
                    // ****** ORG CONFIGS
                    const orgConfigs: OrgConfig[] = await this.orgConfigService.create(
                        convergenceTest.configuratorParams,
                        tEntityManager
                    );
                    // ****** SIM CONFIGS
                    let simConfigs: SimConfig[] = [];
                    for (let orgConfig of orgConfigs) {
                        simConfigs = [...simConfigs, await this.simConfigService.create(
                            convergenceTest.simConfigParams,
                            orgConfig,
                            convergenceTest,
                            tEntityManager
                        )];
                    }
                    await tEntityManager.getRepository(ConvergenceTest).update(convergenceTest.id, {
                        orgConfigCount: orgConfigs.length,
                        simConfigCount: simConfigs.length
                    });
                }
                return convergenceTests;
            })
            .then((convergenceTests: ConvergenceTest[]) => {
                if (this._dev) this._logger.log(`Convergence tests created`);
                return convergenceTests;
            });
    }
}
