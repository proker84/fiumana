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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CleaningsService, CreateCleaningDto, UpdateCleaningDto, CleaningFilters } from './cleanings.service';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CleaningStatus, PhotoType } from '@prisma/client';

@ApiTags('cleanings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('cleanings')
export class CleaningsController {
  constructor(private readonly cleaningsService: CleaningsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cleanings with filters' })
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('cleanerId') cleanerId?: string,
    @Query('status') status?: CleaningStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters: CleaningFilters = {
      propertyId,
      cleanerId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    };

    return this.cleaningsService.findAll(filters);
  }

  @Get('my')
  @Roles('CLEANER')
  @ApiOperation({ summary: 'Get cleanings for current cleaner' })
  async findMy(
    @Request() req,
    @Query('status') status?: CleaningStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cleaningsService.findAll({
      cleanerId: req.user.sub,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('stats')
  @Roles('CLEANER')
  @ApiOperation({ summary: 'Get cleaning stats for current cleaner' })
  async getMyStats(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cleaningsService.getCleanerStats(
      req.user.sub,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cleaning by ID' })
  async findOne(@Param('id') id: string) {
    return this.cleaningsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new cleaning' })
  async create(@Body() createCleaningDto: CreateCleaningDto) {
    return this.cleaningsService.create(createCleaningDto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a cleaning' })
  async update(@Param('id') id: string, @Body() updateCleaningDto: UpdateCleaningDto) {
    return this.cleaningsService.update(id, updateCleaningDto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'CLEANER')
  @ApiOperation({ summary: 'Update cleaning status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: CleaningStatus,
  ) {
    return this.cleaningsService.updateStatus(id, status);
  }

  @Post(':id/photos')
  @Roles('ADMIN', 'CLEANER')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Upload a cleaning photo' })
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('type') type: PhotoType,
    @Body('room') room?: string,
  ) {
    return this.cleaningsService.uploadPhoto(id, file, type, room);
  }

  @Delete('photos/:photoId')
  @Roles('ADMIN', 'CLEANER')
  @ApiOperation({ summary: 'Delete a cleaning photo' })
  async deletePhoto(@Param('photoId') photoId: string) {
    return this.cleaningsService.deletePhoto(photoId);
  }

  @Patch('checklist/:itemId')
  @Roles('ADMIN', 'CLEANER')
  @ApiOperation({ summary: 'Update checklist item status' })
  async updateChecklistItem(
    @Param('itemId') itemId: string,
    @Body('completed') completed: boolean,
  ) {
    return this.cleaningsService.updateChecklistItem(itemId, completed);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a cleaning' })
  async delete(@Param('id') id: string) {
    return this.cleaningsService.delete(id);
  }
}
