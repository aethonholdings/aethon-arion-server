import { Injectable, Logger } from "@nestjs/common";
import { ModelService } from "../model/model.service";
import { DataSource } from "typeorm";
import { ConfiguratorParamsDTO, OptimiserData, OptimiserStateDTO, SimSetDTO, States } from "aethon-arion-pipeline";
import { ConfiguratorParams, ConvergenceTest, OptimiserState } from "aethon-arion-db";
import { ConvergenceTestService } from "../convergence-test/convergence-test.service";
import { ConfiguratorParamsService } from "../configurator-params/configurator-params.service";
import { ServerEnvironment } from "src/common/types/server.types";
import environment from "env/environment";

@Injectable()
export class OptimiserService {
    private _dev: boolean = false;
    private _logger: Logger = new Logger(OptimiserService.name);
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        private convergenceTestService: ConvergenceTestService,
        private configuratorParamsService: ConfiguratorParamsService
    ) {
        this._dev = this._env.root.dev;
    }

    async createState(
        simSetDTO: SimSetDTO,
        optimiserStateDTO: OptimiserStateDTO<OptimiserData>
    ): Promise<OptimiserStateDTO<OptimiserData>> {
        const model = this.modelService.getModel(simSetDTO.modelName);
        let stepCount: number;
        simSetDTO?.optimiserStates ? (stepCount = simSetDTO.optimiserStates.length) : (stepCount = 0);

        return this.dataSource
            .getRepository(OptimiserState)
            .save({
                ...optimiserStateDTO,
                stepCount: stepCount,
                simSet: simSetDTO,
                start: new Date(),
                status: States.PENDING,
                percentComplete: 0,
                modelName: model.name,
                converged: false
            })
            .then((optimiserState: OptimiserState) => {
                return this.dataSource
                    .getRepository(OptimiserState)
                    .findOne({ where: { id: optimiserState.id }, relations: { simSet: { simConfigParams: true } } });
            })
            .then(async (optimiserState: OptimiserState) => {
                await this.touchState(optimiserState);
                return optimiserState;
            });
    }

    async touchState(optimiserState: OptimiserState): Promise<OptimiserState> {
        if (this._dev) this._logger.log(`Touching optimiser state ${optimiserState.id}`);
        // check if converged
        if (
            (optimiserState.status === States.COMPLETED && optimiserState.converged) ||
            optimiserState.status === States.FAILED
        )
            return optimiserState;
        const model = this.modelService.getModel(optimiserState.modelName);
        const optimiser = model.getOptimiser(optimiserState.optimiserName);

        // get the configParams required to be completed for this step
        const configParams = optimiser.getStateRequiredConfiguratorParams(optimiserState);
        const convergenceTests: ConvergenceTest[] = [];

        // cycle through all the simconfigs required to perform the step
        for (let configParam of configParams) {
            // check if the configuratorParams instance exists
            let id: number = (
                await this.configuratorParamsService.findOne({
                    configParams: configParam.configuratorParams.configuratorParamData
                })
            )?.id;
            // for each configuratorParams, check whether it exists and is completed
            if (!id) {
                // no configuratorParams found, create a new one
                const configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParams> =
                    await this.configuratorParamsService.create(
                        model,
                        configParam.configuratorParams.configuratorParamData,
                        model.getDefaultConfigurator().name,
                        configParam.multipleOrgConfigs
                    );
                // create a convergence test
                id = (
                    await this.convergenceTestService.create(
                        optimiserState.simSet.simConfigParams,
                        configuratorParamsDTO
                    )
                ).id;
            }
            // the configurator params exist; check if there are convergence tests against it
            // vis-a-vis the SimSet
            await this.dataSource
                .createQueryBuilder(ConvergenceTest, "convergenceTest")
                .leftJoinAndSelect("convergenceTest.simConfigs", "simConfigs")
                .leftJoinAndSelect("convergenceTest.simConfigParams", "simConfigParams")
                .leftJoinAndSelect("convergenceTest.configuratorParams", "configuratorParams")
                .andWhere("convergenceTest.configuratorParamsId = :configuratorParamsId", {
                    configuratorParamsId: id
                })
                .andWhere("convergenceTest.simConfigParamsId = :simConfigParamsId", {
                    simConfigParamsId: optimiserState.simSet.simConfigParams.id
                })
                .getMany()
                .then((results) => {
                    results.forEach((convergenceTest) => {
                        convergenceTests.push(convergenceTest);
                    });
                });
        }
        let completed: number = 0;
        for (let convergenceTest of convergenceTests) {
            // touch the convergence test
            await this.convergenceTestService.touchConvergenceTest(convergenceTest);
            if (convergenceTest.state === States.COMPLETED) completed++;
            if (convergenceTest.state === States.FAILED) optimiserState.status = States.FAILED;
            if (convergenceTest.state === States.RUNNING && optimiserState.status !== States.FAILED)
                optimiserState.status = States.RUNNING;
        }
        if (convergenceTests.length > 0 && completed === convergenceTests.length) {
            // update the optimiser state
            const tmp = optimiser.update(optimiserState, convergenceTests);
            tmp.status = States.COMPLETED;
            tmp.end = new Date();
            tmp.durationSec = (optimiserState.end.getTime() - optimiserState.start.getTime()) / 1000;
            tmp.percentComplete = 1;
            tmp.converged = true;
            await this.dataSource.getRepository(OptimiserState).update(optimiserState.id, tmp);
        }
        return this.dataSource
            .getRepository(OptimiserState)
            .save(optimiserState)
            .then((optimiserState) => {
                return this.dataSource
                    .getRepository(OptimiserState)
                    .findOne({ where: { id: optimiserState.id }, relations: { simSet: { simConfigParams: true } } });
            })
            .then((optimiserState) => {
                if (this._dev) this._logger.log(`Optimiser state ${optimiserState.id} touched`);
                // if the step is completed, step the optimiser
                if (optimiserState.converged && optimiserState.status === States.COMPLETED) {
                    if (this._dev) this._logger.log(`Stepping optimiser ${optimiser.name}`);
                    console.log(optimiser.step(optimiserState));
                    // this.createState(optimiserState.simSet, optimiser.step(optimiserState));
                }
                return optimiserState;
            });
    }
}
