import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface PropertyFilters {
  type?: string;
  contractType?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  sleeps?: number;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: PropertyFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 12;

    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.contractType) where.contractType = filters.contractType;
    if (filters.city) where.location = { city: { contains: filters.city, mode: 'insensitive' } };
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }
    if (filters.bedrooms) where.bedrooms = { gte: filters.bedrooms };
    if (filters.sleeps) where.sleeps = { gte: filters.sleeps };

    const [items, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: {
          location: true,
          media: true,
          amenities: true,
          availability: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.property.count({ where }),
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
    return this.prisma.property.findUnique({
      where: { id },
      include: {
        location: true,
        media: true,
        amenities: true,
        availability: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.property.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        contractType: data.contractType,
        price: data.price,
        areaSqm: data.areaSqm,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        sleeps: data.sleeps,
        isFeatured: data.isFeatured,
        location: data.location ? { create: data.location } : undefined,
        amenities: data.amenities?.length
          ? {
              connectOrCreate: data.amenities.map((amenity: { name: string }) => ({
                where: { name: amenity.name },
                create: { name: amenity.name },
              })),
            }
          : undefined,
        media: data.mediaUrls?.length
          ? {
              create: data.mediaUrls.map((url: string) => ({ url, type: 'IMAGE' })),
            }
          : undefined,
      },
      include: {
        location: true,
        media: true,
        amenities: true,
        availability: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.property.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        contractType: data.contractType,
        price: data.price,
        areaSqm: data.areaSqm,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        sleeps: data.sleeps,
        isFeatured: data.isFeatured,
        location: data.location
          ? {
              upsert: {
                create: data.location,
                update: data.location,
              },
            }
          : undefined,
        amenities: data.amenities?.length
          ? {
              set: [],
              connectOrCreate: data.amenities.map((amenity: { name: string }) => ({
                where: { name: amenity.name },
                create: { name: amenity.name },
              })),
            }
          : undefined,
      },
      include: {
        location: true,
        media: true,
        amenities: true,
        availability: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.property.delete({ where: { id } });
  }
}
