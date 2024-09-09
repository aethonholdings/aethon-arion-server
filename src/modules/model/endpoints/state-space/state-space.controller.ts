import { StateSpacePointDTO } from 'aethon-arion-pipeline';
import { Controller, Get, Param } from '@nestjs/common';
import { StateSpaceService } from './state-space.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('state-space')
@ApiTags('StateSpace')
export class StateSpaceController {

    constructor(private readonly stateSpaceService: StateSpaceService) {}

    @Get(":id")
    view(@Param("id") id: string): Promise<StateSpacePointDTO[]> {
        return this.stateSpaceService.findOne(+id);
    }

}
