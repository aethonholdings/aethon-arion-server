import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { NodeAuth } from "../../../auth/node-auth.decorator";
import { NodeService } from "./node.service";
import { HeartbeatDTO, HeartbeatReplyDTO } from "./node.dto";

@Controller("node")
@ApiTags("Node")
export class NodeController {
    constructor(private readonly nodeService: NodeService) {}

    // endpoint through which a node process reports what it is doing (every 10 s)
    @Post("heartbeat")
    @HttpCode(200)
    @NodeAuth()
    @ApiBody({ type: HeartbeatDTO })
    @ApiOkResponse({ type: HeartbeatReplyDTO, description: "Commands for the process, and the node code version expected" })
    heartbeat(@Body() body: HeartbeatDTO, @Req() request: any): Promise<HeartbeatReplyDTO> {
        return this.nodeService.heartbeat(body, request?.authorisedNode?.id);
    }
}
