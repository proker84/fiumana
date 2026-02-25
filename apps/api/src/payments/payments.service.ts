import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PaymentStatus, CleaningStatus } from '@prisma/client';

export interface PaymentSummary {
  totalPending: number;
  totalPaid: number;
  amountPending: number;
  amountPaid: number;
  byMonth: {
    month: string;
    pending: number;
    paid: number;
    amountPending: number;
    amountPaid: number;
  }[];
  byCleaner: {
    cleanerId: string;
    cleanerName: string;
    pending: number;
    paid: number;
    totalAmount: number;
  }[];
}

export interface PaymentRecord {
  id: string;
  cleaningId: string;
  cleanerName: string;
  cleanerEmail: string;
  propertyName: string;
  scheduledDate: Date;
  completedAt: Date | null;
  amount: number;
  status: PaymentStatus;
  paidAt: Date | null;
  voucherNumber: string | null;
}

export interface MarkAsPaidDto {
  cleaningId: string;
  voucherNumber?: string;
  notes?: string;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  cleanerId?: string;
  propertyId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPaymentsList(filters: PaymentFilters = {}): Promise<PaymentRecord[]> {
    const where: any = {
      status: CleaningStatus.COMPLETED,
    };

    if (filters.status) {
      where.paymentStatus = filters.status;
    }

    if (filters.cleanerId) {
      where.cleanerId = filters.cleanerId;
    }

    if (filters.propertyId) {
      where.propertyId = filters.propertyId;
    }

    if (filters.startDate || filters.endDate) {
      where.completedAt = {};
      if (filters.startDate) {
        where.completedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.completedAt.lte = filters.endDate;
      }
    }

    const cleanings = await this.prisma.cleaning.findMany({
      where,
      include: {
        cleaner: true,
        property: true,
      },
      orderBy: [
        { paymentStatus: 'asc' }, // PENDING first
        { completedAt: 'desc' },
      ],
    });

    return cleanings.map((c) => ({
      id: c.id,
      cleaningId: c.id,
      cleanerName: c.cleaner?.name || 'Non assegnato',
      cleanerEmail: c.cleaner?.email || '',
      propertyName: c.property.title,
      scheduledDate: c.scheduledDate,
      completedAt: c.completedAt,
      amount: c.paymentAmount,
      status: c.paymentStatus,
      paidAt: c.paymentStatus === PaymentStatus.PAID ? c.updatedAt : null,
      voucherNumber: c.notes?.match(/VOUCHER:\s*(\S+)/)?.[1] || null,
    }));
  }

  async getPendingPayments(): Promise<PaymentRecord[]> {
    return this.getPaymentsList({ status: PaymentStatus.PENDING });
  }

  async getPaidPayments(): Promise<PaymentRecord[]> {
    return this.getPaymentsList({ status: PaymentStatus.PAID });
  }

  async markAsPaid(dto: MarkAsPaidDto): Promise<{ success: boolean; cleaning: any }> {
    const cleaning = await this.prisma.cleaning.findUnique({
      where: { id: dto.cleaningId },
      include: { cleaner: true, property: true },
    });

    if (!cleaning) {
      throw new NotFoundException('Cleaning not found');
    }

    if (cleaning.status !== CleaningStatus.COMPLETED) {
      throw new Error('Cannot mark as paid - cleaning is not completed');
    }

    // Build notes with voucher number
    let notes = cleaning.notes || '';
    if (dto.voucherNumber) {
      notes = `${notes}\nVOUCHER: ${dto.voucherNumber}`.trim();
    }
    if (dto.notes) {
      notes = `${notes}\n${dto.notes}`.trim();
    }

    const updated = await this.prisma.cleaning.update({
      where: { id: dto.cleaningId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        notes,
      },
      include: {
        cleaner: true,
        property: true,
      },
    });

    this.logger.log(
      `Payment marked as PAID for cleaning ${dto.cleaningId}, voucher: ${dto.voucherNumber || 'N/A'}`,
    );

    return { success: true, cleaning: updated };
  }

  async markMultipleAsPaid(
    cleaningIds: string[],
    voucherPrefix?: string,
  ): Promise<{ success: number; failed: number; results: any[] }> {
    const results: any[] = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < cleaningIds.length; i++) {
      const cleaningId = cleaningIds[i];
      const voucherNumber = voucherPrefix
        ? `${voucherPrefix}-${String(i + 1).padStart(3, '0')}`
        : undefined;

      try {
        await this.markAsPaid({ cleaningId, voucherNumber });
        results.push({ cleaningId, success: true, voucherNumber });
        success++;
      } catch (error) {
        results.push({ cleaningId, success: false, error: error.message });
        failed++;
      }
    }

    return { success, failed, results };
  }

  async getPaymentSummary(
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaymentSummary> {
    const where: any = {
      status: CleaningStatus.COMPLETED,
    };

    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = startDate;
      if (endDate) where.completedAt.lte = endDate;
    }

    const cleanings = await this.prisma.cleaning.findMany({
      where,
      include: {
        cleaner: true,
      },
    });

    // Calculate totals
    const pending = cleanings.filter((c) => c.paymentStatus === PaymentStatus.PENDING);
    const paid = cleanings.filter((c) => c.paymentStatus === PaymentStatus.PAID);

    // Group by month
    const byMonthMap = new Map<
      string,
      { pending: number; paid: number; amountPending: number; amountPaid: number }
    >();

    for (const c of cleanings) {
      if (!c.completedAt) continue;
      const month = c.completedAt.toISOString().slice(0, 7); // YYYY-MM
      const current = byMonthMap.get(month) || {
        pending: 0,
        paid: 0,
        amountPending: 0,
        amountPaid: 0,
      };

      if (c.paymentStatus === PaymentStatus.PENDING) {
        current.pending++;
        current.amountPending += c.paymentAmount;
      } else {
        current.paid++;
        current.amountPaid += c.paymentAmount;
      }

      byMonthMap.set(month, current);
    }

    const byMonth = Array.from(byMonthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));

    // Group by cleaner
    const byCleanerMap = new Map<
      string,
      { cleanerName: string; pending: number; paid: number; totalAmount: number }
    >();

    for (const c of cleanings) {
      if (!c.cleanerId) continue;
      const current = byCleanerMap.get(c.cleanerId) || {
        cleanerName: c.cleaner?.name || 'Sconosciuto',
        pending: 0,
        paid: 0,
        totalAmount: 0,
      };

      if (c.paymentStatus === PaymentStatus.PENDING) {
        current.pending++;
      } else {
        current.paid++;
      }
      current.totalAmount += c.paymentAmount;

      byCleanerMap.set(c.cleanerId, current);
    }

    const byCleaner = Array.from(byCleanerMap.entries())
      .map(([cleanerId, data]) => ({ cleanerId, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      totalPending: pending.length,
      totalPaid: paid.length,
      amountPending: pending.reduce((sum, c) => sum + c.paymentAmount, 0),
      amountPaid: paid.reduce((sum, c) => sum + c.paymentAmount, 0),
      byMonth,
      byCleaner,
    };
  }

  async exportToCsv(filters: PaymentFilters = {}): Promise<string> {
    const payments = await this.getPaymentsList(filters);

    const headers = [
      'ID',
      'Addetto',
      'Email',
      'Proprietà',
      'Data Pulizia',
      'Data Completamento',
      'Importo (€)',
      'Stato',
      'Voucher',
    ];

    const rows = payments.map((p) => [
      p.cleaningId,
      p.cleanerName,
      p.cleanerEmail,
      p.propertyName,
      p.scheduledDate.toLocaleDateString('it-IT'),
      p.completedAt?.toLocaleDateString('it-IT') || '',
      p.amount.toFixed(2),
      p.status === PaymentStatus.PAID ? 'Pagato' : 'In attesa',
      p.voucherNumber || '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    return csvContent;
  }

  async getCleanerPaymentHistory(cleanerId: string): Promise<{
    cleaner: { id: string; name: string; email: string };
    payments: PaymentRecord[];
    totals: { pending: number; paid: number; amountPending: number; amountPaid: number };
  }> {
    const cleaner = await this.prisma.user.findUnique({
      where: { id: cleanerId },
    });

    if (!cleaner) {
      throw new NotFoundException('Cleaner not found');
    }

    const payments = await this.getPaymentsList({ cleanerId });

    const pending = payments.filter((p) => p.status === PaymentStatus.PENDING);
    const paid = payments.filter((p) => p.status === PaymentStatus.PAID);

    return {
      cleaner: {
        id: cleaner.id,
        name: cleaner.name,
        email: cleaner.email,
      },
      payments,
      totals: {
        pending: pending.length,
        paid: paid.length,
        amountPending: pending.reduce((sum, p) => sum + p.amount, 0),
        amountPaid: paid.reduce((sum, p) => sum + p.amount, 0),
      },
    };
  }
}
