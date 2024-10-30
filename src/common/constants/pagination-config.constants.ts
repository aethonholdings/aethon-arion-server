import { Result, SimConfig } from "aethon-arion-db";
import { PaginateConfig } from "../utils/paginate/paginate.index";

export const simConfigPaginationConfig: PaginateConfig<SimConfig> = {
    limit: 100,
    limitMax: 100,
    orderBy: [["avgPerformance", "DESC"]]
};

export const resultPaginationConfig: PaginateConfig<Result> = {
    limit: 100,
    limitMax: 100,
    orderBy: [["performance", "DESC"]]
};
