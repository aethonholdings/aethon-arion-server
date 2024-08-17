import { Test, TestingModule } from '@nestjs/testing';
import { StateSpaceController } from './state-space.controller';

describe('StateSpaceController', () => {
  let controller: StateSpaceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StateSpaceController],
    }).compile();

    controller = module.get<StateSpaceController>(StateSpaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
