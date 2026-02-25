import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { IcalSyncService } from './ical-sync.service';
import { PrismaModule } from '../common/prisma.module';
import { CleaningsModule } from '../cleanings/cleanings.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), CleaningsModule],
  controllers: [BookingsController],
  providers: [BookingsService, IcalSyncService],
  exports: [BookingsService],
})
export class BookingsModule {}
