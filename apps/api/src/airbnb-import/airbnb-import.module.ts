import { Module } from '@nestjs/common';
import { AirbnbImportController } from './airbnb-import.controller';
import { AirbnbImportService } from './airbnb-import.service';
import { PrismaModule } from '../common/prisma.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [AirbnbImportController],
  providers: [AirbnbImportService],
  exports: [AirbnbImportService],
})
export class AirbnbImportModule {}
