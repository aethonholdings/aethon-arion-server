import { HttpException, HttpStatus } from "@nestjs/common";
import { EntityNotFoundError, QueryFailedError } from "typeorm";
import { DefaultExceptionFilter } from "../../../../common/filters/default-exception/default-exception.filter";
import { isRetryableTransactionError, withTransactionRetry } from "../../../../common/utils/transaction";
import { standardErrorConvergence } from "../../../../common/utils/convergence";
import { DatabaseService } from "../../../database/services/database.service";

const queryError = (errno: number) => new QueryFailedError("SELECT 1", [], Object.assign(new Error(`errno ${errno}`), { errno }) as any);

describe("DefaultExceptionFilter", () => {
    const respond = (exception: any) => {
        const response: any = { headers: {} as any, statusCode: 0, body: null };
        response.setHeader = (k: string, v: string) => (response.headers[k] = v);
        response.status = (code: number) => ((response.statusCode = code), response);
        response.json = (body: any) => ((response.body = body), response);
        const host: any = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ url: "/x", method: "GET", meta: { id: "r", startTimeStamp: Date.now() } }) }) };
        new DefaultExceptionFilter().catch(exception, host);
        return response;
    };
    it("maps lock contention to 503 with Retry-After", () => {
        for (const errno of [1205, 1213]) {
            const r = respond(queryError(errno));
            expect(r.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
            expect(r.headers["Retry-After"]).toBe("1");
        }
    });
    it("maps duplicates to 409, missing references to 400, other database errors to 500", () => {
        expect(respond(queryError(1062)).statusCode).toBe(HttpStatus.CONFLICT);
        expect(respond(queryError(1452)).statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect(respond(queryError(1054)).statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
    it("keeps HttpException statuses and maps missing entities to 404", () => {
        expect(respond(new HttpException("bad", HttpStatus.BAD_REQUEST)).statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect(respond(new EntityNotFoundError("SimSet", {})).statusCode).toBe(HttpStatus.NOT_FOUND);
        expect(respond(new Error("boom")).statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(respond(new Error("boom")).body.success).toBe(false);
    });
});

describe("withTransactionRetry", () => {
    const source = (failures: any[]) => {
        let calls = 0;
        return {
            calls: () => calls,
            dataSource: {
                transaction: async (isolation: string, work: any) => {
                    expect(isolation).toBe("READ COMMITTED");
                    calls++;
                    if (failures.length > 0) throw failures.shift();
                    return work({});
                }
            } as any
        };
    };
    it("re-runs the transaction on deadlocks and lock wait timeouts", async () => {
        const s = source([queryError(1213), queryError(1205)]);
        await expect(withTransactionRetry(s.dataSource, async () => "ok", 4, 1)).resolves.toBe("ok");
        expect(s.calls()).toBe(3);
    });
    it("does not retry other errors and gives up after the attempt limit", async () => {
        const other = source([queryError(1062)]);
        await expect(withTransactionRetry(other.dataSource, async () => "ok", 4, 1)).rejects.toBeInstanceOf(QueryFailedError);
        expect(other.calls()).toBe(1);
        const persistent = source([queryError(1213), queryError(1213), queryError(1213)]);
        await expect(withTransactionRetry(persistent.dataSource, async () => "ok", 3, 1)).rejects.toBeInstanceOf(QueryFailedError);
        expect(persistent.calls()).toBe(3);
        expect(isRetryableTransactionError(queryError(1205))).toBe(true);
        expect(isRetryableTransactionError(new Error("x"))).toBe(false);
    });
});

describe("DatabaseService purge on start", () => {
    const service = (database: any, root: any) => {
        const queries: string[] = [];
        const queryRunner = { connect: async () => {}, release: async () => {}, query: async (q: string) => queries.push(q) };
        const dataSource: any = { createQueryRunner: () => queryRunner, entityMetadatas: [{ tableName: "sim_set" }, { tableName: "result" }] };
        const s = new DatabaseService(dataSource);
        (s as any)._dbConfig = database;
        (s as any)._rootConfig = root;
        return { s, queries };
    };
    it("truncates every table on one connection only with purgeOnStart in a dev environment", async () => {
        const dev = service({ purgeOnStart: true, synchronize: true }, { dev: true });
        await dev.s.onApplicationBootstrap();
        expect(dev.queries).toEqual(["SET FOREIGN_KEY_CHECKS = 0;", "TRUNCATE `sim_set`;", "TRUNCATE `result`;", "SET FOREIGN_KEY_CHECKS = 1;"]);
    });
    it("never truncates outside dev, or because of synchronize alone", async () => {
        for (const [database, root] of [[{ purgeOnStart: true }, { dev: false }], [{ synchronize: true }, { dev: true }]]) {
            const x = service(database, root);
            await x.s.onApplicationBootstrap();
            expect(x.queries).toEqual([]);
        }
    });
});

describe("standard-error stopping rule (statistical precision)", () => {
    // seeded normal draws (mulberry32 + Box-Muller)
    let a = 12345;
    const U = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const N = () => Math.sqrt(-2 * Math.log(U() + 1e-300)) * Math.cos(2 * Math.PI * U());
    it("stops near the theoretical sample size and delivers the requested precision", () => {
        const mu = 100, sigma = 30, rel = 0.02, theoretical = (sigma / (rel * mu)) ** 2; // 225
        const stops: number[] = [], errors: number[] = [];
        for (let rep = 0; rep < 300; rep++) {
            let n = 0, s = 0, s2 = 0;
            for (;;) {
                const x = mu + sigma * N(); n++; s += x; s2 += x * x;
                const mean = s / n, sd = n > 1 ? Math.sqrt((s2 - (s * s) / n) / (n - 1)) : null;
                if (standardErrorConvergence(n, mean, sd, { minSamples: 10, maxSamples: 100000, relativeError: rel, absoluteError: 0 }).converged) break;
            }
            stops.push(n); errors.push(Math.abs(s / n - mu) / mu);
        }
        stops.sort((x, y) => x - y); errors.sort((x, y) => x - y);
        expect(stops[150]).toBeGreaterThan(0.8 * theoretical);
        expect(stops[150]).toBeLessThan(1.2 * theoretical);
        // the realised error of the mean is within about two standard errors in 95% of runs
        expect(errors[Math.floor(0.95 * errors.length)]).toBeLessThan(2.5 * rel);
    });
});
