import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ResultService } from "./result.service";
import { ResultDTO } from "aethon-arion-pipeline";

@Controller("result")
export class ResultController {
    constructor(private readonly resultService: ResultService) {}

    @Get()
    index(@Param("simSetId") simSetId: number, @Param("simConfigId") simConfigId: number): Promise<ResultDTO[]> {
        return this.resultService.findAll({ simSetId: simSetId, simConfigId: simConfigId });
    }

    @Get(":id")
    view(@Param("id") id: string): Promise<ResultDTO> {
        return this.resultService.findOne(+id);
    }

    @Post()
    create(@Body() createResultDto: ResultDTO): Promise<number> {
        return this.resultService.create(createResultDto);
    }
}
