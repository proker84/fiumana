import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';

const prismaMock = {
  lead: {
    create: jest.fn(),
  },
};

const emailMock = {
  sendLeadNotification: jest.fn(),
};

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EmailService, useValue: emailMock },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('crea un lead', async () => {
    prismaMock.lead.create.mockResolvedValue({ id: 'lead-1' });
    const result = await service.create({ name: 'Mario' });
    expect(result).toEqual({ id: 'lead-1' });
    expect(prismaMock.lead.create).toHaveBeenCalled();
  });
});
