import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService, private email: EmailService) {}

  async create(data: any) {
    const lead = await this.prisma.lead.create({ data });
    await this.email.sendLeadNotification({
      name: data.name,
      email: data.email,
      message: data.message,
      source: data.source,
    });
    return lead;
  }
}
