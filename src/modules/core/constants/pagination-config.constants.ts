import { PaginateConfig } from "aethon-nestjs-paginate";

export const simConfigPaginationConfig: PaginateConfig = {
    limit: 100,
    limitMax: 100,
    orderBy: [["avgPerformance", "DESC"]],
    relations: ["orgConfig"]
};

export const resultPaginationConfig: PaginateConfig = {
    limit: 100,
    limitMax: 100,
    orderBy: [["performance", "DESC"]]
};

export const simSetPaginationConfig: PaginateConfig = {
    limit: 100,
    limitMax: 100,
    orderBy: [["id", "DESC"]]
};
