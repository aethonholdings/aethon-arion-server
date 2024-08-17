import { StateSpacePointDTO } from 'aethon-arion-pipeline';
import { Controller, Get, Param } from '@nestjs/common';
import { StateSpaceService } from './state-space.service';

@Controller('state-space')
export class StateSpaceController {

    constructor(private readonly stateSpaceService: StateSpaceService) {}

    @Get(":id")
    view(@Param("id") id: string): Promise<StateSpacePointDTO[]> {
        return this.stateSpaceService.findOne(+id);
    }

}
