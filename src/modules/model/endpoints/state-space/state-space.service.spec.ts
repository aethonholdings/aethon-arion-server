import { Test, TestingModule } from '@nestjs/testing';
import { StateSpaceService } from './state-space.service';

describe('StateSpaceService', () => {
  let service: StateSpaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StateSpaceService],
    }).compile();

    service = module.get<StateSpaceService>(StateSpaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
