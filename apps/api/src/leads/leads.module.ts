import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../common/email.service';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [ConfigModule],
  providers: [LeadsService, EmailService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
