import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { generateKey, hashKey, hashPassword, verifyPassword } from "../credentials";
import { NodeAuthGuard } from "../node-auth.guard";
import { AuthService } from "../auth.service";

describe("Node authentication: credentials", () => {
    it("hashes passwords with a random salt and verifies them", () => {
        const a = hashPassword("correct horse");
        const b = hashPassword("correct horse");
        expect(a).not.toBe(b);
        expect(a.startsWith("scrypt$16384$8$1$")).toBe(true);
        expect(verifyPassword("correct horse", a)).toBe(true);
        expect(verifyPassword("correct horse!", a)).toBe(false);
        expect(verifyPassword("correct horse", "not a hash")).toBe(false);
        expect(verifyPassword("correct horse", "")).toBe(false);
    });

    it("generates distinct 256-bit keys and hashes them to 64 hex characters", () => {
        const keys = new Set(Array.from({ length: 100 }, () => generateKey()));
        expect(keys.size).toBe(100);
        const key = generateKey();
        expect(Buffer.from(key, "base64url").length).toBe(32);
        expect(hashKey(key)).toMatch(/^[0-9a-f]{64}$/);
        expect(hashKey(key)).toBe(hashKey(key));
    });
});

describe("Node authentication: NodeAuthGuard", () => {
    const node = { id: "machine", lastSeenAt: null } as any;
    const service = (valid: boolean) =>
        ({
            verifyKey: jest.fn(async (key: string) => (valid && key === "good" ? node : null)),
            touch: jest.fn(async () => undefined)
        }) as unknown as AuthService;
    const context = (headers: any, query: any = {}, body: any = {}) => {
        const request: any = { headers, query, body };
        return { request, ctx: { switchToHttp: () => ({ getRequest: () => request }) } as any };
    };

    it("admits a valid key, attaches the node and records that it was seen", async () => {
        const auth = service(true);
        const guard = new NodeAuthGuard(auth);
        const { request, ctx } = context({ authorization: "Bearer good" }, { nodeId: "machine:123" });
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
        expect(request.authorisedNode).toBe(node);
        expect(auth.touch).toHaveBeenCalledWith(node);
    });

    it("refuses a missing, malformed or unknown key with 401", async () => {
        const guard = new NodeAuthGuard(service(true));
        for (const headers of [{}, { authorization: "good" }, { authorization: "Basic good" }, { authorization: "Bearer bad" }]) {
            await expect(guard.canActivate(context(headers).ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        }
    });

    it("refuses a node id of another machine with 403", async () => {
        const guard = new NodeAuthGuard(service(true));
        await expect(guard.canActivate(context({ authorization: "Bearer good" }, { nodeId: "other:1" }).ctx)).rejects.toBeInstanceOf(ForbiddenException);
        await expect(guard.canActivate(context({ authorization: "Bearer good" }, {}, { nodeId: "machine2" }).ctx)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("admits every request when auth.nodes is off", async () => {
        const auth = service(false);
        const guard = new NodeAuthGuard(auth);
        (guard as any)._required = false;
        await expect(guard.canActivate(context({}).ctx)).resolves.toBe(true);
        expect(auth.verifyKey).not.toHaveBeenCalled();
    });
});

describe("Node authentication: AuthService.touch", () => {
    it("writes lastSeenAt at most once a minute", async () => {
        const update = jest.fn(async () => undefined);
        const auth = new AuthService({ getRepository: () => ({ update }) } as any);
        const now = new Date("2026-01-01T00:00:00Z");
        await auth.touch({ id: "m", lastSeenAt: null } as any, now);
        await auth.touch({ id: "m", lastSeenAt: new Date(now.getTime() - 30000) } as any, now);
        await auth.touch({ id: "m", lastSeenAt: new Date(now.getTime() - 61000) } as any, now);
        expect(update).toHaveBeenCalledTimes(2);
    });
});
