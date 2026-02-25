import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { BookingSource, Prisma } from '@prisma/client';

export interface BookingFilters {
  propertyId?: string;
  guestId?: string;
  source?: BookingSource;
  startDate?: Date;
  endDate?: Date;
  checkInCompleted?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateBookingDto {
  propertyId: string;
  guestId?: string;
  externalId?: string;
  source?: BookingSource;
  checkInDate: Date;
  checkOutDate: Date;
  guestCount?: number;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  notes?: string;
}

export interface UpdateBookingDto {
  guestId?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  guestCount?: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInCompleted?: boolean;
  alloggiatiSent?: boolean;
  notes?: string;
}

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: BookingFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const where: Prisma.BookingWhereInput = {};

    if (filters.propertyId) where.propertyId = filters.propertyId;
    if (filters.guestId) where.guestId = filters.guestId;
    if (filters.source) where.source = filters.source;
    if (filters.checkInCompleted !== undefined) where.checkInCompleted = filters.checkInCompleted;

    if (filters.startDate || filters.endDate) {
      where.OR = [
        {
          checkInDate: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
        {
          checkOutDate: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          property: {
            include: {
              location: true,
              media: { take: 1 },
            },
          },
          guest: { select: { id: true, name: true, email: true } },
          cleaning: {
            select: { id: true, status: true, scheduledDate: true },
          },
        },
        orderBy: { checkInDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            location: true,
            media: true,
            faqs: { where: { isActive: true } },
          },
        },
        guest: { select: { id: true, name: true, email: true, phone: true } },
        cleaning: true,
        checkInData: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Prenotazione non trovata');
    }

    return booking;
  }

  async findByExternalId(externalId: string) {
    return this.prisma.booking.findUnique({
      where: { externalId },
    });
  }

  async getUpcoming(propertyId?: string, days = 7) {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const where: Prisma.BookingWhereInput = {
      checkInDate: {
        gte: now,
        lte: endDate,
      },
    };

    if (propertyId) where.propertyId = propertyId;

    return this.prisma.booking.findMany({
      where,
      include: {
        property: { select: { id: true, title: true } },
        cleaning: { select: { id: true, status: true } },
      },
      orderBy: { checkInDate: 'asc' },
    });
  }

  async getActive(propertyId?: string) {
    const now = new Date();

    const where: Prisma.BookingWhereInput = {
      checkInDate: { lte: now },
      checkOutDate: { gte: now },
    };

    if (propertyId) where.propertyId = propertyId;

    return this.prisma.booking.findMany({
      where,
      include: {
        property: { select: { id: true, title: true } },
      },
      orderBy: { checkInDate: 'asc' },
    });
  }

  async create(data: CreateBookingDto) {
    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Proprietà non trovata');
    }

    return this.prisma.booking.create({
      data: {
        propertyId: data.propertyId,
        guestId: data.guestId,
        externalId: data.externalId,
        source: data.source ?? 'DIRECT',
        checkInDate: new Date(data.checkInDate),
        checkOutDate: new Date(data.checkOutDate),
        guestCount: data.guestCount ?? 1,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        notes: data.notes,
      },
      include: {
        property: { include: { location: true } },
      },
    });
  }

  async update(id: string, data: UpdateBookingDto) {
    await this.findOne(id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        guestId: data.guestId,
        checkInDate: data.checkInDate ? new Date(data.checkInDate) : undefined,
        checkOutDate: data.checkOutDate ? new Date(data.checkOutDate) : undefined,
        guestCount: data.guestCount,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        checkInCompleted: data.checkInCompleted,
        alloggiatiSent: data.alloggiatiSent,
        notes: data.notes,
      },
      include: {
        property: { include: { location: true } },
        cleaning: true,
      },
    });
  }

  async markCheckInCompleted(id: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { checkInCompleted: true },
    });
  }

  async markAlloggiatiSent(id: string) {
    return this.prisma.booking.update({
      where: { id },
      data: { alloggiatiSent: true },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.booking.delete({ where: { id } });
  }

  async getStats(propertyId?: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.BookingWhereInput = {};
    if (propertyId) where.propertyId = propertyId;

    if (startDate || endDate) {
      where.checkInDate = {};
      if (startDate) where.checkInDate.gte = startDate;
      if (endDate) where.checkInDate.lte = endDate;
    }

    const bookings = await this.prisma.booking.findMany({ where });

    const stats = {
      totalBookings: bookings.length,
      totalGuests: bookings.reduce((sum, b) => sum + b.guestCount, 0),
      completedCheckIns: bookings.filter((b) => b.checkInCompleted).length,
      pendingCheckIns: bookings.filter((b) => !b.checkInCompleted).length,
      bySource: {} as Record<string, number>,
    };

    for (const booking of bookings) {
      stats.bySource[booking.source] = (stats.bySource[booking.source] || 0) + 1;
    }

    return stats;
  }
}
