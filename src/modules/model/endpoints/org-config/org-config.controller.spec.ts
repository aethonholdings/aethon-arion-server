import { Test, TestingModule } from '@nestjs/testing';
import { OrgConfigController } from './org-config.controller';

describe('OrgConfigController', () => {
  let controller: OrgConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrgConfigController],
    }).compile();

    controller = module.get<OrgConfigController>(OrgConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
