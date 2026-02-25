import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { MediaService } from '../media/media.service';
import { FaqCategory, Prisma } from '@prisma/client';

export interface CreateFaqDto {
  propertyId: string;
  question: string;
  answer: string;
  category: FaqCategory;
  videoUrl?: string;
  audioUrl?: string;
  imageUrls?: string[];
  sortOrder?: number;
}

export interface UpdateFaqDto {
  question?: string;
  answer?: string;
  category?: FaqCategory;
  videoUrl?: string;
  audioUrl?: string;
  imageUrls?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

@Injectable()
export class FaqService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async findAll(propertyId?: string, category?: FaqCategory) {
    const where: Prisma.FaqItemWhereInput = { isActive: true };
    if (propertyId) where.propertyId = propertyId;
    if (category) where.category = category;

    return this.prisma.faqItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findAllAdmin(propertyId?: string) {
    const where: Prisma.FaqItemWhereInput = {};
    if (propertyId) where.propertyId = propertyId;

    return this.prisma.faqItem.findMany({
      where,
      include: {
        property: { select: { id: true, title: true } },
      },
      orderBy: [{ propertyId: 'asc' }, { category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findOne(id: string) {
    const faq = await this.prisma.faqItem.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, title: true } },
      },
    });

    if (!faq) {
      throw new NotFoundException('FAQ non trovata');
    }

    return faq;
  }

  async create(data: CreateFaqDto) {
    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Proprietà non trovata');
    }

    // Get max sortOrder for this property/category
    const maxSortOrder = await this.prisma.faqItem.aggregate({
      where: {
        propertyId: data.propertyId,
        category: data.category,
      },
      _max: { sortOrder: true },
    });

    return this.prisma.faqItem.create({
      data: {
        propertyId: data.propertyId,
        question: data.question,
        answer: data.answer,
        category: data.category,
        videoUrl: data.videoUrl,
        audioUrl: data.audioUrl,
        imageUrls: data.imageUrls ?? [],
        sortOrder: data.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
      },
      include: {
        property: { select: { id: true, title: true } },
      },
    });
  }

  async update(id: string, data: UpdateFaqDto) {
    await this.findOne(id);

    return this.prisma.faqItem.update({
      where: { id },
      data,
      include: {
        property: { select: { id: true, title: true } },
      },
    });
  }

  async uploadMedia(id: string, file: Express.Multer.File, mediaType: 'video' | 'audio' | 'image') {
    const faq = await this.findOne(id);

    const folder = `faq/${mediaType}s`;
    let uploadResult: { url: string };

    if (mediaType === 'video') {
      uploadResult = await this.mediaService.uploadVideo(file, folder);
      return this.prisma.faqItem.update({
        where: { id },
        data: { videoUrl: uploadResult.url },
      });
    } else if (mediaType === 'audio') {
      uploadResult = await this.mediaService.uploadAudio(file, folder);
      return this.prisma.faqItem.update({
        where: { id },
        data: { audioUrl: uploadResult.url },
      });
    } else {
      uploadResult = await this.mediaService.uploadImage(file, folder);
      return this.prisma.faqItem.update({
        where: { id },
        data: { imageUrls: { push: uploadResult.url } },
      });
    }
  }

  async removeImage(id: string, imageUrl: string) {
    const faq = await this.findOne(id);

    if (!faq.imageUrls.includes(imageUrl)) {
      throw new NotFoundException('Immagine non trovata');
    }

    await this.mediaService.deleteImage(imageUrl);

    return this.prisma.faqItem.update({
      where: { id },
      data: {
        imageUrls: faq.imageUrls.filter((url) => url !== imageUrl),
      },
    });
  }

  async delete(id: string) {
    const faq = await this.findOne(id);

    // Delete media from Cloudinary
    if (faq.videoUrl) await this.mediaService.deleteImage(faq.videoUrl);
    if (faq.audioUrl) await this.mediaService.deleteImage(faq.audioUrl);
    for (const imageUrl of faq.imageUrls) {
      await this.mediaService.deleteImage(imageUrl);
    }

    return this.prisma.faqItem.delete({ where: { id } });
  }

  async reorder(propertyId: string, category: FaqCategory, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.faqItem.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    return this.prisma.$transaction(updates);
  }
}
