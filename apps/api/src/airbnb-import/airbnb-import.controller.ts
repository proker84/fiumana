import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AirbnbImportService } from './airbnb-import.service';

class ImportAirbnbDto {
  url: string;
}

@ApiTags('Airbnb Import')
@Controller('airbnb-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AirbnbImportController {
  constructor(private airbnbImportService: AirbnbImportService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Importa un immobile da Airbnb' })
  async importFromAirbnb(@Body() dto: ImportAirbnbDto) {
    return this.airbnbImportService.importFromAirbnb(dto.url);
  }

  @Post('preview')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Anteprima dati immobile Airbnb senza importare' })
  async previewAirbnb(@Body() dto: ImportAirbnbDto) {
    return this.airbnbImportService.fetchListingData(dto.url);
  }
}
