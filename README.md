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
        convergenceMargin: number;                  // set the standard deviation estimation change percent margin to test for convergence
        minRuns: number;                            // minimum runs to perform per simulation config
        randomStreamType: "static" | "random";      // default random stream generator; static is useful for testing
        simulationDays: number;                     // default number of simulation days
    }
}
```

## Database migrations

The schema is managed by the migrations shipped in `aethon-arion-db` (exported as `migrations`). Set `database.migrationsRun: true` to apply pending migrations on startup, and keep `synchronize: false` in production.

- On a database created earlier with `synchronize`, the baseline migration detects the existing schema and is only recorded as applied.
- `RunTicketsDoublePrecision` adds the `run` table (dispatch tickets), `result.runId` / `result.late`, `configurator_params.modelVersion` and a dispatch index. It also converts performance and duration columns to `double` in place (`MODIFY COLUMN`, no data loss).
- `purgeOnStart: true` truncates every table on startup, and only in a `dev` environment. `synchronize` alone never deletes data.

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