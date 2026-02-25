import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../common/prisma.service';

const prismaMock = {
  property: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('PropertiesService', () => {
  let service: PropertiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PropertiesService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  it('lista immobili con paginazione', async () => {
    prismaMock.property.findMany.mockResolvedValue([{ id: 'p1' }]);
    prismaMock.property.count.mockResolvedValue(1);

    const result = await service.findAll({});
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });
});
