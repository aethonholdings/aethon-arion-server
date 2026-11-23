import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { IsOptional, IsString, Length, Matches } from "class-validator";
import { AuthService, NodeAuthorisation } from "./auth.service";

export class NodeAuthorisationDTO {
    @ApiProperty({ description: "The node's machine id (without the instance suffix)" })
    @IsString()
    @Length(1, 128)
    @Matches(/^[^:\s]+$/, { message: "nodeId is the machine id: no colons or whitespace" })
    nodeId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Length(0, 255)
    hostname?: string;

    @ApiProperty()
    @IsString()
    @Length(1, 64)
    username: string;

    @ApiProperty()
    @IsString()
    @Length(1, 1024)
    password: string;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post("node")
    @HttpCode(201)
    @UseGuards(ThrottlerGuard)
    @ApiOperation({ summary: "Authorise a node with an operator's credentials; returns the node's key (sent only once)" })
    @ApiUnauthorizedResponse({ description: "Invalid credentials" })
    @ApiTooManyRequestsResponse({ description: "Too many attempts" })
    authoriseNode(@Body() body: NodeAuthorisationDTO): Promise<NodeAuthorisation> {
        return this.authService.authoriseNode(body.nodeId, body.hostname ?? null, body.username, body.password);
    }
}
