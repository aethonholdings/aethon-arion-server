# aethon-arion-server

## Description

This package defines the [Arion](https://arion.aethon.sg/) simulation server, built with [Nest.js](https://nestjs.com/) and used by the computation node and the analyst client as the RESTful single source of truth repository and API, as specified on the project's [homepage](https://arion.aethon.sg/our-tools/).

## Installation

```
npm install -s
```

## Configuration

Define runtime environments under the `env` directory, as e.g. `environment.dev.ts`.  An example file is provided in `environment.example.ts`.  

The `default` function in these environmnet files should return an object under the interface `ServerEnvironment` as follows:

```
export interface ServerEnvironment {
    root: {
        name: string;                               // the name of the environment e.g. dev
        dev: boolean;                               // flag on whether this is development environment (enables extra logging)
        listen: number;                             // port for the server to listen to
    }
    database: {                                     // typeORM database parameters
        type: string;                               // database type e.g. mysql
        host: string;                               // hostname for database server
        port: number;                               // database server port 
        username: string;                           // database username
        password: string;                           // database password
        database: string;                           // the name of the database
        synchronize: boolean;                       // whether TypeORM synchronises the schema to the entities on startup; must be false for production (use migrations)
        purgeOnStart?: boolean;                     // dev only: truncate all tables on startup; ignored unless root.dev is true
        migrationsRun?: boolean;                    // run pending aethon-arion-db migrations on startup
        logging?: boolean                           // enable database SQL query logging, useful for debugging/ development
        entities: string[]                          // entity filesystem absolute path; required in the dev environment to run jest tests
    };
    options: {
        storeStateSpace: boolean;                   // whether the server saves state space data by default
        convergenceMargin: number;                  // runs per simulation config: target standard error of the mean, as a fraction of |mean| (e.g. 0.01)
        orgConfigConvergenceMargin?: number;        // org configs per convergence test: the same across org config means (default 0.05)
        convergenceAbsoluteError?: number;          // absolute standard error floor for means near 0 (default 0)
        minSimRuns: number;                         // minimum runs per simulation config
        maxSimRuns?: number;                        // cap on runs per simulation config (default 1000)
        maxRunFailures?: number;                    // failed runs reported by nodes before a simulation config is failed (default 3)
        minOrgConfigs: number;                      // minimum org configs per convergence test
        maxOrgConfigs?: number;                     // cap on org configs per convergence test (default 200)
        randomStreamType: "static" | "random";      // default random stream generator; static is useful for testing
        simulationDays: number;                     // default number of simulation days
    }
    auth?: {
        nodes?: "required" | "off";                 // "off" admits nodes without a key, while existing nodes are switched over (default "required")
        loginAttemptsPerMinute?: number;            // POST /auth/node attempts per client address per minute (default 5)
    }
}
```

## Database migrations

The schema is managed by the migrations shipped in `aethon-arion-db` (exported as `migrations`). Set `database.migrationsRun: true` to apply pending migrations on startup, and keep `synchronize: false` in production.

- On a database created earlier with `synchronize`, the baseline migration detects the existing schema and is only recorded as applied.
- `RunTicketsDoublePrecision` adds the `run` table (dispatch tickets), `result.runId` / `result.late`, `configurator_params.modelVersion` and a dispatch index. It also converts performance and duration columns to `double` in place (`MODIFY COLUMN`, no data loss).
- `npm run db:reset` re-initialises the database from the command line: it drops every table, then applies all migrations, leaving an empty database at the current schema version. It asks you to type the database name (`-- --yes` skips this for scripts). Operator accounts and authorised nodes are deleted too, so every node must log in again, unless you pass `-- --keep-auth`. Stop the server first.
- `purgeOnStart: true` truncates every table on startup, and only in a `dev` environment.
- `synchronize` runs only on a database without the Arion tables when the server is on MariaDB: TypeORM's synchronize drops and re-creates JSON columns there (MariaDB stores them as LONGTEXT and TypeORM sees a type change), which erases their data on every start. On MySQL it runs as configured.

## Failed runs

A node that cannot complete a run reports it with `POST /arion/run/:id/failure`. After `maxRunFailures` failed runs the simulation config is failed and no longer dispatched (otherwise a config that crashes every node would block the queue), and its convergence test, optimiser state and SimSet are failed. A later SimSet with the same parameters reuses the convergence test and reopens it: its failed simulation configs are dispatched again and their earlier failures no longer count.

## Tests

`npm run test:unit` and `npm run test:e2e:ci` need a MySQL or MariaDB server (`ARION_DB_HOST`, `ARION_DB_PORT`, `ARION_DB_USER`, `ARION_DB_PASSWORD`, `ARION_DB_NAME`; run `npm run test:setup` first). The e2e suites use their own database, `<ARION_DB_NAME>_e2e`, recreated empty at the start of each run.

## Convergence

A simulation config is converged once it has at least `minSimRuns` results and the standard error of its mean performance, s/√n with the sample standard deviation, is at most `max(convergenceMargin × |mean|, convergenceAbsoluteError)`. A convergence test applies the same rule to the means of its org configs, starting from `minOrgConfigs` and using `orgConfigConvergenceMargin` (default 5%). `maxSimRuns` and `maxOrgConfigs` cap the cost; reaching a cap is logged. The number of runs needed is about (CV / convergenceMargin)², where CV is the coefficient of variation of performance. For example, CV 0.5 with a 1% margin needs about 2,500 runs.

## Common random numbers

Org config k of a convergence test is generated from seed (base seed, k), and run j of it uses random streams derived from (base seed, k, j); `GET /sim-config/next` returns these keys as `seedKeys`. Every optimiser point therefore evaluates the same random scenarios, so the finite-difference gradients compare like with like. The base seed is 0 for `static` simulation parameters and drawn once for `random` ones.

## Optimiser

- The optimiser stops when the gradient is confidently small: the norm of |slope| + 2 SE over the parameters is below `iterations.tolerance`.
- Gradients are paired differences between optimiser points over matched org config replicates, which share their random draws.
- The SimSet ends after `iterations.max` optimiser states when that is set, or when a step would revisit points the SimSet has already evaluated.

## Node authentication

Nodes must be authorised before the server hands them work. The node endpoints (`GET /arion/sim-config/next`, `POST /arion/result`, `POST /arion/run/:id/failure`) require `Authorization: Bearer <key>`; the analyst's endpoints are not restricted.

1. Create an operator account on the server: `npm run user:create` (prompts for the username and the password; at least 10 characters).
2. On each node, run `npm run login`: it asks for the server address and the operator's credentials, and `POST /arion/auth/node` returns a key bound to the node's machine id. Only the SHA-256 hash of the key is stored, in the `authorised_node` table, with the node's hostname, the time it was authorised, the operator who authorised it and when it was last seen.
3. Manage nodes from the command line:

| Command | Effect |
|---|---|
| `npm run user:create [username]` | Creates an operator account (`ARION_USER_PASSWORD` instead of the prompt, for scripts) |
| `npm run user:disable <username>` | Stops the account authorising nodes; nodes it authorised keep their keys |
| `npm run node:list` | Lists authorised nodes |
| `npm run node:revoke <id>` | Revokes a node's key; the node stops and must log in again |
| `npm run db:reset -- [--keep-auth] [--yes]` | Empties and re-initialises the database (see Database migrations) |

| Rule | Detail |
|---|---|
| Expiry | None: a key is valid until revoked or replaced by a new authorisation of the same machine |
| Node ids | A `nodeId` in a request must be the key's machine id or `<machine id>:<instance>`, otherwise `403` |
| Login attempts | `auth.loginAttemptsPerMinute` per client address (default 5), then `429` |
| Passwords | scrypt with a random salt; a wrong password, an unknown user and a disabled user get the same `401` |
| Switch-over | `auth.nodes: "off"` admits nodes without a key, while existing nodes are authorised; the default is `"required"` |
| Transport | Run the server behind TLS: the password and the key are sent in the clear over plain http |

The `user` and `authorised_node` tables come from the `NodeAuth` migration in `aethon-arion-db`. `purgeOnStart` keeps them.

## Node protocol

`GET /arion/sim-config/next?nodeId=...` returns the next simulation configuration together with a run ticket (`runId`, `runIndex`). The node seeds its random streams from `(simConfig id, runIndex)`. It then posts the result to `POST /arion/result` with `runId`. Posting is idempotent per `runId`, so a re-post returns the stored result. Lock contention is answered with `503` and `Retry-After`.

Results produced before model version 2 (aethon-arion-c1 0.5) are kept but never pooled with new ones, because the model version is part of the configurator params hash.

## Running

To run the server for the development environment

```
npm run start:dev
```

## API

The code implements the API specified under `./docs/api`.

At present there is no node authentication, JWT and https so the application is meant to be run on a local rather than public network.  

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)