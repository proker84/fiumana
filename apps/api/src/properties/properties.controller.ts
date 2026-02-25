import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
// import { PropertySchema } from '@shared/index';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { PropertiesService } from './properties.service';

const PropertyInputSchema = z.object({ title: z.string(), description: z.string() });

@ApiTags('properties')
@Controller()
export class PropertiesController {
  constructor(private properties: PropertiesService) {}

  @Get('properties')
  async list(@Query() query: any) {
    const filters = {
      type: query.type,
      contractType: query.contractType,
      city: query.city,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      bedrooms: query.bedrooms ? Number(query.bedrooms) : undefined,
      sleeps: query.sleeps ? Number(query.sleeps) : undefined,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    };
    return this.properties.findAll(filters);
  }

  @Get('properties/:id')
  async getOne(@Param('id') id: string) {
    return this.properties.findOne(id);
  }

  @Post('admin/properties')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @UsePipes(new ZodValidationPipe(PropertyInputSchema))
  async create(@Body() body: z.infer<typeof PropertyInputSchema>) {
    return this.properties.create(body);
  }

  @Put('admin/properties/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @UsePipes(new ZodValidationPipe(PropertyInputSchema))
  async update(@Param('id') id: string, @Body() body: z.infer<typeof PropertyInputSchema>) {
    return this.properties.update(id, body);
  }

  @Delete('admin/properties/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.properties.remove(id);
  }

  // Cleaner assignment endpoints
  @Get('admin/properties/:id/cleaners')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async getPropertyWithCleaners(@Param('id') id: string) {
    return this.properties.getPropertyWithCleaners(id);
  }

  @Post('admin/properties/:id/cleaners/:cleanerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async assignCleaner(
    @Param('id') propertyId: string,
    @Param('cleanerId') cleanerId: string,
  ) {
    return this.properties.assignCleanerToProperty(propertyId, cleanerId);
  }

  @Delete('admin/properties/:id/cleaners/:cleanerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async removeCleaner(
    @Param('id') propertyId: string,
    @Param('cleanerId') cleanerId: string,
  ) {
    return this.properties.removeCleanerFromProperty(propertyId, cleanerId);
  }

  @Get('admin/cleaners')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async getAvailableCleaners() {
    return this.properties.getAvailableCleaners();
  }

  // Endpoint for cleaners to get their assigned properties
  @Get('cleaner/properties')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLEANER')
  async getCleanerProperties(@Query('cleanerId') cleanerId: string) {
    return this.properties.getPropertiesForCleaner(cleanerId);
  }
}
