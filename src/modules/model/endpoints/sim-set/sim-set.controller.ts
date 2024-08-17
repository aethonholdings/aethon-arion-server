import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { SimSetService } from './sim-set.service';
import { ConfiguratorParamsDTO, SimConfigDTO, SimSetDTO } from 'aethon-arion-pipeline';
import { Paginate } from 'nestjs-paginate';

@Controller('sim-set')
export class SimSetController {

    constructor(private simSetService: SimSetService) { }

    @Get()
    index(@Query() query: any) {
        return this.simSetService.findAll(query);
    }

    @Get(':id') 
    view(@Param("id") id: number) {
        return this.simSetService.findOne(id);
    }

    @Post()
    create(@Body() simSet: SimSetDTO) {
        return this.simSetService.create(simSet);
    }

    @Post(':id/generate')
    generate(@Param('id') simSetId: number, @Body() configuratorParamDTO: ConfiguratorParamsDTO): Promise<SimConfigDTO> {
        return this.simSetService.generateSimConfig(simSetId, configuratorParamDTO);
    }

    @Get(':id/result')
    results(@Param('id') simSetId: number) {
        return this.simSetService.findResults(simSetId);
    }

    @Get(':id/sim-config')
    simConfigs(@Param('id') simSetId: number, @Paginate() paginateQuery){
        return this.simSetService.findSimConfigs(simSetId, paginateQuery);
    }

    @Delete(':id')
    delete(@Param("id") id: number) {
        return this.simSetService.delete(id);
    }
}
