import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService, CreateBookingDto, UpdateBookingDto, BookingFilters } from './bookings.service';
import { IcalSyncService } from './ical-sync.service';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { BookingSource } from '@prisma/client';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly icalSyncService: IcalSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all bookings with filters' })
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('guestId') guestId?: string,
    @Query('source') source?: BookingSource,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('checkInCompleted') checkInCompleted?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters: BookingFilters = {
      propertyId,
      guestId,
      source,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      checkInCompleted: checkInCompleted !== undefined ? checkInCompleted === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    };

    return this.bookingsService.findAll(filters);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming bookings' })
  async getUpcoming(
    @Query('propertyId') propertyId?: string,
    @Query('days') days?: string,
  ) {
    return this.bookingsService.getUpcoming(propertyId, days ? parseInt(days, 10) : undefined);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently active bookings' })
  async getActive(@Query('propertyId') propertyId?: string) {
    return this.bookingsService.getActive(propertyId);
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get booking statistics' })
  async getStats(
    @Query('propertyId') propertyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingsService.getStats(
      propertyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new booking' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a booking' })
  async update(@Param('id') id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Patch(':id/checkin-complete')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mark check-in as completed' })
  async markCheckInCompleted(@Param('id') id: string) {
    return this.bookingsService.markCheckInCompleted(id);
  }

  @Patch(':id/alloggiati-sent')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mark Alloggiati data as sent' })
  async markAlloggiatiSent(@Param('id') id: string) {
    return this.bookingsService.markAlloggiatiSent(id);
  }

  @Post('sync/:propertyId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually trigger iCal sync for a property' })
  async syncProperty(@Param('propertyId') propertyId: string) {
    const property = await this.bookingsService.findOne(propertyId).catch(() => null);

    // Get property with iCal URL
    const { PrismaService } = await import('../common/prisma.service');
    const prisma = new PrismaService();

    const prop = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { icalUrl: true },
    });

    if (!prop?.icalUrl) {
      return { error: 'Property does not have an iCal URL configured' };
    }

    return this.icalSyncService.syncProperty(propertyId, prop.icalUrl);
  }

  @Post('sync-all')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually trigger iCal sync for all properties' })
  async syncAll() {
    await this.icalSyncService.syncAllProperties();
    return { message: 'Sync completed' };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a booking' })
  async delete(@Param('id') id: string) {
    return this.bookingsService.delete(id);
  }
}
