export type Cacheable<T> = { key: string; cached: boolean; start: number; end?: number; ttl: number; data: T };
export type CacheStrategyOptions = { key: string; cached: boolean; cache: boolean; ttl?: number };
export type KeyBuilder = any[];
export type RequestWithMeta = Request & { meta: { id: string; startTimeStamp: number } };
