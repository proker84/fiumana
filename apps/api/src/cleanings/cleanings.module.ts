import { Module } from '@nestjs/common';
import { CleaningsController } from './cleanings.controller';
import { CleaningsService } from './cleanings.service';
import { PrismaModule } from '../common/prisma.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [CleaningsController],
  providers: [CleaningsService],
  exports: [CleaningsService],
})
export class CleaningsModule {}
