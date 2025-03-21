import { Injectable } from "@nestjs/common";
import { ModelService } from "../model/model.service";
import { DataSource } from "typeorm";
import {
    ConfiguratorParamsDTO,
    ObjectHash,
    OptimiserData,
    OptimiserStateDTO,
    SimSetDTO,
    States
} from "aethon-arion-pipeline";
import { ConfiguratorParams, OptimiserState } from "aethon-arion-db";
import { ConvergenceTestService } from "../convergence-test/convergence-test.service";
import { ConfiguratorParamsService } from "../configurator-params/configurator-params.service";

@Injectable()
export class OptimiserService {
    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        private convergenceTestService: ConvergenceTestService,
        private configuratorParamsService: ConfiguratorParamsService
    ) {}

    async createState(
        simSetDTO: SimSetDTO,
        optimiserStateDTO: OptimiserStateDTO<OptimiserData>
    ): Promise<OptimiserStateDTO<OptimiserData>> {
        const model = this.modelService.getModel(simSetDTO.modelName);
        let stepCount: number;
        simSetDTO?.optimiserStates ? (stepCount = simSetDTO.optimiserStates.length) : (stepCount = 0);

        const optimiserState = await this.dataSource.getRepository(OptimiserState).save({
            ...optimiserStateDTO,
            stepCount: stepCount,
            simSet: simSetDTO,
            start: new Date(),
            status: States.PENDING,
            percentComplete: 0,
            modelName: model.name,
            converged: false
        });

        // Touch the state to kick off the optimiser
        await this.touchState(optimiserState);
        return optimiserState;
    }

    touchAll() {}

    async touchState(optimiserState: OptimiserStateDTO<OptimiserData>): Promise<OptimiserStateDTO<OptimiserData>> {
        // check if converged
        if (optimiserState.status === States.COMPLETED && optimiserState.converged) return optimiserState;
        const model = this.modelService.getModel(optimiserState.modelName);
        const optimiser = model.getOptimiser(optimiserState.optimiserName);
        if (optimiserState.status === States.PENDING) {
            // get the configParams required to be completed for this step
            const configParams = optimiser.getStateRequiredSimConfigs(optimiserState);

            // cycle through all the simconfigs required to perform the step
            let completed = true;
            for (let configParam of configParams) {
                // check if the simconfig exists
                let tmp = await this.configuratorParamsService.findOne({ configParams: configParam });

                // for each configuratorParams, check whether it exists and is completed
                if (!tmp) {
                    // no configuratorParams found, create a new one
                    completed = false;
                    const configuratorParamsDTO: ConfiguratorParamsDTO<ConfiguratorParams> =
                        await this.configuratorParamsService.create(model, configParam);
                    // create a convergence test
                    await this.convergenceTestService.create(
                        optimiserState.simSet.simConfigParams,
                        configuratorParamsDTO
                    );
                } else {
                    if (tmp.data.status !== States.COMPLETED) completed = false;
                }
            }
            if (completed) {
                optimiserState.status = States.COMPLETED;
                optimiserState.end = new Date();
                optimiserState.durationSec = (optimiserState.end.getTime() - optimiserState.start.getTime()) / 1000;
                this.dataSource.getRepository(OptimiserState).save(optimiserState);
            } else {
                return optimiserState;
            }
        }
        if (optimiserState.status === States.COMPLETED) {
            // step the optimiser forward
            return optimiser.step(optimiserState);
        }
    }
}
