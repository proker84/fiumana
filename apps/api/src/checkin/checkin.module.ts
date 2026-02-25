import { Module } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { EncryptionService } from './encryption.service';
import { PrismaModule } from '../common/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [CheckinController],
  providers: [CheckinService, EncryptionService],
  exports: [CheckinService, EncryptionService],
})
export class CheckinModule {}
