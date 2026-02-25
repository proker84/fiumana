import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService, PushNotificationPayload } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class RegisterTokenDto {
  fcmToken: string;
  platform: 'ios' | 'android';
}

class SendNotificationDto {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

class SendMulticastDto {
  fcmTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-token')
  @HttpCode(HttpStatus.OK)
  async registerToken(@Body() dto: RegisterTokenDto) {
    // In a real app, save the token to database associated with user
    // For now, just acknowledge receipt
    return {
      success: true,
      message: 'Token registered successfully',
    };
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async sendNotification(@Body() dto: SendNotificationDto) {
    const payload: PushNotificationPayload = {
      title: dto.title,
      body: dto.body,
      data: dto.data,
    };

    const result = await this.notificationsService.sendToDevice(
      dto.fcmToken,
      payload,
    );

    return result;
  }

  @Post('send-multicast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async sendMulticast(@Body() dto: SendMulticastDto) {
    const payload: PushNotificationPayload = {
      title: dto.title,
      body: dto.body,
      data: dto.data,
    };

    const result = await this.notificationsService.sendToMultipleDevices(
      dto.fcmTokens,
      payload,
    );

    return result;
  }

  @Post('test')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async testNotification(@Body() dto: { fcmToken: string }) {
    const result = await this.notificationsService.sendToDevice(dto.fcmToken, {
      title: 'Test Notification',
      body: 'This is a test notification from Fiumana Immobiliare',
      data: { type: 'TEST' },
    });

    return result;
  }
}
