import { Test, TestingModule } from '@nestjs/testing';
import { SimSetService } from './sim-set.service';

describe('SimSetService', () => {
  let service: SimSetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimSetService],
    }).compile();

    service = module.get<SimSetService>(SimSetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
