import { PaginateQuery } from "nestjs-paginate";

export const simConfigControllerTestData: { [key: string]: { days: number; randomStreamType: "static" | "random" } } = {
    basic: {
        days: 100,
        randomStreamType: "static"
    }
};

export const indexTestQuery: PaginateQuery = {
    path: "/sim-config",
    sortBy: [["avgPerformance", "DESC"]]
};
