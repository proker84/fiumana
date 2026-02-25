import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StockCategory, Prisma } from '@prisma/client';

export interface CreateStockItemDto {
  propertyId: string;
  category: StockCategory;
  name: string;
  quantity?: number;
  minQuantity?: number;
  unit?: string;
  notes?: string;
}

export interface UpdateStockItemDto {
  category?: StockCategory;
  name?: string;
  minQuantity?: number;
  unit?: string;
  notes?: string;
}

export interface UpdateQuantityDto {
  quantity: number;
  reason: string;
}

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async findAll(propertyId?: string) {
    const where: Prisma.StockItemWhereInput = {};
    if (propertyId) where.propertyId = propertyId;

    return this.prisma.stockItem.findMany({
      where,
      include: {
        property: { select: { id: true, title: true } },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.stockItem.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, title: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Articolo non trovato');
    }

    return item;
  }

  async getLowStockAlerts() {
    return this.prisma.stockItem.findMany({
      where: {
        quantity: {
          lt: this.prisma.stockItem.fields.minQuantity,
        },
      },
      include: {
        property: { select: { id: true, title: true } },
      },
      orderBy: { quantity: 'asc' },
    });
  }

  async getLowStockAlertsRaw() {
    // Use raw query for complex comparison
    return this.prisma.$queryRaw`
      SELECT si.*, p.title as "propertyTitle"
      FROM "StockItem" si
      JOIN "Property" p ON si."propertyId" = p.id
      WHERE si.quantity < si."minQuantity"
      ORDER BY si.quantity ASC
    `;
  }

  async create(data: CreateStockItemDto) {
    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Proprietà non trovata');
    }

    return this.prisma.stockItem.create({
      data: {
        propertyId: data.propertyId,
        category: data.category,
        name: data.name,
        quantity: data.quantity ?? 0,
        minQuantity: data.minQuantity ?? 5,
        unit: data.unit,
        notes: data.notes,
      },
      include: {
        property: { select: { id: true, title: true } },
      },
    });
  }

  async update(id: string, data: UpdateStockItemDto) {
    await this.findOne(id);

    return this.prisma.stockItem.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, title: true } },
      },
    });
  }

  async updateQuantity(id: string, data: UpdateQuantityDto, userId?: string) {
    const item = await this.findOne(id);

    if (data.quantity < 0) {
      throw new BadRequestException('La quantità non può essere negativa');
    }

    const quantityChange = data.quantity - item.quantity;

    // Create movement record and update quantity in a transaction
    const [updatedItem] = await this.prisma.$transaction([
      this.prisma.stockItem.update({
        where: { id },
        data: { quantity: data.quantity },
        include: {
          property: { select: { id: true, title: true } },
        },
      }),
      this.prisma.stockMovement.create({
        data: {
          stockItemId: id,
          quantityChange,
          reason: data.reason,
          userId,
        },
      }),
    ]);

    return updatedItem;
  }

  async adjustQuantity(id: string, change: number, reason: string, userId?: string) {
    const item = await this.findOne(id);
    const newQuantity = item.quantity + change;

    if (newQuantity < 0) {
      throw new BadRequestException('La quantità risultante non può essere negativa');
    }

    return this.updateQuantity(id, { quantity: newQuantity, reason }, userId);
  }

  async getMovements(itemId: string, limit = 50) {
    return this.prisma.stockMovement.findMany({
      where: { stockItemId: itemId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.stockItem.delete({ where: { id } });
  }

  async getStatsByProperty(propertyId: string) {
    const items = await this.prisma.stockItem.findMany({
      where: { propertyId },
    });

    const stats = {
      totalItems: items.length,
      lowStockCount: items.filter((i) => i.quantity < i.minQuantity).length,
      outOfStockCount: items.filter((i) => i.quantity === 0).length,
      byCategory: {} as Record<string, number>,
    };

    for (const item of items) {
      stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
    }

    return stats;
  }
}
