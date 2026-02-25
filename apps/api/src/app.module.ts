import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { LeadsModule } from './leads/leads.module';
import { PostsModule } from './posts/posts.module';
import { MediaModule } from './media/media.module';
import { CleaningsModule } from './cleanings/cleanings.module';
import { StockModule } from './stock/stock.module';
import { FaqModule } from './faq/faq.module';
import { BookingsModule } from './bookings/bookings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CheckinModule } from './checkin/checkin.module';
import { AlloggiatiModule } from './alloggiati/alloggiati.module';
import { PaymentsModule } from './payments/payments.module';
import { AirbnbImportModule } from './airbnb-import/airbnb-import.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    PropertiesModule,
    LeadsModule,
    PostsModule,
    MediaModule,
    CleaningsModule,
    StockModule,
    FaqModule,
    BookingsModule,
    NotificationsModule,
    CheckinModule,
    AlloggiatiModule,
    PaymentsModule,
    AirbnbImportModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
