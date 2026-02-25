import { Module } from '@nestjs/common';
import { AlloggiatiService } from './alloggiati.service';
import { AlloggiatiController } from './alloggiati.controller';
import { PrismaModule } from '../common/prisma.module';
import { CheckinModule } from '../checkin/checkin.module';

@Module({
  imports: [PrismaModule, CheckinModule],
  controllers: [AlloggiatiController],
  providers: [AlloggiatiService],
  exports: [AlloggiatiService],
})
export class AlloggiatiModule {}
