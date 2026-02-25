import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { FaqService } from './faq.service';
import { PrismaModule } from '../common/prisma.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [FaqController],
  providers: [FaqService],
  exports: [FaqService],
})
export class FaqModule {}
