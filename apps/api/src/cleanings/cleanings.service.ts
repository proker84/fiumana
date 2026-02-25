import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MediaService } from '../media/media.service';
import { CleaningStatus, PhotoType, Prisma } from '@prisma/client';

export interface CleaningFilters {
  propertyId?: string;
  cleanerId?: string;
  status?: CleaningStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface CreateCleaningDto {
  propertyId: string;
  bookingId?: string;
  cleanerId?: string;
  scheduledDate: Date;
  phase?: 'PRE_CLEANING' | 'POST_CLEANING';
  notes?: string;
  checklist?: { task: string; room?: string }[];
}

export interface UpdateCleaningDto {
  cleanerId?: string;
  scheduledDate?: Date;
  status?: CleaningStatus;
  phase?: 'PRE_CLEANING' | 'POST_CLEANING';
  paymentStatus?: 'PENDING' | 'PAID';
  paymentAmount?: number;
  notes?: string;
}

@Injectable()
export class CleaningsService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async findAll(filters: CleaningFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const where: Prisma.CleaningWhereInput = {};

    if (filters.propertyId) where.propertyId = filters.propertyId;
    if (filters.cleanerId) where.cleanerId = filters.cleanerId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.scheduledDate = {};
      if (filters.startDate) where.scheduledDate.gte = filters.startDate;
      if (filters.endDate) where.scheduledDate.lte = filters.endDate;
    }

    const [items, total] = await Promise.all([
      this.prisma.cleaning.findMany({
        where,
        include: {
          property: {
            include: {
              location: true,
              media: { take: 1 },
            },
          },
          cleaner: {
            select: { id: true, name: true, email: true },
          },
          photos: true,
          checklist: { orderBy: { sortOrder: 'asc' } },
          booking: {
            select: { id: true, guestName: true, checkInDate: true, checkOutDate: true },
          },
        },
        orderBy: { scheduledDate: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.cleaning.count({ where }),
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
    const cleaning = await this.prisma.cleaning.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            location: true,
            media: true,
          },
        },
        cleaner: {
          select: { id: true, name: true, email: true, phone: true },
        },
        photos: { orderBy: { createdAt: 'asc' } },
        checklist: { orderBy: { sortOrder: 'asc' } },
        booking: true,
      },
    });

    if (!cleaning) {
      throw new NotFoundException('Pulizia non trovata');
    }

    return cleaning;
  }

  async create(data: CreateCleaningDto) {
    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Proprietà non trovata');
    }

    // Verify cleaner exists if provided
    if (data.cleanerId) {
      const cleaner = await this.prisma.user.findUnique({
        where: { id: data.cleanerId },
      });

      if (!cleaner || cleaner.role !== 'CLEANER') {
        throw new BadRequestException('Addetto pulizie non valido');
      }
    }

    return this.prisma.cleaning.create({
      data: {
        propertyId: data.propertyId,
        bookingId: data.bookingId,
        cleanerId: data.cleanerId,
        scheduledDate: new Date(data.scheduledDate),
        phase: data.phase ?? 'POST_CLEANING',
        notes: data.notes,
        checklist: data.checklist?.length
          ? {
              create: data.checklist.map((item, index) => ({
                task: item.task,
                room: item.room,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        property: { include: { location: true } },
        cleaner: { select: { id: true, name: true, email: true } },
        checklist: true,
      },
    });
  }

  async update(id: string, data: UpdateCleaningDto) {
    const cleaning = await this.findOne(id);

    // Verify cleaner if being updated
    if (data.cleanerId) {
      const cleaner = await this.prisma.user.findUnique({
        where: { id: data.cleanerId },
      });

      if (!cleaner || cleaner.role !== 'CLEANER') {
        throw new BadRequestException('Addetto pulizie non valido');
      }
    }

    return this.prisma.cleaning.update({
      where: { id },
      data: {
        cleanerId: data.cleanerId,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        status: data.status,
        phase: data.phase,
        paymentStatus: data.paymentStatus,
        paymentAmount: data.paymentAmount,
        notes: data.notes,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
      },
      include: {
        property: { include: { location: true } },
        cleaner: { select: { id: true, name: true, email: true } },
        photos: true,
        checklist: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async updateStatus(id: string, status: CleaningStatus) {
    const cleaning = await this.findOne(id);

    // Validate status transition
    const validTransitions: Record<CleaningStatus, CleaningStatus[]> = {
      PENDING: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: ['PENDING'],
    };

    if (!validTransitions[cleaning.status].includes(status)) {
      throw new BadRequestException(
        `Non è possibile passare dallo stato ${cleaning.status} a ${status}`,
      );
    }

    return this.prisma.cleaning.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
      include: {
        property: { include: { location: true } },
        cleaner: { select: { id: true, name: true, email: true } },
        photos: true,
        checklist: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async uploadPhoto(
    cleaningId: string,
    file: Express.Multer.File,
    type: PhotoType,
    room?: string,
  ) {
    const cleaning = await this.findOne(cleaningId);

    if (cleaning.status === 'COMPLETED') {
      throw new BadRequestException('Non è possibile aggiungere foto a una pulizia completata');
    }

    // Upload to Cloudinary
    const uploadResult = await this.mediaService.uploadImage(file, 'cleanings');

    return this.prisma.cleaningPhoto.create({
      data: {
        cleaningId,
        url: uploadResult.url,
        type,
        room,
      },
    });
  }

  async deletePhoto(photoId: string) {
    const photo = await this.prisma.cleaningPhoto.findUnique({
      where: { id: photoId },
      include: { cleaning: true },
    });

    if (!photo) {
      throw new NotFoundException('Foto non trovata');
    }

    if (photo.cleaning.status === 'COMPLETED') {
      throw new BadRequestException('Non è possibile eliminare foto da una pulizia completata');
    }

    // Delete from Cloudinary
    await this.mediaService.deleteImage(photo.url);

    return this.prisma.cleaningPhoto.delete({ where: { id: photoId } });
  }

  async updateChecklistItem(itemId: string, completed: boolean) {
    const item = await this.prisma.cleaningChecklistItem.findUnique({
      where: { id: itemId },
      include: { cleaning: true },
    });

    if (!item) {
      throw new NotFoundException('Elemento checklist non trovato');
    }

    if (item.cleaning.status === 'COMPLETED') {
      throw new BadRequestException(
        'Non è possibile modificare la checklist di una pulizia completata',
      );
    }

    return this.prisma.cleaningChecklistItem.update({
      where: { id: itemId },
      data: { completed },
    });
  }

  async getCleanerStats(cleanerId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.CleaningWhereInput = {
      cleanerId,
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = startDate;
      if (endDate) where.completedAt.lte = endDate;
    }

    const [total, totalAmount] = await Promise.all([
      this.prisma.cleaning.count({ where }),
      this.prisma.cleaning.aggregate({
        where,
        _sum: { paymentAmount: true },
      }),
    ]);

    return {
      totalCleanings: total,
      totalEarnings: totalAmount._sum.paymentAmount ?? 0,
    };
  }

  async delete(id: string) {
    const cleaning = await this.findOne(id);

    if (cleaning.status === 'IN_PROGRESS') {
      throw new BadRequestException('Non è possibile eliminare una pulizia in corso');
    }

    // Delete photos from Cloudinary
    for (const photo of cleaning.photos) {
      await this.mediaService.deleteImage(photo.url);
    }

    return this.prisma.cleaning.delete({ where: { id } });
  }
}
