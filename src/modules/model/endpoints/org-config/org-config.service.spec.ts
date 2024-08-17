import { Test, TestingModule } from '@nestjs/testing';
import { OrgConfigService } from './org-config.service';

describe('OrgConfigService', () => {
  let service: OrgConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrgConfigService],
    }).compile();

    service = module.get<OrgConfigService>(OrgConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
