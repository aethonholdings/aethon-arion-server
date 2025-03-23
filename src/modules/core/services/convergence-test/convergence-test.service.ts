import { Injectable, Logger } from "@nestjs/common";
import { And, DataSource, Not } from "typeorm";
import { ConvergenceTest } from "aethon-arion-db";
import {
    ConfiguratorParamData,
    ConfiguratorParamsDTO,
    OrgConfigDTO,
    SimConfigParamsDTO,
    States
} from "aethon-arion-pipeline";
import { SimConfigDTO, ConvergenceTestDTO } from "aethon-arion-pipeline";
import { OrgConfigService } from "../../endpoints/org-config/org-config.service";
import { SimConfigService } from "../../endpoints/sim-config/sim-config.service";
import { ServerEnvironment } from "src/common/types/server.types";
import environment from "env/environment";

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
        simConfigParamsDTO: SimConfigParamsDTO,
        configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParamData>
    ): Promise<ConvergenceTest> {
        // create a new convergence test
        if (this._dev) this._logger.log(`Generating new convergence test`);
        return this.dataSource
            .getRepository(ConvergenceTest)
            .save({
                simConfigParams: simConfigParamsDTO,
                configuratorParams: configuratorParamsDTO,
                orgConfigCount: 0,
                simConfigCount: 0,
                completedSimConfigCount: 0,
                resultCount: 0,
                dispatchedRuns: 0,
                avgPerformance: null,
                stdDevPerformance: null,
                processingTimeSec: null,
                state: States.PENDING,
                converged: false
            })
            .then((convergenceTest: ConvergenceTest) => {
                if (this._dev) this._logger.log(`Convergence test ${convergenceTest.id} created`);
                return convergenceTest;
            })
            .then(async (convergenceTest: ConvergenceTest) => {
                // generate a sim config based on the convergence test
                // return the convergence test
                const orgConfig: OrgConfigDTO = await this.generateOrgConfig(convergenceTest);
                await this.generateSimConfig(convergenceTest, orgConfig);
                await this.dataSource.getRepository(ConvergenceTest).update(convergenceTest.id, convergenceTest);
                return this.dataSource.getRepository(ConvergenceTest).findOne({
                    where: { id: convergenceTest.id },
                    relations: { simConfigs: true, simConfigParams: true, configuratorParams: true }
                });
            })
            .then(async (convergenceTest: ConvergenceTest) => {
                await this.touchConvergenceTest(convergenceTest);
                return convergenceTest;
            });
    }

    async generateSimConfig(convergenceTestDTO: ConvergenceTestDTO, orgConfigDTO: OrgConfigDTO): Promise<SimConfigDTO> {
        // generate an org config based on the convergence test
        if (this._dev) this._logger.log(`Generating new sim config for convergence test ${convergenceTestDTO.id}`);
        return this.simConfigService
            .create(
                orgConfigDTO.id,
                convergenceTestDTO.id,
                convergenceTestDTO.simConfigParams.randomStreamType,
                convergenceTestDTO.simConfigParams.days
            )
            .then((simConfig) => {
                if (this._dev)
                    this._logger.log(
                        `Sim config ${simConfig.id} created for convergence test ${convergenceTestDTO.id}`
                    );
                return simConfig;
            });
    }

    async generateOrgConfig(convergenceTestDTO: ConvergenceTestDTO): Promise<OrgConfigDTO> {
        // generate an org config based on the convergence test
        if (this._dev) this._logger.log(`Generating new org config for convergence test ${convergenceTestDTO.id}`);
        return this.orgConfigService.create(convergenceTestDTO.configuratorParams).then((orgConfig) => {
            if (this._dev)
                this._logger.log(`Org config ${orgConfig.id} created for convergence test ${convergenceTestDTO.id}`);
            return orgConfig;
        });
    }

    async touchConvergenceTest(convergenceTest: ConvergenceTest) {
        // touch the convergence test
        if (this._dev) this._logger.log(`Touching convergence test ${convergenceTest.id}`);
        convergenceTest.simConfigCount = convergenceTest.simConfigs.length;

        let completed: number = 0;
        let avgSumTmp: number = 0;
        let stdDevSumTmp: number = 0;
        convergenceTest.resultCount = 0;
        convergenceTest.dispatchedRuns = 0;
        convergenceTest.processingTimeSec = 0;
        convergenceTest.simConfigCount = convergenceTest.simConfigs.length;
        convergenceTest.orgConfigCount = convergenceTest.simConfigCount;

        for (let simConfig of convergenceTest.simConfigs) {
            if (simConfig.state === States.COMPLETED) {
                convergenceTest.completedSimConfigCount++;
                completed++;
            }
            if (simConfig.state === States.FAILED) convergenceTest.state = States.FAILED;
            if (simConfig.state === States.RUNNING && convergenceTest.state !== States.FAILED)
                convergenceTest.state = States.RUNNING;
            convergenceTest.orgConfigCount;
            convergenceTest.resultCount += simConfig.runCount;
            convergenceTest.dispatchedRuns += simConfig.dispatchedRuns;
            convergenceTest.processingTimeSec += simConfig.durationSec;
            avgSumTmp += simConfig.avgPerformance;
            stdDevSumTmp += simConfig.stdDevPerformance;
        }
        if (convergenceTest.simConfigs.length > 0 && completed === convergenceTest.simConfigs.length)
            convergenceTest.state = States.COMPLETED;

        // the following can be done with a query
        if (convergenceTest.simConfigCount) {
            convergenceTest.avgPerformance = avgSumTmp / convergenceTest.simConfigCount;
            convergenceTest.stdDevPerformance = stdDevSumTmp / convergenceTest.simConfigCount;
        } else {
            convergenceTest.avgPerformance = null;
            convergenceTest.stdDevPerformance = null;
        }
        // update the convergence test
        await this.dataSource
            .getRepository(ConvergenceTest)
            .save(convergenceTest)
            .then((convergenceTest) => {
                if (this._dev) this._logger.log(`Convergence test ${convergenceTest.id} touched`);
                return convergenceTest;
            });
    }
}
