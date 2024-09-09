import { Controller, Get, Param, Query } from "@nestjs/common";
import { OrgConfigService } from "./org-config.service";
import { OrgConfigDTO } from "aethon-arion-pipeline";
import { ApiTags } from "@nestjs/swagger";

@Controller("org-config")
@ApiTags("OrgConfig")
export class OrgConfigController {
    constructor(private readonly orgConfigService: OrgConfigService) {}

    @Get()
    index(@Query("type") type: string): Promise<OrgConfigDTO[]> {
        return this.orgConfigService.findAll(type);
    }

    @Get(":id")
    view(@Param("id") id: number): Promise<OrgConfigDTO> {
        return this.orgConfigService.findOne(id);
    }
}
