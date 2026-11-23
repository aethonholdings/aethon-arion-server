import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthorisedNode } from "aethon-arion-db";
import environment from "../../../env/environment";
import { AuthService } from "./auth.service";

/**
 * Admits requests from authorised nodes: `Authorization: Bearer <key>` must hold a key issued by POST /auth/node that
 * has not been revoked or replaced. A `nodeId` in the query or body must belong to that node (the node id is
 * `<machine id>:<instance>`; the key is bound to the machine id), so one node cannot act as another.
 * With `auth.nodes: "off"` in the server environment every request is admitted (for the switch-over of existing nodes).
 */
@Injectable()
export class NodeAuthGuard implements CanActivate {
    private _required: boolean;

    constructor(private authService: AuthService) {
        this._required = (environment().auth?.nodes ?? "required") !== "off";
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (!this._required) return true;
        const request = context.switchToHttp().getRequest();
        const header: string = String(request.headers?.authorization ?? "");
        const match = /^Bearer\s+(\S+)$/i.exec(header);
        const node: AuthorisedNode | null = match ? await this.authService.verifyKey(match[1]) : null;
        if (!node) throw new UnauthorizedException("Missing, invalid or revoked node key");
        for (const claimed of [request.query?.nodeId, request.body?.nodeId]) {
            if (claimed === undefined || claimed === null) continue;
            const id = String(claimed);
            if (id !== node.id && !id.startsWith(node.id + ":")) {
                throw new ForbiddenException(`Node id ${id} does not belong to the authorised node`);
            }
        }
        request.authorisedNode = node;
        await this.authService.touch(node);
        return true;
    }
}
