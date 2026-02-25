import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
// import { LeadSchema } from '@shared/index';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LeadsService } from './leads.service';

const LeadInputSchema = z.object({ name: z.string(), email: z.string() });

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(LeadInputSchema))
  async create(@Body() body: z.infer<typeof LeadInputSchema>) {
    return this.leads.create(body);
  }
}
