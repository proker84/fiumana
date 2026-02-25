import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { CheckinService, CreateCheckInDto, CheckInGuestData } from './checkin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Request } from 'express';

class SubmitCheckInDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  placeOfBirth?: string;

  documentType: 'passport' | 'id_card' | 'driving_license';
  documentNumber: string;
  documentIssueDate: string;
  documentExpiryDate: string;
  documentIssuedBy: string;

  email: string;
  phone: string;

  additionalGuests?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    documentType?: string;
    documentNumber?: string;
  }[];

  privacyAccepted: boolean;
  marketingAccepted?: boolean;
  termsAccepted: boolean;
}

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  // Public endpoint - get booking info for check-in page
  @Get(':bookingId')
  async getBookingForCheckIn(@Param('bookingId') bookingId: string) {
    const validation = await this.checkinService.validateBookingForCheckIn(bookingId);

    if (!validation.valid) {
      return {
        valid: false,
        reason: validation.reason,
      };
    }

    const booking = await this.checkinService.getBookingForCheckIn(bookingId);

    return {
      valid: true,
      booking,
    };
  }

  // Public endpoint - submit check-in data
  @Post(':bookingId/submit')
  @HttpCode(HttpStatus.OK)
  async submitCheckIn(
    @Param('bookingId') bookingId: string,
    @Body() dto: SubmitCheckInDto,
    @Req() request: Request,
  ) {
    const validation = await this.checkinService.validateBookingForCheckIn(bookingId);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.reason,
      };
    }

    const booking = await this.checkinService.getBookingForCheckIn(bookingId);

    const guestData: CheckInGuestData = {
      ...dto,
      arrivalDate: booking.checkInDate.toISOString(),
      departureDate: booking.checkOutDate.toISOString(),
      submittedAt: new Date().toISOString(),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const result = await this.checkinService.createCheckIn({
      bookingId,
      guestData,
    });

    return result;
  }

  // Protected endpoints - Admin only

  @Get(':bookingId/data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getCheckInData(@Param('bookingId') bookingId: string) {
    const data = await this.checkinService.getCheckInData(bookingId);

    if (!data) {
      return {
        found: false,
        message: 'No check-in data found or data has expired',
      };
    }

    return {
      found: true,
      data,
    };
  }

  @Get(':bookingId/link')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getCheckInLink(@Param('bookingId') bookingId: string) {
    const link = this.checkinService.generateCheckInLink(bookingId);

    return {
      bookingId,
      checkInLink: link,
    };
  }

  @Post(':bookingId/delete-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async deleteCheckInData(@Param('bookingId') bookingId: string) {
    await this.checkinService.deleteCheckInData(bookingId);

    return {
      success: true,
      message: 'Check-in data deleted successfully',
    };
  }
}
