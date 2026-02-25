import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async listPublished() {
    return this.prisma.post.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } });
  }

  async getBySlug(slug: string) {
    return this.prisma.post.findUnique({ where: { slug } });
  }

  async listAdmin() {
    return this.prisma.post.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(data: any) {
    return this.prisma.post.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.post.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }
}
