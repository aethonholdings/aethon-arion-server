import "reflect-metadata";
import { DataSource } from "typeorm";
import { entities } from "aethon-arion-db";
import environment from "../../env/environment";
import { AuthService } from "../modules/auth/auth.service";
import { prompt } from "./prompt";

/**
 * Server command line for node authentication (npm run <command>):
 *
 *   user:create [username]   create an operator account (prompts for the password; ARION_USER_PASSWORD for scripts)
 *   user:disable <username>  disable an account (nodes it authorised keep their keys until revoked)
 *   node:list                list authorised nodes
 *   node:revoke <node id>    revoke a node's key; the node must be authorised again
 *
 * Uses the database of env/environment.ts; the user and authorised_node tables come from the aethon-arion-db
 * migrations.
 */
async function main(command: string, args: string[]): Promise<void> {
    const database = environment().database;
    const dataSource = await new DataSource({
        type: database.type as any,
        host: database.host,
        port: database.port,
        username: database.username,
        password: database.password,
        database: database.database,
        entities: entities,
        synchronize: false
    }).initialize();
    const auth = new AuthService(dataSource);
    try {
        switch (command) {
            case "user:create": {
                const username = args[0] || (await prompt("Username: "));
                let password = process.env.ARION_USER_PASSWORD ?? "";
                if (!password) {
                    password = await prompt("Password: ", true);
                    if ((await prompt("Repeat password: ", true)) !== password) throw new Error("The passwords do not match");
                }
                const user = await auth.createUser(username, password);
                console.log(`User ${user.username} created (id ${user.id})`);
                break;
            }
            case "user:disable": {
                if (!args[0]) throw new Error("Usage: npm run user:disable <username>");
                await auth.disableUser(args[0]);
                console.log(`User ${args[0]} disabled`);
                break;
            }
            case "node:list": {
                const nodes = await auth.listNodes();
                if (nodes.length === 0) console.log("No authorised nodes");
                else
                    console.table(
                        nodes.map((node) => ({
                            id: node.id,
                            hostname: node.hostname ?? "",
                            authorisedAt: node.authorisedAt?.toISOString(),
                            authorisedBy: node.authorisedBy?.username ?? "",
                            lastSeenAt: node.lastSeenAt ? new Date(node.lastSeenAt).toISOString() : "",
                            revokedAt: node.revokedAt ? new Date(node.revokedAt).toISOString() : ""
                        }))
                    );
                break;
            }
            case "node:revoke": {
                if (!args[0]) throw new Error("Usage: npm run node:revoke <node id>");
                await auth.revokeNode(args[0]);
                console.log(`Node ${args[0]} revoked`);
                break;
            }
            default:
                throw new Error("Commands: user:create [username], user:disable <username>, node:list, node:revoke <node id>");
        }
    } finally {
        await dataSource.destroy();
    }
}

main(process.argv[2], process.argv.slice(3)).then(
    () => process.exit(0), // stdin may still be open
    (error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    }
);
