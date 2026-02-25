import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EncryptionService } from './encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CheckInGuestData {
  // Personal info
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  placeOfBirth?: string;

  // Document info
  documentType: 'passport' | 'id_card' | 'driving_license';
  documentNumber: string;
  documentIssueDate: string;
  documentExpiryDate: string;
  documentIssuedBy: string;

  // Contact info
  email: string;
  phone: string;

  // Stay info
  arrivalDate: string;
  departureDate: string;

  // Additional guests
  additionalGuests?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    documentType?: string;
    documentNumber?: string;
  }[];

  // Consents
  privacyAccepted: boolean;
  marketingAccepted?: boolean;
  termsAccepted: boolean;

  // Metadata
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateCheckInDto {
  bookingId: string;
  guestData: CheckInGuestData;
}

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);
  private readonly RETENTION_DAYS = 30; // GDPR compliant retention

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly notifications: NotificationsService,
  ) {}

  async createCheckIn(dto: CreateCheckInDto) {
    // Validate booking exists
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        property: true,
        checkInData: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.checkInCompleted) {
      throw new BadRequestException('Check-in already completed');
    }

    // Validate required consents
    if (!dto.guestData.privacyAccepted || !dto.guestData.termsAccepted) {
      throw new BadRequestException('Privacy and terms must be accepted');
    }

    // Encrypt guest data
    const encryptedData = this.encryption.encryptObject(dto.guestData);

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.RETENTION_DAYS);

    // Create or update check-in data
    const checkInData = await this.prisma.checkInData.upsert({
      where: { bookingId: dto.bookingId },
      create: {
        bookingId: dto.bookingId,
        encryptedData,
        expiresAt,
      },
      update: {
        encryptedData,
        expiresAt,
      },
    });

    // Mark booking as check-in completed
    await this.prisma.booking.update({
      where: { id: dto.bookingId },
      data: {
        checkInCompleted: true,
        guestName: `${dto.guestData.firstName} ${dto.guestData.lastName}`,
        guestEmail: dto.guestData.email,
        guestPhone: dto.guestData.phone,
      },
    });

    this.logger.log(`Check-in completed for booking ${dto.bookingId}`);

    return {
      success: true,
      bookingId: dto.bookingId,
      propertyName: booking.property.title,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
    };
  }

  async getCheckInData(bookingId: string): Promise<CheckInGuestData | null> {
    const checkInData = await this.prisma.checkInData.findUnique({
      where: { bookingId },
    });

    if (!checkInData) {
      return null;
    }

    // Check if data has expired
    if (new Date() > checkInData.expiresAt) {
      // Data expired, delete it
      await this.deleteCheckInData(bookingId);
      return null;
    }

    try {
      return this.encryption.decryptObject<CheckInGuestData>(
        checkInData.encryptedData,
      );
    } catch (error) {
      this.logger.error(`Failed to decrypt check-in data for booking ${bookingId}`, error);
      return null;
    }
  }

  async getBookingForCheckIn(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          include: {
            location: true,
            media: {
              take: 1,
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      id: booking.id,
      propertyName: booking.property.title,
      propertyImage: booking.property.media[0]?.url,
      propertyAddress: booking.property.location
        ? `${booking.property.location.address}, ${booking.property.location.city}`
        : null,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      guestCount: booking.guestCount,
      guestName: booking.guestName,
      checkInCompleted: booking.checkInCompleted,
    };
  }

  async deleteCheckInData(bookingId: string) {
    try {
      await this.prisma.checkInData.delete({
        where: { bookingId },
      });
      this.logger.log(`Check-in data deleted for booking ${bookingId}`);
    } catch (error) {
      // Ignore if not found
    }
  }

  // Cron job to delete expired check-in data (GDPR compliance)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredData() {
    this.logger.log('Running expired check-in data cleanup...');

    const now = new Date();

    const result = await this.prisma.checkInData.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} expired check-in records`);
    }
  }

  // Generate check-in link for booking
  generateCheckInLink(bookingId: string): string {
    const baseUrl = process.env.CHECKIN_WEB_URL || 'https://checkin.fiumanaimmobiliare.it';
    return `${baseUrl}/${bookingId}`;
  }

  // Verify booking exists and is valid for check-in
  async validateBookingForCheckIn(bookingId: string): Promise<{
    valid: boolean;
    reason?: string;
    booking?: any;
  }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: true,
      },
    });

    if (!booking) {
      return { valid: false, reason: 'Booking not found' };
    }

    if (booking.checkInCompleted) {
      return { valid: false, reason: 'Check-in already completed' };
    }

    const now = new Date();
    const checkInDate = new Date(booking.checkInDate);
    const daysBefore = Math.ceil(
      (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Allow check-in up to 7 days before arrival
    if (daysBefore > 7) {
      return {
        valid: false,
        reason: 'Check-in is only available within 7 days of arrival',
      };
    }

    // Don't allow check-in after departure
    const checkOutDate = new Date(booking.checkOutDate);
    if (now > checkOutDate) {
      return { valid: false, reason: 'Booking has already ended' };
    }

    return { valid: true, booking };
  }
}
