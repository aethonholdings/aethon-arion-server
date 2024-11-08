# Arion

> Version 0.1

The Arion API description

## Path Table

| Method | Path | Description |
| --- | --- | --- |
| GET | [/arion/sim-config](#getarionsim-config) |  |
| POST | [/arion/sim-config](#postarionsim-config) |  |
| GET | [/arion/sim-config/next](#getarionsim-confignext) |  |
| GET | [/arion/sim-config/{id}](#getarionsim-configid) |  |
| DELETE | [/arion/sim-config/{id}](#deletearionsim-configid) |  |
| GET | [/arion/sim-config/{id}/result](#getarionsim-configidresult) |  |
| GET | [/arion/result](#getarionresult) |  |
| POST | [/arion/result](#postarionresult) |  |
| GET | [/arion/result/{id}](#getarionresultid) |  |
| GET | [/arion/org-config](#getarionorg-config) |  |
| POST | [/arion/org-config](#postarionorg-config) |  |
| GET | [/arion/org-config/{id}](#getarionorg-configid) |  |
| DELETE | [/arion/org-config/{id}](#deletearionorg-configid) |  |
| GET | [/arion/sim-set](#getarionsim-set) |  |
| POST | [/arion/sim-set](#postarionsim-set) |  |
| GET | [/arion/sim-set/{id}](#getarionsim-setid) |  |
| DELETE | [/arion/sim-set/{id}](#deletearionsim-setid) |  |
| GET | [/arion/sim-set/{id}/result](#getarionsim-setidresult) |  |
| GET | [/arion/sim-set/{id}/sim-config](#getarionsim-setidsim-config) |  |
| GET | [/arion/state-space/{id}](#getarionstate-spaceid) |  |
| GET | [/arion/seeds](#getarionseeds) |  |
| GET | [/arion/open-api](#getarionopen-api) |  |

## Reference Table

| Name | Path | Description |
| --- | --- | --- |
| Meta | [#/components/schemas/Meta](#componentsschemasmeta) |  |
| Links | [#/components/schemas/Links](#componentsschemaslinks) |  |
| Paginated | [#/components/schemas/Paginated](#componentsschemaspaginated) |  |
| SimConfigDTOGet | [#/components/schemas/SimConfigDTOGet](#componentsschemassimconfigdtoget) |  |
| StateSpacePointDTOCreate | [#/components/schemas/StateSpacePointDTOCreate](#componentsschemasstatespacepointdtocreate) |  |
| ConfiguratorParamsDTOGet | [#/components/schemas/ConfiguratorParamsDTOGet](#componentsschemasconfiguratorparamsdtoget) |  |
| ResultDTOGet | [#/components/schemas/ResultDTOGet](#componentsschemasresultdtoget) |  |
| SimConfigDTOCreate | [#/components/schemas/SimConfigDTOCreate](#componentsschemassimconfigdtocreate) |  |
| ResultDTOCreate | [#/components/schemas/ResultDTOCreate](#componentsschemasresultdtocreate) |  |
| OrgConfigDTOGet | [#/components/schemas/OrgConfigDTOGet](#componentsschemasorgconfigdtoget) |  |
| ConfiguratorParamsDTOCreate | [#/components/schemas/ConfiguratorParamsDTOCreate](#componentsschemasconfiguratorparamsdtocreate) |  |
| SimSetDTOGet | [#/components/schemas/SimSetDTOGet](#componentsschemassimsetdtoget) |  |
| SimSetDTOCreate | [#/components/schemas/SimSetDTOCreate](#componentsschemassimsetdtocreate) |  |

## Path Details

***

### [GET]/arion/sim-config

#### Parameters(Query)

```ts
page?: number
```

```ts
limit?: number
```

```ts
[][]
```

```ts
[][]
```

#### Responses

- 200 A Paginated<SimConfig> object

`application/json`

```ts
{
  meta: {
    // The metadata describing the position and size of the paginated data versus the full pagination set
    itemsPerPage: number
    // The total number of items in the paginated data set
    totalItems: number
    // The current page number
    currentPage: number
    // The total number of pages in the paginated data set
    totalPages: number
[][]
[][]
  }
  data?: string[]
  // The links to the first, previous, current, next, and last pages
  links: #/components/schemas/Links
}
```

***

### [POST]/arion/sim-config

#### RequestBody

- application/json

```ts
{
  // The unique identifier of the simulation set to generate a SimConfig for
  simSetId: number
  // The unique identifier of the OrgConfig to generate the simulation config for
  orgConfigId: number
  // The number of simulation 'days' to run the simulation for.
  days?: number
  // The type of random stream to use for the simulation. 'static' uses a deterministic sequence from fixed random seeds and is useful for testing, 'random' uses Math.random().
  randomStreamType?: enum[static, random]
}
```

#### Responses

- 200 The SimConfig object created by the request

`application/json`

```ts
{
  // The unique identifier of the simulation configuration
  id: number
  // The simulation set to which this simulation configuration belongs
  simSet: {
  }
  // The unique identifier of the simulation set to generate a SimConfig for
  simSetId: number
  // The organizational configuration for this simulation configuration
  orgConfig: {
  }
  // The unique identifier of the OrgConfig to generate the simulation config for
  orgConfigId: number
  // The number of runs executed for the simulation configuration
  runCount: number
  // The number of simulation 'days' to run the simulation for.
  days?: number
  // The type of random stream to use for the simulation. 'static' uses a deterministic sequence from fixed random seeds and is useful for testing, 'random' uses Math.random().
  randomStreamType?: enum[static, random]
  // The start date and time of the simulation
  start: string
  // The end date and time of the simulation
  end: string
  // The duration of the simulation in seconds
  durationSec: number
  // The average performance across all results of the SimConfig
  avgPerformance: number
  // The standard deviation of performance across all results of the SimConfig
  stdDevPerformance: number
  // The entropy of the results of the simulation
  entropy: number
  // The results of the simulation
  results: {
  }
}
```

***

### [GET]/arion/sim-config/next

#### Parameters(Query)

```ts
nodeId: string
```

#### Responses

- 200 The next simconfig to be executed by a node

`application/json`

```ts
{
  // The unique identifier of the simulation configuration
  id: number
  // The simulation set to which this simulation configuration belongs
  simSet: {
  }
  // The unique identifier of the simulation set to generate a SimConfig for
  simSetId: number
  // The organizational configuration for this simulation configuration
  orgConfig: {
  }
  // The unique identifier of the OrgConfig to generate the simulation config for
  orgConfigId: number
  // The number of runs executed for the simulation configuration
  runCount: number
  // The number of simulation 'days' to run the simulation for.
  days?: number
  // The type of random stream to use for the simulation. 'static' uses a deterministic sequence from fixed random seeds and is useful for testing, 'random' uses Math.random().
  randomStreamType?: enum[static, random]
  // The start date and time of the simulation
  start: string
  // The end date and time of the simulation
  end: string
  // The duration of the simulation in seconds
  durationSec: number
  // The average performance across all results of the SimConfig
  avgPerformance: number
  // The standard deviation of performance across all results of the SimConfig
  stdDevPerformance: number
  // The entropy of the results of the simulation
  entropy: number
  // The results of the simulation
  results: {
  }
}
```

***

### [GET]/arion/sim-config/{id}

#### Responses

- 200 The SimConfig object fetched by ID

`application/json`

```ts
{
  // The unique identifier of the simulation configuration
  id: number
  // The simulation set to which this simulation configuration belongs
  simSet: {
  }
  // The unique identifier of the simulation set to generate a SimConfig for
  simSetId: number
  // The organizational configuration for this simulation configuration
  orgConfig: {
  }
  // The unique identifier of the OrgConfig to generate the simulation config for
  orgConfigId: number
  // The number of runs executed for the simulation configuration
  runCount: number
  // The number of simulation 'days' to run the simulation for.
  days?: number
  // The type of random stream to use for the simulation. 'static' uses a deterministic sequence from fixed random seeds and is useful for testing, 'random' uses Math.random().
  randomStreamType?: enum[static, random]
  // The start date and time of the simulation
  start: string
  // The end date and time of the simulation
  end: string
  // The duration of the simulation in seconds
  durationSec: number
  // The average performance across all results of the SimConfig
  avgPerformance: number
  // The standard deviation of performance across all results of the SimConfig
  stdDevPerformance: number
  // The entropy of the results of the simulation
  entropy: number
  // The results of the simulation
  results: {
  }
}
```

***

### [DELETE]/arion/sim-config/{id}

#### Responses

- 200 The ID of the SimConfig deleted

`application/json`

```ts
{
  "type": "number"
}
```

***

### [GET]/arion/sim-config/{id}/result

#### Responses

- 200 An array of Result objects for the specified simulation configuration

`application/json`

```ts
{
  // The unique identifier of the simulation result
  id: number
  // The unique identifier of the simulation configuration that produced this result
  simConfigId: number
  // The ID of the organization configuration that produced this result
  orgConfigId: number
  // The unique identifier of the simulation set that produced this result
  simSetId: number
  // The simulation configuration that produced this result
  simConfig: {
  }
  // The run count of the simulation
  runCount: number
  // The unique identifier of the node that produced this result
  nodeId: string
  // The start datetime stamp of the simulation
  start: string
  // The end datetime stamp of the simulation
  end: string
  // The clock tick of the simulation
  clockTick: number
  // The computing time duration of the simulation in seconds
  durationSec: number
  agentStates?: number[]
  board?: number[]
  plant?: number[]
  reporting?: number[]
[][]
  // The state space points of the simulation
  stateSpace?: #/components/schemas/StateSpacePointDTOCreate
  // The value of the final performance metric of the result
  performance?: number
  // The sum of the squares of the values of the final priority tensor of the result
  priorityIntensity?: number
  // The number of agents in the simulation
  agentCount?: number
  // The type of organization configuration that produced this result
  orgConfigType?: string
  // The name of the configurator that produced this result
  configuratorName?: string
  // The parameters of the configurator that produced this result
  configuratorParams: #/components/schemas/ConfiguratorParamsDTOGet
}[]
```

***

### [GET]/arion/result

#### Parameters(Query)

```ts
page?: number
```

```ts
limit?: number
```

```ts
[][]
```

```ts
[][]
```

#### Responses

- 200 All result objects retrieved based on the search query given, paginated

`application/json`

```ts
{
  meta: {
    // The metadata describing the position and size of the paginated data versus the full pagination set
    itemsPerPage: number
    // The total number of items in the paginated data set
    totalItems: number
    // The current page number
    currentPage: number
    // The total number of pages in the paginated data set
    totalPages: number
[][]
[][]
  }
  data?: string[]
  // The links to the first, previous, current, next, and last pages
  links: #/components/schemas/Links
}
```

***

### [POST]/arion/result

#### RequestBody

- application/json

```ts
{
  // The unique identifier of the simulation configuration that produced this result
  simConfigId: number
  // The run count of the simulation
  runCount: number
  // The unique identifier of the node that produced this result
  nodeId: string
  // The start datetime stamp of the simulation
  start: string
  // The end datetime stamp of the simulation
  end: string
  // The clock tick of the simulation
  clockTick: number
  // The computing time duration of the simulation in seconds
  durationSec: number
  agentStates?: number[]
  board?: number[]
  plant?: number[]
  reporting?: number[]
[][]
  // The state space points of the simulation
  stateSpace?: #/components/schemas/StateSpacePointDTOCreate
}
```

#### Responses

- 200 The result object created

`application/json`

```ts
{
  // The unique identifier of the simulation result
  id: number
  // The unique identifier of the simulation configuration that produced this result
  simConfigId: number
  // The ID of the organization configuration that produced this result
  orgConfigId: number
  // The unique identifier of the simulation set that produced this result
  simSetId: number
  // The simulation configuration that produced this result
  simConfig: {
  }
  // The run count of the simulation
  runCount: number
  // The unique identifier of the node that produced this result
  nodeId: string
  // The start datetime stamp of the simulation
  start: string
  // The end datetime stamp of the simulation
  end: string
  // The clock tick of the simulation
  clockTick: number
  // The computing time duration of the simulation in seconds
  durationSec: number
  agentStates?: number[]
  board?: number[]
  plant?: number[]
  reporting?: number[]
[][]
  // The state space points of the simulation
  stateSpace?: #/components/schemas/StateSpacePointDTOCreate
  // The value of the final performance metric of the result
  performance?: number
  // The sum of the squares of the values of the final priority tensor of the result
  priorityIntensity?: number
  // The number of agents in the simulation
  agentCount?: number
  // The type of organization configuration that produced this result
  orgConfigType?: string
  // The name of the configurator that produced this result
  configuratorName?: string
  // The parameters of the configurator that produced this result
  configuratorParams: #/components/schemas/ConfiguratorParamsDTOGet
}
```

***

### [GET]/arion/result/{id}

#### Responses

- 200 The result object retrieved by ID

`application/json`

```ts
{
  // The unique identifier of the simulation result
  id: number
  // The unique identifier of the simulation configuration that produced this result
  simConfigId: number
  // The ID of the organization configuration that produced this result
  orgConfigId: number
  // The unique identifier of the simulation set that produced this result
  simSetId: number
  // The simulation configuration that produced this result
  simConfig: {
  }
  // The run count of the simulation
  runCount: number
  // The unique identifier of the node that produced this result
  nodeId: string
  // The start datetime stamp of the simulation
  start: string
  // The end datetime stamp of the simulation
  end: string
  // The clock tick of the simulation
  clockTick: number
  // The computing time duration of the simulation in seconds
  durationSec: number
  agentStates?: number[]
  board?: number[]
  plant?: number[]
  reporting?: number[]
[][]
  // The state space points of the simulation
  stateSpace?: #/components/schemas/StateSpacePointDTOCreate
  // The value of the final performance metric of the result
  performance?: number
  // The sum of the squares of the values of the final priority tensor of the result
  priorityIntensity?: number
  // The number of agents in the simulation
  agentCount?: number
  // The type of organization configuration that produced this result
  orgConfigType?: string
  // The name of the configurator that produced this result
  configuratorName?: string
  // The parameters of the configurator that produced this result
  configuratorParams: #/components/schemas/ConfiguratorParamsDTOGet
}
```

***

### [GET]/arion/org-config

#### Parameters(Query)

```ts
type?: string
```

#### Responses

- 200 An array of OrgConfig objects mathing the specified type, if supplied

`application/json`

```ts
{
  // The unique identifier of the organization configuration
  id: number
  // The type of model for the organization configuration
  type: string
  // The number of seconds per simulation clock tick
  clockTickSeconds: number
  // The number of agents in the organization
  agentCount: number
  // The board configuration tensor for the organization
  board: {
  }
  // The agent set configuration tensors for the organization
  agentSet: {
  }
  // The plant configuration tensor for the organization
  plant: {
  }
  // The reporting tensor for the organization
  reporting: {
  }
  // The sum of the squares of all elements in the priority tensor
  priorityIntensity: number
  // The sum of the squares of all elements in the influence tensor
  influenceIntensity: number
  // The sum of the squares of all elements in the judgment tensor
  judgmentIntensity: number
  // The sum of the squares of all elements in the incentive tensor
  incentiveIntensity: number
  // The parameters used to generate the organization configuration
  configuratorParams: {
  }
  simConfigs: {
  }[]
  // The name of the configurator class used to generate the organization configuration
  configuratorName?: string
}[]
```

***

### [POST]/arion/org-config

#### RequestBody

- application/json

```ts
{
  // The signature name of the Configurator to use for generating the OrgConfigs
  configuratorName: string
  // The data object containing the parameters for the model Configurator
  data: {
  }
}
```

#### Responses

- 200 The newly created OrgConfig object

`application/json`

```ts
{
  // The unique identifier of the organization configuration
  id: number
  // The type of model for the organization configuration
  type: string
  // The number of seconds per simulation clock tick
  clockTickSeconds: number
  // The number of agents in the organization
  agentCount: number
  // The board configuration tensor for the organization
  board: {
  }
  // The agent set configuration tensors for the organization
  agentSet: {
  }
  // The plant configuration tensor for the organization
  plant: {
  }
  // The reporting tensor for the organization
  reporting: {
  }
  // The sum of the squares of all elements in the priority tensor
  priorityIntensity: number
  // The sum of the squares of all elements in the influence tensor
  influenceIntensity: number
  // The sum of the squares of all elements in the judgment tensor
  judgmentIntensity: number
  // The sum of the squares of all elements in the incentive tensor
  incentiveIntensity: number
  // The parameters used to generate the organization configuration
  configuratorParams: {
  }
  simConfigs: {
  }[]
  // The name of the configurator class used to generate the organization configuration
  configuratorName?: string
}
```

***

### [GET]/arion/org-config/{id}

#### Responses

- 200 The OrgConfig object matching the specified ID

`application/json`

```ts
{
  // The unique identifier of the organization configuration
  id: number
  // The type of model for the organization configuration
  type: string
  // The number of seconds per simulation clock tick
  clockTickSeconds: number
  // The number of agents in the organization
  agentCount: number
  // The board configuration tensor for the organization
  board: {
  }
  // The agent set configuration tensors for the organization
  agentSet: {
  }
  // The plant configuration tensor for the organization
  plant: {
  }
  // The reporting tensor for the organization
  reporting: {
  }
  // The sum of the squares of all elements in the priority tensor
  priorityIntensity: number
  // The sum of the squares of all elements in the influence tensor
  influenceIntensity: number
  // The sum of the squares of all elements in the judgment tensor
  judgmentIntensity: number
  // The sum of the squares of all elements in the incentive tensor
  incentiveIntensity: number
  // The parameters used to generate the organization configuration
  configuratorParams: {
  }
  simConfigs: {
  }[]
  // The name of the configurator class used to generate the organization configuration
  configuratorName?: string
}
```

***

### [DELETE]/arion/org-config/{id}

#### Responses

- 200 The ID of the OrgConfig deleted

`application/json`

```ts
{
  "type": "number"
}
```

***

### [GET]/arion/sim-set

#### Responses

- 200 An array of all simulation sets, subject to a query filter

`application/json`

```ts
{
  // The unique identifier of the simulation set
  id: number
  // Text description of the simulation set
  description: string
  // The signature of the organisation model for which the simulation set is run
  type: string
  simConfigs: {
  }[]
  // The current state of the simulation set
  state: string
  // The number of simConfigs in the simulation set
  runCount: number
  // The number of runs completed in the simulation set
  completedRunCount: number
  // The number of simulation configurations completed in the simulation set
  completedSimConfigCount: number
}[]
```

***

### [POST]/arion/sim-set

#### RequestBody

- application/json

```ts
{
  // Text description of the simulation set
  description: string
  // The signature of the organisation model for which the simulation set is run
  type: string
}
```

#### Responses

- 200 The newly created simulation set

`application/json`

```ts
{
  // The unique identifier of the simulation set
  id: number
  // Text description of the simulation set
  description: string
  // The signature of the organisation model for which the simulation set is run
  type: string
  simConfigs: {
  }[]
  // The current state of the simulation set
  state: string
  // The number of simConfigs in the simulation set
  runCount: number
  // The number of runs completed in the simulation set
  completedRunCount: number
  // The number of simulation configurations completed in the simulation set
  completedSimConfigCount: number
}
```

***

### [GET]/arion/sim-set/{id}

#### Responses

- 200 The details of the simulation set

`application/json`

```ts
{
  // Text description of the simulation set
  description: string
  // The signature of the organisation model for which the simulation set is run
  type: string
}
```

***

### [DELETE]/arion/sim-set/{id}

#### Responses

- 200 The ID of the simulation set deleted

`application/json`

```ts
{
  "type": "number"
}
```

***

### [GET]/arion/sim-set/{id}/result

#### Responses

- 200 A Paginated<Result> object

`application/json`

```ts
{
  meta: {
    // The metadata describing the position and size of the paginated data versus the full pagination set
    itemsPerPage: number
    // The total number of items in the paginated data set
    totalItems: number
    // The current page number
    currentPage: number
    // The total number of pages in the paginated data set
    totalPages: number
[][]
[][]
  }
  data?: string[]
  // The links to the first, previous, current, next, and last pages
  links: #/components/schemas/Links
}
```

***

### [GET]/arion/sim-set/{id}/sim-config

#### Responses

- 200 A Paginated<SimConfig> object

`application/json`

```ts
{
  meta: {
    // The metadata describing the position and size of the paginated data versus the full pagination set
    itemsPerPage: number
    // The total number of items in the paginated data set
    totalItems: number
    // The current page number
    currentPage: number
    // The total number of pages in the paginated data set
    totalPages: number
[][]
[][]
  }
  data?: string[]
  // The links to the first, previous, current, next, and last pages
  links: #/components/schemas/Links
}
```

***

### [GET]/arion/state-space/{id}

#### Responses

- 200 

***

### [GET]/arion/seeds

#### Responses

- 200 The static random number generator seeds for the simulation

`application/json`

```ts
[]
```

***

### [GET]/arion/open-api

#### Responses

- 200 The OpenAPI specification of the Arion API as an @nestjs/swagger OpenAPIObject

`application/json`

```ts
{
}
```

## References

### #/components/schemas/Meta

```ts
{
  // The metadata describing the position and size of the paginated data versus the full pagination set
  itemsPerPage: number
  // The total number of items in the paginated data set
  totalItems: number
  // The current page number
  currentPage: number
  // The total number of pages in the paginated data set
  totalPages: number
[][]
[][]
}
```

### #/components/schemas/Links

```ts
{
  // The link to the first page
  first: string
  // The link to the previous page
  previous?: string
  // The link to the current page
  current: string
  // The link to the next page
  next?: string
  // The link to the last page
  last: string
}
```

### #/components/schemas/Paginated

```ts
{
  meta: {
    // The metadata describing the position and size of the paginated data versus the full pagination set
    itemsPerPage: number
    // The total number of items in the paginated data set
    totalItems: number
    // The current page number
    currentPage: number
    // The total number of pages in the paginated data set
    totalPages: number
[][]
[][]
  }
  data?: string[]
  // The links to the first, previous, current, next, and last pages
  links: #/components/schemas/Links
}
```

### #/components/schemas/SimConfigDTOGet

```ts
{
  // The unique identifier of the simulation configuration
  id: number
  // The simulation set to which this simulation configuration belongs
  simSet: {
  }
  // The unique identifier of the simulation set to generate a SimConfig for
  simSetId: number
  // The organizational configuration for this simulation configuration
  orgConfig: {
  }
  // The unique identifier of the OrgConfig to generate the simulation config for
  orgConfigId: number
  // The number of runs executed for the simulation configuration
  runCount: number
  // The number of simulation 'days' to run the simulation for.
  days?: number
  // The type of random stream to use for the simulation. 'static' uses a deterministic sequence from fixed random seeds and is useful for testing, 'random' uses Math.random().
  randomStreamType?: enum[static, random]
  // The start date and time of the simulation
  start: string
  // The end date and time of the simulation
  end: string
  // The duration of the simulation in seconds
  durationSec: number
  // The average performance across all results of the SimConfig
  avgPerformance: number
  // The standard deviation of performance across all results of the SimConfig
  stdDevPerformance: number
  // The entropy of the results of the simulation
  entropy: number
  // The results of the simulation
  results: {
  }
}
```

### #/components/schemas/StateSpacePointDTOCreate

```ts
{
  // The clock tick for which the state space point is recorded
  clockTick: number
  board?: number[]
  agentStates?: number[]
  plant?: number[]
  reporting?: number[]
[][]
}
```

### #/components/schemas/ConfiguratorParamsDTOGet

```ts
{
  // The signature name of the Configurator to use for generating the OrgConfigs
  configuratorName: string
  // The data object containing the parameters for the model Configurator
  data: {
  }
}
```

### #/components/schemas/ResultDTOGet

```ts
{
  // The unique identifier of the simulation result
  id: number
  // The unique identifier of the simulation configuration that produced this result
  simConfigId: number
  // The ID of the organization configuration that produced this result
  orgConfigId: number
  // The unique identifier of the simulation set that produced this result
  simSetId: number
  // The simulation configuration that produced this result
  simConfig: {
  }
  // The run count of the simulation
  runCount: number
  // The unique identifier of the node that produced this result
  nodeId: string
  // The start datetime stamp of the simulation
  start: string
  // The end datetime stamp of the simulation
  end: string
  // The clock tick of the simulation
  clockTick: number
  // The computing time duration of the simulation in seconds
  durationSec: number
  agentStates?: number[]
  board?: number[]
  plant?: number[]
  reporting?: number[]
[][]
  // The state space points of the simulation
  stateSpace?: #/components/schemas/StateSpacePointDTOCreate
  // The value of the final performance metric of the result
  performance?: number
  // The sum of the squares of the values of the final priority tensor of the result
  priorityIntensity?: number
  // The number of agents in the simulation
  agentCount?: number
  // The type of organization configuration that produced this result
  orgConfigType?: string
  // The name of the configurator that produced this result
  configuratorName?: string
  // The parameters of the configurator that produced this result
  configuratorParams: #/components/schemas/ConfiguratorParamsDTOGet
}
```

### #/components/schemas/SimConfigDTOCreate

```ts
{
  // The unique identifier of the simulation set to generate a SimConfig for
  simSetId: number
  // The unique identifier of the OrgConfig to generate the simulation config for
  orgConfigId: number
  // The number of simulation 'days' to run the simulation for.
  days?: number
  // The type of random stream to use for the simulation. 'static' uses a deterministic sequence from fixed random seeds and is useful for testing, 'random' uses Math.random().
  randomStreamType?: enum[static, random]
}
```

### #/components/schemas/ResultDTOCreate

```ts
{
  // The unique identifier of the simulation configuration that produced this result
  simConfigId: number
  // The run count of the simulation
  runCount: number
  // The unique identifier of the node that produced this result
  nodeId: string
  // The start datetime stamp of the simulation
  start: string
  // The end datetime stamp of the simulation
  end: string
  // The clock tick of the simulation
  clockTick: number
  // The computing time duration of the simulation in seconds
  durationSec: number
  agentStates?: number[]
  board?: number[]
  plant?: number[]
  reporting?: number[]
[][]
  // The state space points of the simulation
  stateSpace?: #/components/schemas/StateSpacePointDTOCreate
}
```

### #/components/schemas/OrgConfigDTOGet

```ts
{
  // The unique identifier of the organization configuration
  id: number
  // The type of model for the organization configuration
  type: string
  // The number of seconds per simulation clock tick
  clockTickSeconds: number
  // The number of agents in the organization
  agentCount: number
  // The board configuration tensor for the organization
  board: {
  }
  // The agent set configuration tensors for the organization
  agentSet: {
  }
  // The plant configuration tensor for the organization
  plant: {
  }
  // The reporting tensor for the organization
  reporting: {
  }
  // The sum of the squares of all elements in the priority tensor
  priorityIntensity: number
  // The sum of the squares of all elements in the influence tensor
  influenceIntensity: number
  // The sum of the squares of all elements in the judgment tensor
  judgmentIntensity: number
  // The sum of the squares of all elements in the incentive tensor
  incentiveIntensity: number
  // The parameters used to generate the organization configuration
  configuratorParams: {
  }
  simConfigs: {
  }[]
  // The name of the configurator class used to generate the organization configuration
  configuratorName?: string
}
```

### #/components/schemas/ConfiguratorParamsDTOCreate

```ts
{
  // The signature name of the Configurator to use for generating the OrgConfigs
  configuratorName: string
  // The data object containing the parameters for the model Configurator
  data: {
  }
}
```

### #/components/schemas/SimSetDTOGet

```ts
{
  // The unique identifier of the simulation set
  id: number
  // Text description of the simulation set
  description: string
  // The signature of the organisation model for which the simulation set is run
  type: string
  simConfigs: {
  }[]
  // The current state of the simulation set
  state: string
  // The number of simConfigs in the simulation set
  runCount: number
  // The number of runs completed in the simulation set
  completedRunCount: number
  // The number of simulation configurations completed in the simulation set
  completedSimConfigCount: number
}
```

### #/components/schemas/SimSetDTOCreate

```ts
{
  // Text description of the simulation set
  description: string
  // The signature of the organisation model for which the simulation set is run
  type: string
}
```