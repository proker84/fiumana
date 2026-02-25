import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AlloggiatiService } from './alloggiati.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('alloggiati')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AlloggiatiController {
  constructor(private readonly alloggiatiService: AlloggiatiService) {}

  @Get('pending')
  async getPendingSubmissions() {
    const pending = await this.alloggiatiService.getPendingSubmissions();

    return {
      count: pending.length,
      bookings: pending,
    };
  }

  @Post('send/:bookingId')
  @HttpCode(HttpStatus.OK)
  async sendToAlloggiati(@Param('bookingId') bookingId: string) {
    const result = await this.alloggiatiService.sendToAlloggiati(bookingId);

    return result;
  }

  @Post('send-all')
  @HttpCode(HttpStatus.OK)
  async sendAllPending() {
    const pending = await this.alloggiatiService.getPendingSubmissions();
    const results: Array<{
      bookingId: string;
      success: boolean;
      protocolNumber?: string;
      error?: string;
    }> = [];

    for (const booking of pending) {
      try {
        const result = await this.alloggiatiService.sendToAlloggiati(
          booking.bookingId,
        );
        results.push({
          bookingId: booking.bookingId,
          success: result.success,
          protocolNumber: result.protocolNumber,
          error: result.errors?.join(', '),
        });
      } catch (error) {
        results.push({
          bookingId: booking.bookingId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      total: results.length,
      successCount,
      failureCount,
      results,
    };
  }

  @Get('test-connection')
  async testConnection() {
    const result = await this.alloggiatiService.testConnection();

    return result;
  }
}
