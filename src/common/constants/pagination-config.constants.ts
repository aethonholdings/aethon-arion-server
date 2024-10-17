import { SimConfig } from "aethon-arion-db";
import { PaginateConfig } from "nestjs-paginate";

export const simConfigPaginationConfig: PaginateConfig<SimConfig> = {
    defaultLimit: 100,
    maxLimit: 100,
    loadEagerRelations: false,
    sortableColumns: ["avgPerformance"],
    defaultSortBy: [["avgPerformance", "DESC"]]
};