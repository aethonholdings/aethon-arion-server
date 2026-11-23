import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { NodeAuthGuard } from "./node-auth.guard";

/** Restricts an endpoint to authorised nodes (see NodeAuthGuard). */
export function NodeAuth() {
    return applyDecorators(
        UseGuards(NodeAuthGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ description: "Missing, invalid or revoked node key" }),
        ApiForbiddenResponse({ description: "The node id does not belong to the authorised node" })
    );
}
