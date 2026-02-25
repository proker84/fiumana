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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FaqService, CreateFaqDto, UpdateFaqDto } from './faq.service';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { FaqCategory } from '@prisma/client';

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  @ApiOperation({ summary: 'Get all FAQs (public)' })
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('category') category?: FaqCategory,
  ) {
    return this.faqService.findAll(propertyId, category);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all FAQs including inactive (admin)' })
  async findAllAdmin(@Query('propertyId') propertyId?: string) {
    return this.faqService.findAllAdmin(propertyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a FAQ by ID' })
  async findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new FAQ' })
  async create(@Body() createFaqDto: CreateFaqDto) {
    return this.faqService.create(createFaqDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a FAQ' })
  async update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    return this.faqService.update(id, updateFaqDto);
  }

  @Post(':id/video')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a video to FAQ' })
  async uploadVideo(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
          new FileTypeValidator({ fileType: /(mp4|webm|mov)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.faqService.uploadMedia(id, file, 'video');
  }

  @Post(':id/audio')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload audio to FAQ' })
  async uploadAudio(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(mp3|wav|ogg|m4a)$/i }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.faqService.uploadMedia(id, file, 'audio');
  }

  @Post(':id/image')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image to FAQ' })
  async uploadImage(
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
  ) {
    return this.faqService.uploadMedia(id, file, 'image');
  }

  @Delete(':id/image')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove an image from FAQ' })
  async removeImage(@Param('id') id: string, @Body('imageUrl') imageUrl: string) {
    return this.faqService.removeImage(id, imageUrl);
  }

  @Post('reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reorder FAQs' })
  async reorder(
    @Body('propertyId') propertyId: string,
    @Body('category') category: FaqCategory,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.faqService.reorder(propertyId, category, orderedIds);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a FAQ' })
  async delete(@Param('id') id: string) {
    return this.faqService.delete(id);
  }
}
