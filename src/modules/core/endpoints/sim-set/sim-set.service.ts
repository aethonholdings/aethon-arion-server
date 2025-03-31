import environment from "../../../../../env/environment";
import {
    ConfiguratorParams,
    ConvergenceTest,
    OptimiserState,
    OrgConfig,
    SimConfig,
    SimConfigParams,
    SimSet
} from "aethon-arion-db";
import {
    ConfiguratorParamData,
    Model,
    Optimiser,
    OptimiserData,
    OptimiserParameters,
    OrgConfigDTO,
    RandomStreamType,
    SimSetDTO,
    States
} from "aethon-arion-pipeline";
import { Injectable, Logger } from "@nestjs/common";
import { And, DataSource, In, Not } from "typeorm";
import { ModelService } from "../../services/model/model.service";
import { SimSetDTOCreate } from "../../../../common/dto/sim-set.dto";
import { OptimiserService } from "../../services/optimiser/optimiser.service";
import { ServerEnvironment } from "src/common/types/server.types";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class SimSetService {
    private _logger: Logger = new Logger(SimSetService.name);
    private _dev: boolean = false;
    private _env: ServerEnvironment = environment();

    constructor(
        private dataSource: DataSource,
        private modelService: ModelService,
        private optimiserService: OptimiserService
    ) {
        this._dev = environment().root.dev;
    }

    async onApplicationBootstrap() {
        // await this.touch();
    }

    findAll(query: any): Promise<SimSetDTO[]> {
        return this.dataSource.getRepository(SimSet).find(query);
    }

    findOne(id: number): Promise<SimSetDTO> {
        return this.dataSource.getRepository(SimSet).findOneOrFail({
            where: { id: id },
            relations: { optimiserStates: true, simConfigParams: true }
        });
    }

    async create(simSetDTO: SimSetDTOCreate): Promise<SimSetDTO> {
        const model: Model<ConfiguratorParamData, OptimiserParameters, OptimiserData> = this.modelService.getModel(
            simSetDTO.modelName
        );
        const configuratorName: string = simSetDTO.configuratorName || model.getDefaultConfigurator().name;
        const optimiserName: string = simSetDTO.optimiserName || model.getDefaultOptimiser().name;
        if (model) {
            // find the SimConfigParams or initialise them to default
            let randomStreamType: RandomStreamType = this._env.options.randomStreamType;
            let days: number = this._env.options.simulationDays;
            if (simSetDTO.simConfigParams) {
                randomStreamType = simSetDTO.simConfigParams.randomStreamType;
                days = simSetDTO.simConfigParams.days;
            }
            let simConfigParams: SimConfigParams = await this.dataSource.getRepository(SimConfigParams).findOne({
                where: {
                    randomStreamType: randomStreamType,
                    days: days
                }
            });
            if (!simConfigParams) {
                simConfigParams = await this.dataSource.getRepository(SimConfigParams).save({
                    days: this._env.options.simulationDays,
                    randomStreamType: this._env.options.randomStreamType
                });
            }
            // Create the SimSet with an empty optimiserStates array
            // initialise withthe default optimiser by default for the time being
            let optimiser: Optimiser<ConfiguratorParamData, OptimiserParameters, OptimiserData>;
            optimiser = model.getOptimiser(optimiserName);

            // start a transaction to save the sim set
            let simSet: SimSet;
            let optimiserState: OptimiserState;
            let configuratorParams: ConfiguratorParams[] = [];
            let convergenceTests: ConvergenceTest[] = [];
            return this.dataSource.transaction(async (tEntityManager) => {
                // ****** PARENT SIMSET
                // create the simSet
                if (this._dev) this._logger.log(`Creating sim set`);
                return await tEntityManager
                    .getRepository(SimSet)
                    .save({
                        ...simSetDTO,
                        modelParams: model.getParameters(),
                        optimiserName: optimiser.name,
                        configuratorName: configuratorName,
                        state: States.PENDING,
                        optimiserStates: [],
                        simConfigParams: simConfigParams,
                        currentOptimiserStateId: null,
                        currentConvergenceTestIds: []
                    })
                    .then(async (simSetTmp: SimSet) => {
                        simSet = simSetTmp;
                        if (this._dev) this._logger.log(`Sim set ${simSet.id} created`);

                        // ****** OPTIMISER STATE
                        // initialise the optimiser state
                        if (this._dev) this._logger.log(`Creating optimiser state`);
                        let optimiserState: OptimiserState = await tEntityManager.getRepository(OptimiserState).save({
                            ...optimiser.initialise(),
                            simSet: simSet,
                            status: States.PENDING,
                            converged: false,
                            start: new Date(),
                            stepCount: 0
                        });
                        simSet.currentOptimiserStateId = optimiserState.id;
                        await tEntityManager.getRepository(SimSet).save(simSet);
                        return optimiserState;
                    })
                    .then(async (optimiserStateTmp: OptimiserState) => {
                        optimiserState = optimiserStateTmp;
                        if (this._dev) this._logger.log(`Optimiser state created`);

                        // ****** CONFIGURATOR PARAMS
                        // assess the configurator params required in the current optimiser state
                        // find whether they correspond to existing configurator params
                        // if not, create them

                        // first get what configuratorParams are required by the optimiser step
                        if (this._dev) this._logger.log(`Creating required ConfiguratorParams`);
                        const requiredConfiguratorParams: {
                            multipleOrgConfigs: boolean;
                            configuratorParams: {
                                configuratorParamData: ConfiguratorParamData;
                                hash: string;
                            };
                        }[] = optimiser.getStateRequiredConfiguratorParams(optimiserState);
                        const requiredHashes: string[] = requiredConfiguratorParams.map(
                            (param) => param.configuratorParams.hash
                        );
                        // fetch the configurator params already in the database against the hashes required
                        // by the optimiser state
                        configuratorParams = await tEntityManager
                            .getRepository(ConfiguratorParams)
                            .find({ where: { hash: In(requiredHashes) } });
                        // check if all the required configurator params are in the database
                        let configuratorParamsNew: ConfiguratorParams[] = [];
                        for (let requiredConfiguratorParam of requiredConfiguratorParams) {
                            // check if a ConfiguratorParam entity was found in the database with the same hash
                            // as the required ConfiguratorParam
                            if (
                                !configuratorParams.find(
                                    (param) => param.hash === requiredConfiguratorParam.configuratorParams.hash
                                )
                            ) {
                                // the ConfiguratorParam hash was not found in the database, create a configurator param
                                let configuratorParamsTmp = {
                                    data: requiredConfiguratorParam.configuratorParams.configuratorParamData,
                                    hash: requiredConfiguratorParam.configuratorParams.hash,
                                    multipleOrgConfigs: requiredConfiguratorParam.multipleOrgConfigs,
                                    modelName: model.name,
                                    configuratorName: configuratorName
                                } as ConfiguratorParams;
                                configuratorParamsNew.push(configuratorParamsTmp);
                            }
                        }
                        configuratorParams.push(
                            ...(await tEntityManager.getRepository(ConfiguratorParams).save(configuratorParamsNew))
                        );
                        return configuratorParams;
                    })
                    .then(async (configuratorParams: ConfiguratorParams[]) => {
                        if (this._dev) this._logger.log(`ConfiguratorParams created`);

                        // ****** CONVERGENCE TESTS
                        // Generate the convergence tests against the configurator params required by the optimiser state

                        if (this._dev) this._logger.log(`Creating convergence tests`);
                        // cycle through all the required config parameters and look for a corresponding convergence test
                        // at the SimSets SimConfigParams level
                        for (let configuratorParam of configuratorParams) {
                            let convergenceTest: ConvergenceTest = await tEntityManager
                                .getRepository(ConvergenceTest)
                                .findOne({
                                    where: {
                                        configuratorParams: {
                                            id: configuratorParam.id
                                        },
                                        simConfigParams: { id: simSet.simConfigParams.id }
                                    }
                                });
                            // if the convergence test does not exist, create it
                            if (!convergenceTest) {
                                convergenceTest = await tEntityManager.getRepository(ConvergenceTest).save({
                                    configuratorParams: configuratorParam,
                                    simConfigParams: simSet.simConfigParams,
                                    state: States.PENDING,
                                    orgConfigCount: 0,
                                    simConfigCount: 0,
                                    completedSimConfigCount: 0,
                                    resultCount: 0,
                                    dispatchedRuns: 0,
                                    converged: false,
                                    optimiserStates: []
                                });
                            }
                            convergenceTest.optimiserStates.push(optimiserState);
                            convergenceTests.push(convergenceTest);
                        }
                        // return only the newly generated convergence tests to create simConfigs against them
                        return await tEntityManager.getRepository(ConvergenceTest).save(convergenceTests);
                    })
                    .then(async (convergenceTests: ConvergenceTest[]) => {
                        if (this._dev) this._logger.log(`Convergence tests created`);

                        // ****** ORG AND SIM CONFIGS
                        // generate the org configs required for each convergence test
                        if (this._dev) this._logger.log(`Creating org configs`);
                        const newOrgConfigDTOs: OrgConfigDTO[] = [];
                        let orgConfigs: OrgConfig[] = [];
                        for (let configuratorParam of configuratorParams) {
                            // see if relevant orgConfigs exist
                            let orgConfigCountMin: number = 1;
                            if (configuratorParam.multipleOrgConfigs) orgConfigCountMin = this._env.options.minRuns;
                            let orgConfigsTmp: OrgConfig[] = await tEntityManager.getRepository(OrgConfig).find({
                                where: {
                                    configuratorParams: { id: configuratorParam.id }
                                }
                            });
                            orgConfigs = [...orgConfigs, ...orgConfigsTmp];
                            // check if the required number of orgConfigs paired with a simConfig exist
                            if (orgConfigsTmp.length < orgConfigCountMin) {
                                // create the required number of orgConfigs
                                for (let i = 0; i < orgConfigCountMin - orgConfigsTmp.length; i++) {
                                    let orgConfigTmp = {
                                        ...model.getConfigurator(configuratorName).generate(configuratorParam),
                                        simConfigs: [],
                                        configuratorName: configuratorName,
                                        configuratorParams: configuratorParam,
                                        type: model.name
                                    };
                                    // orgConfigTmp.configuratorParams = configuratorParam;
                                    newOrgConfigDTOs.push(orgConfigTmp);
                                }
                            }
                        }
                        const newOrgConfigSaved: OrgConfig[] = await tEntityManager
                            .getRepository(OrgConfig)
                            .save(newOrgConfigDTOs);
                        orgConfigs = [...orgConfigs, ...newOrgConfigSaved];
                        return orgConfigs;
                    })
                    .then(async (orgConfigs: OrgConfig[]) => {
                        if (this._dev) this._logger.log(`Org configs created`);

                        // ****** SIM CONFIGS
                        // generate the sim configs required for each convergence test
                        if (this._dev) this._logger.log(`Creating sim configs`);
                        const simConfigs: SimConfig[] = [];
                        for (let convergenceTest of convergenceTests) {
                            let orgConfigFiltered = orgConfigs.filter(
                                (orgConfig) => orgConfig.configuratorParams.id === convergenceTest.configuratorParams.id
                            );
                            for (let orgConfig of orgConfigFiltered) {
                                const simConfig: SimConfig = await tEntityManager.getRepository(SimConfig).save({
                                    orgConfig: orgConfig,
                                    simSet: simSet,
                                    state: States.PENDING,
                                    results: [],
                                    simConfigParams: simConfigParams,
                                    convergenceTest: convergenceTest,
                                    dispatchedRuns: 0,
                                    runCount: 0,
                                    days: simConfigParams.days,
                                    randomStreamType: simConfigParams.randomStreamType
                                });
                                simConfig.convergenceTest.simConfigCount++;
                                simConfig.convergenceTest.orgConfigCount++;
                                simConfigs.push(simConfig);
                            }
                        }
                        for (let simConfig of simConfigs) {
                            await tEntityManager.getRepository(ConvergenceTest).update(simConfig.convergenceTest.id, {
                                simConfigCount: simConfig.convergenceTest.simConfigCount,
                                orgConfigCount: simConfig.convergenceTest.orgConfigCount
                            });
                        }
                        return simConfigs;
                    })
                    .then(() => {
                        return tEntityManager.getRepository(SimSet).save(simSet);
                    });
            });
        } else {
            throw new Error("Invalid model name");
        }
    }

    delete(id: number): Promise<number> {
        return this.modelService.deleteRecord(id, this._logger, this.dataSource.getRepository(SimSet));
    }

    // @Cron("30 * * * * *")
    async touch() {
        if (this._dev) this._logger.log(`Touching sim sets`);
        const simSets: SimSet[] = await this.dataSource.getRepository(SimSet).find({
            where: { state: And(Not(States.COMPLETED), Not(States.FAILED)) },
            relations: { optimiserStates: { simSet: { simConfigParams: true } }, simConfigParams: true }
        });
        for (let simSet of simSets) {
            await this.touchSimSet(simSet);
        }
    }

    async touchSimSet(simSet: SimSet): Promise<SimSet> {
        if (simSet.state === States.COMPLETED || simSet.state === States.FAILED) return simSet;
        if (this._dev) this._logger.log(`Touching sim set ${simSet.id}`);

        if (simSet.optimiserStates.length > 0) {
            let completed: number = 0;
            simSet.optimiserStates.forEach(async (optimiserState) => {
                await this.optimiserService.touchState(optimiserState);
                if (optimiserState.status === States.COMPLETED) completed++;
                if (optimiserState.status === States.FAILED) simSet.state = States.FAILED;
                if (optimiserState.status === States.RUNNING && simSet.state !== States.FAILED) {
                    simSet.state = States.RUNNING;
                }
            });
            if (simSet.optimiserStates.length > 0 && completed === simSet.optimiserStates.length)
                simSet.state = States.COMPLETED;
        }
        await this.dataSource.getRepository(SimSet).save(simSet);
        return this.dataSource
            .getRepository(SimSet)
            .findOneOrFail({
                where: { id: simSet.id },
                relations: { optimiserStates: { simSet: { simConfigParams: true } }, simConfigParams: true }
            })
            .then((simSet) => {
                if (this._dev) this._logger.log(`Sim set ${simSet.id} touched`);
                return simSet;
            });
    }
}
