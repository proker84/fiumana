import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService, PaymentFilters } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentStatus } from '@prisma/client';

class MarkAsPaidDto {
  cleaningId: string;
  voucherNumber?: string;
  notes?: string;
}

class MarkMultiplePaidDto {
  cleaningIds: string[];
  voucherPrefix?: string;
}

class PaymentFiltersDto {
  status?: 'PENDING' | 'PAID';
  cleanerId?: string;
  propertyId?: string;
  startDate?: string;
  endDate?: string;
}

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async getPayments(@Query() query: PaymentFiltersDto) {
    const filters: PaymentFilters = {};

    if (query.status) {
      filters.status = query.status as PaymentStatus;
    }
    if (query.cleanerId) {
      filters.cleanerId = query.cleanerId;
    }
    if (query.propertyId) {
      filters.propertyId = query.propertyId;
    }
    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const payments = await this.paymentsService.getPaymentsList(filters);

    return {
      total: payments.length,
      payments,
    };
  }

  @Get('pending')
  async getPendingPayments() {
    const payments = await this.paymentsService.getPendingPayments();

    return {
      total: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      payments,
    };
  }

  @Get('paid')
  async getPaidPayments() {
    const payments = await this.paymentsService.getPaidPayments();

    return {
      total: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      payments,
    };
  }

  @Get('summary')
  async getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const summary = await this.paymentsService.getPaymentSummary(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return summary;
  }

  @Get('cleaner/:cleanerId')
  async getCleanerPayments(@Param('cleanerId') cleanerId: string) {
    return this.paymentsService.getCleanerPaymentHistory(cleanerId);
  }

  @Post('mark-paid')
  @HttpCode(HttpStatus.OK)
  async markAsPaid(@Body() dto: MarkAsPaidDto) {
    const result = await this.paymentsService.markAsPaid(dto);

    return {
      success: true,
      message: 'Pagamento registrato con successo',
      cleaning: {
        id: result.cleaning.id,
        cleanerName: result.cleaning.cleaner?.name,
        propertyName: result.cleaning.property?.title,
        amount: result.cleaning.paymentAmount,
      },
    };
  }

  @Post('mark-paid-multiple')
  @HttpCode(HttpStatus.OK)
  async markMultipleAsPaid(@Body() dto: MarkMultiplePaidDto) {
    const result = await this.paymentsService.markMultipleAsPaid(
      dto.cleaningIds,
      dto.voucherPrefix,
    );

    return {
      message: `${result.success} pagamenti registrati, ${result.failed} falliti`,
      ...result,
    };
  }

  @Get('export')
  async exportCsv(
    @Query() query: PaymentFiltersDto,
    @Res() res: Response,
  ) {
    const filters: PaymentFilters = {};

    if (query.status) {
      filters.status = query.status as PaymentStatus;
    }
    if (query.cleanerId) {
      filters.cleanerId = query.cleanerId;
    }
    if (query.propertyId) {
      filters.propertyId = query.propertyId;
    }
    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    const csv = await this.paymentsService.exportToCsv(filters);

    const filename = `pagamenti_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
  }

  @Get('stats/monthly')
  async getMonthlyStats(
    @Query('year') year?: string,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    const summary = await this.paymentsService.getPaymentSummary(startDate, endDate);

    return {
      year: targetYear,
      months: summary.byMonth,
      totals: {
        pending: summary.totalPending,
        paid: summary.totalPaid,
        amountPending: summary.amountPending,
        amountPaid: summary.amountPaid,
        total: summary.totalPending + summary.totalPaid,
        totalAmount: summary.amountPending + summary.amountPaid,
      },
    };
  }
}
