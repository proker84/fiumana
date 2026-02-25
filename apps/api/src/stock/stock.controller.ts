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
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockService, CreateStockItemDto, UpdateStockItemDto, UpdateQuantityDto } from './stock.service';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stock items' })
  async findAll(@Query('propertyId') propertyId?: string) {
    return this.stockService.findAll(propertyId);
  }

  @Get('alerts')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get low stock alerts' })
  async getLowStockAlerts() {
    return this.stockService.getLowStockAlertsRaw();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock item by ID' })
  async findOne(@Param('id') id: string) {
    return this.stockService.findOne(id);
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'Get stock movements history' })
  async getMovements(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.stockService.getMovements(id, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('property/:propertyId/stats')
  @ApiOperation({ summary: 'Get stock statistics for a property' })
  async getStatsByProperty(@Param('propertyId') propertyId: string) {
    return this.stockService.getStatsByProperty(propertyId);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new stock item' })
  async create(@Body() createStockItemDto: CreateStockItemDto) {
    return this.stockService.create(createStockItemDto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a stock item' })
  async update(@Param('id') id: string, @Body() updateStockItemDto: UpdateStockItemDto) {
    return this.stockService.update(id, updateStockItemDto);
  }

  @Patch(':id/quantity')
  @Roles('ADMIN', 'CLEANER')
  @ApiOperation({ summary: 'Update stock quantity' })
  async updateQuantity(
    @Param('id') id: string,
    @Body() updateQuantityDto: UpdateQuantityDto,
    @Request() req,
  ) {
    return this.stockService.updateQuantity(id, updateQuantityDto, req.user.sub);
  }

  @Post(':id/increment')
  @Roles('ADMIN', 'CLEANER')
  @ApiOperation({ summary: 'Increment stock quantity by 1' })
  async increment(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.stockService.adjustQuantity(id, 1, reason || 'Rifornimento', req.user.sub);
  }

  @Post(':id/decrement')
  @Roles('ADMIN', 'CLEANER')
  @ApiOperation({ summary: 'Decrement stock quantity by 1' })
  async decrement(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.stockService.adjustQuantity(id, -1, reason || 'Utilizzo', req.user.sub);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a stock item' })
  async delete(@Param('id') id: string) {
    return this.stockService.delete(id);
  }
}
