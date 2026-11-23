import { Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from "@nestjs/common";
import { DataSource, IsNull } from "typeorm";
import { AuthorisedNode, User } from "aethon-arion-db";
import environment from "../../../env/environment";
import { DUMMY_PASSWORD_HASH, generateKey, hashKey, hashPassword, verifyPassword } from "./credentials";

export type NodeAuthorisation = { nodeId: string; key: string; authorisedAt: Date };

// lastSeenAt is written at most this often per node, so that polling does not cause a write per request
const LAST_SEEN_INTERVAL_MS = 60000;

/** Operator accounts and authorised nodes. Used by the HTTP layer and by the server command line. */
@Injectable()
export class AuthService implements OnApplicationBootstrap {
    private _logger: Logger = new Logger(AuthService.name);

    constructor(private dataSource: DataSource) {}

    /** Warns at startup when nodes cannot be authorised: no operator account exists, or the tables are missing. */
    async onApplicationBootstrap(): Promise<void> {
        if ((environment().auth?.nodes ?? "required") === "off") return;
        try {
            if ((await this.countUsers()) === 0) {
                this._logger.warn(
                    "No operator account exists, so no node can be authorised: create one with `npm run user:create`"
                );
            }
        } catch (error) {
            this._logger.warn(
                `Node authentication tables are not available (${(error as Error)?.message}): apply the aethon-arion-db migrations`
            );
        }
    }

    /**
     * Authorises a node with an operator's credentials and returns a new key, the only time it is sent. A node that
     * was authorised before gets a new key and its old key stops working; a revoked node is reinstated.
     */
    async authoriseNode(nodeId: string, hostname: string | null, username: string, password: string): Promise<NodeAuthorisation> {
        const user: User | null = await this.dataSource.getRepository(User).findOne({ where: { username } });
        // verify against a dummy hash for an unknown user, so that the response time does not reveal valid usernames
        const valid: boolean = verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !valid || user.disabledAt) {
            this._logger.warn(`Rejected node authorisation for node ${nodeId} by user ${username}`);
            throw new UnauthorizedException("Invalid credentials");
        }
        const key: string = generateKey();
        const authorisedAt = new Date();
        await this.dataSource.getRepository(AuthorisedNode).save({
            id: nodeId,
            keyHash: hashKey(key),
            hostname: hostname ? String(hostname).slice(0, 255) : null,
            authorisedAt,
            authorisedByUserId: user.id,
            lastSeenAt: null,
            revokedAt: null
        });
        this._logger.log(`Node ${nodeId} authorised by user ${username}`);
        return { nodeId, key, authorisedAt };
    }

    /** The authorised, non-revoked node holding this key, or null. */
    async verifyKey(key: string): Promise<AuthorisedNode | null> {
        if (!key) return null;
        return this.dataSource
            .getRepository(AuthorisedNode)
            .findOne({ where: { keyHash: hashKey(key), revokedAt: IsNull() }, loadEagerRelations: false });
    }

    /** Records that the node was seen, at most once per LAST_SEEN_INTERVAL_MS. */
    async touch(node: AuthorisedNode, now: Date = new Date()): Promise<void> {
        if (node.lastSeenAt && now.getTime() - new Date(node.lastSeenAt).getTime() < LAST_SEEN_INTERVAL_MS) return;
        await this.dataSource.getRepository(AuthorisedNode).update(node.id, { lastSeenAt: now });
    }

    // ------------------------------------------------------------------ administration (server command line)

    /** Throws when a username or password does not meet the account rules. */
    static validateNewUser(username: string, password: string): void {
        if (!/^[A-Za-z0-9._@-]{1,64}$/.test(username)) throw new Error("A username has 1 to 64 letters, digits or . _ @ -");
        if (password.length < 10) throw new Error("A password has at least 10 characters");
    }

    async countUsers(): Promise<number> {
        return this.dataSource.getRepository(User).count();
    }

    async createUser(username: string, password: string): Promise<User> {
        AuthService.validateNewUser(username, password);
        if (await this.dataSource.getRepository(User).findOne({ where: { username } })) {
            throw new Error(`User ${username} already exists`);
        }
        return this.dataSource.getRepository(User).save({ username, passwordHash: hashPassword(password), disabledAt: null });
    }

    async disableUser(username: string): Promise<void> {
        const result = await this.dataSource.getRepository(User).update({ username }, { disabledAt: new Date() });
        if (!result.affected) throw new Error(`User ${username} not found`);
    }

    async listNodes(): Promise<AuthorisedNode[]> {
        return this.dataSource.getRepository(AuthorisedNode).find({ relations: { authorisedBy: true }, order: { authorisedAt: "DESC" } });
    }

    async revokeNode(nodeId: string): Promise<void> {
        const result = await this.dataSource.getRepository(AuthorisedNode).update({ id: nodeId }, { revokedAt: new Date() });
        if (!result.affected) throw new Error(`Node ${nodeId} not found`);
    }
}
