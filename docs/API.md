# Arion
The Arion API description

## Version: 0.1


### /arion/sim-config

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| simSetId | query | The unique identifier of the simulation set to filter the SimConfigs by | No | number |
| page | query | Page number to retrieve.If you provide invalid value the default page number will applied         <p>              <b>Example: </b> 1           </p>         <p>              <b>Default Value: </b> 1           </p>          | No | number |
| limit | query | Number of records per page.       <p>              <b>Example: </b> 20           </p>       <p>              <b>Default Value: </b> 100           </p>       <p>              <b>Max Value: </b> 100           </p>        If provided value is greater than max value, max value will be applied.        | No | number |
| sortBy | query | Parameter to sort by.       <p>To sort by multiple fields, just provide query param multiple types. The order in url defines an order of sorting</p>       <p>              <b>Format: </b> fieldName:DIRECTION           </p>       <p>              <b>Example: </b> sortBy=id:DESC&sortBy=createdAt:ASC           </p>       <p>              <b>Default Value: </b> avgPerformance:DESC           </p>       <h4>Available Fields</h4><ul><li>avgPerformance</li></ul>        | No | [ string ] |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |

#### POST
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The SimConfig object created by the request |

### /arion/sim-config/next

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| nodeId | query | The identifier of the node requesting the next SimConfig | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The next simconfig to be executed by a node |

### /arion/sim-config/{id}

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The unique identifier of the SimConfig to be fetched | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The SimConfig object fetched by ID |

#### DELETE
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The ID of the SimConfig to be deleted | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The ID of the SimConfig deleted |

### /arion/sim-config/{id}/result

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The unique identifier of the SimConfig to fetch the results for | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | An array of Result objects for the specified simulation configuration |

### /arion/result

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| simSetId | path | The unique identifier of the simulation set to retrieve results for | No | number |
| simConfigId | path | The unique identifier of the simulation configuration to retrieve results for | No | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | An array of all simulation results, subject to a query filter by SimConfigId or SimSetId |

#### POST
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The result object created |

### /arion/result/{id}

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The unique identifier of the result to retrieve | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The result object retrieved by ID |

### /arion/org-config

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| type | query | Optional - filter OrgConfigurations by the type of model | No | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | An array of OrgConfig objects mathing the specified type, if supplied |

#### POST
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The newly created OrgConfig object |

### /arion/org-config/{id}

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The ID of the OrgConfig to be fetched | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The OrgConfig object matching the specified ID |

#### DELETE
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The ID of the OrgConfig to be deleted | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The ID of the OrgConfig deleted |

### /arion/sim-set

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | An array of all simulation sets, subject to a query filter |

#### POST
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The newly created simulation set |

### /arion/sim-set/{id}

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The unique identifier of the simulation set | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The details of the simulation set |

#### DELETE
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The unique identifier of the simulation set to be deleted | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The ID of the simulation set deleted |

### /arion/sim-set/{id}/result

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The unique identifier of the simulation set to fetch the results for | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | An array of Result objects for the specified simulation set |

### /arion/sim-set/{id}/sim-config

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The unique identifier of the simulation set to fetch the SimConfigs for | Yes | number |
| page | query | Page number to retrieve.If you provide invalid value the default page number will applied         <p>              <b>Example: </b> 1           </p>         <p>              <b>Default Value: </b> 1           </p>          | No | number |
| limit | query | Number of records per page.       <p>              <b>Example: </b> 20           </p>       <p>              <b>Default Value: </b> 100           </p>       <p>              <b>Max Value: </b> 100           </p>        If provided value is greater than max value, max value will be applied.        | No | number |
| sortBy | query | Parameter to sort by.       <p>To sort by multiple fields, just provide query param multiple types. The order in url defines an order of sorting</p>       <p>              <b>Format: </b> fieldName:DIRECTION           </p>       <p>              <b>Example: </b> sortBy=id:DESC&sortBy=createdAt:ASC           </p>       <p>              <b>Default Value: </b> avgPerformance:DESC           </p>       <h4>Available Fields</h4><ul><li>avgPerformance</li></ul>        | No | [ string ] |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |

### /arion/state-space/{id}

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| id | path | The id of the result to which the state space belongs | Yes | number |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |

### /arion/seeds

#### GET
##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | The static random number generator seeds for the simulation |
