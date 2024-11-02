import { PaginateQuery } from "aethon-nestjs-paginate";

export const simConfigControllerTestData: { [key: string]: { days: number; randomStreamType: "static" | "random" } } = {
    basic: {
        days: 10,
        randomStreamType: "random"
    }
};

export const indexTestQuery: PaginateQuery = {
    orderBy: [["avgPerformance", "DESC"]]
};

export const simConfigControllerSimulationTestResults = {
    basic: {
        avgPerformance: 9588.04,
        entropy: 3.41023,
        state: "completed"
    }
};
