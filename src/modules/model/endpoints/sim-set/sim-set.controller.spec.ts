import { Test, TestingModule } from '@nestjs/testing';
import { SimSetController } from './sim-set.controller';

describe('SimSetController', () => {
  let controller: SimSetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimSetController],
    }).compile();

    controller = module.get<SimSetController>(SimSetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
