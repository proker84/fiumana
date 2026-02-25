import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { CleaningsService } from '../cleanings/cleanings.service';

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  description?: string;
}

@Injectable()
export class IcalSyncService {
  private readonly logger = new Logger(IcalSyncService.name);

  constructor(
    private prisma: PrismaService,
    private cleaningsService: CleaningsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncAllProperties() {
    this.logger.log('Starting iCal sync for all properties...');

    const properties = await this.prisma.property.findMany({
      where: {
        icalUrl: { not: null },
        type: 'VACATION',
      },
      select: { id: true, title: true, icalUrl: true },
    });

    for (const property of properties) {
      if (property.icalUrl) {
        try {
          await this.syncProperty(property.id, property.icalUrl);
          this.logger.log(`Synced property: ${property.title}`);
        } catch (error) {
          this.logger.error(`Failed to sync property ${property.title}:`, error);
        }
      }
    }

    this.logger.log('iCal sync completed');
  }

  async syncProperty(propertyId: string, icalUrl: string) {
    const events = await this.fetchICalEvents(icalUrl);

    for (const event of events) {
      await this.processEvent(propertyId, event);
    }

    return { synced: events.length };
  }

  private async fetchICalEvents(icalUrl: string): Promise<ICalEvent[]> {
    try {
      const response = await fetch(icalUrl);
      const icalData = await response.text();
      return this.parseICalData(icalData);
    } catch (error) {
      this.logger.error('Failed to fetch iCal data:', error);
      return [];
    }
  }

  private parseICalData(icalData: string): ICalEvent[] {
    const events: ICalEvent[] = [];
    const lines = icalData.split(/\r?\n/);

    let currentEvent: Partial<ICalEvent> | null = null;

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
          events.push(currentEvent as ICalEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':');

        switch (key.split(';')[0]) {
          case 'UID':
            currentEvent.uid = value;
            break;
          case 'SUMMARY':
            currentEvent.summary = value;
            break;
          case 'DTSTART':
            currentEvent.dtstart = this.parseICalDate(value);
            break;
          case 'DTEND':
            currentEvent.dtend = this.parseICalDate(value);
            break;
          case 'DESCRIPTION':
            currentEvent.description = value.replace(/\\n/g, '\n');
            break;
        }
      }
    }

    return events;
  }

  private parseICalDate(dateStr: string): Date {
    // Handle both YYYYMMDD and YYYYMMDDTHHMMSSZ formats
    const cleanDate = dateStr.replace(/[TZ]/g, '');

    if (cleanDate.length === 8) {
      // YYYYMMDD
      const year = parseInt(cleanDate.substring(0, 4), 10);
      const month = parseInt(cleanDate.substring(4, 6), 10) - 1;
      const day = parseInt(cleanDate.substring(6, 8), 10);
      return new Date(year, month, day);
    } else {
      // YYYYMMDDHHMMSS
      const year = parseInt(cleanDate.substring(0, 4), 10);
      const month = parseInt(cleanDate.substring(4, 6), 10) - 1;
      const day = parseInt(cleanDate.substring(6, 8), 10);
      const hour = parseInt(cleanDate.substring(8, 10), 10);
      const minute = parseInt(cleanDate.substring(10, 12), 10);
      const second = parseInt(cleanDate.substring(12, 14), 10);
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
  }

  private async processEvent(propertyId: string, event: ICalEvent) {
    // Skip past events
    if (event.dtend < new Date()) {
      return;
    }

    // Extract guest name from summary (Airbnb format: "Reserved - Guest Name")
    const guestName = event.summary?.replace(/^Reserved\s*-?\s*/i, '') || 'Ospite Airbnb';

    // Check if booking already exists
    const existingBooking = await this.prisma.booking.findUnique({
      where: { externalId: event.uid },
    });

    if (existingBooking) {
      // Update if dates changed
      if (
        existingBooking.checkInDate.getTime() !== event.dtstart.getTime() ||
        existingBooking.checkOutDate.getTime() !== event.dtend.getTime()
      ) {
        await this.prisma.booking.update({
          where: { id: existingBooking.id },
          data: {
            checkInDate: event.dtstart,
            checkOutDate: event.dtend,
            guestName,
          },
        });
      }
    } else {
      // Create new booking
      const booking = await this.prisma.booking.create({
        data: {
          propertyId,
          externalId: event.uid,
          source: 'AIRBNB',
          checkInDate: event.dtstart,
          checkOutDate: event.dtend,
          guestName,
          notes: event.description,
        },
      });

      // Automatically create cleaning for checkout
      await this.createCheckoutCleaning(booking.id, propertyId, event.dtend);
    }
  }

  private async createCheckoutCleaning(bookingId: string, propertyId: string, checkoutDate: Date) {
    // Check if cleaning already exists
    const existingCleaning = await this.prisma.cleaning.findUnique({
      where: { bookingId },
    });

    if (!existingCleaning) {
      await this.cleaningsService.create({
        propertyId,
        bookingId,
        scheduledDate: checkoutDate,
        phase: 'POST_CLEANING',
        notes: 'Pulizia automatica post-checkout',
      });
    }
  }
}
