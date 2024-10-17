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
        synchronize: boolean;                       // whether to synchronise tables and delete the database on server startup; must be false for production
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