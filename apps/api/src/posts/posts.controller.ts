import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { z } from 'zod';
// import { PostSchema } from '@shared/index';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { PostsService } from './posts.service';

const PostInputSchema = z.object({ title: z.string(), content: z.string() });

@ApiTags('posts')
@Controller()
export class PostsController {
  constructor(private posts: PostsService) {}

  @Get('posts')
  async listPublished() {
    return this.posts.listPublished();
  }

  @Get('posts/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.posts.getBySlug(slug);
  }

  @Get('admin/posts')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async listAdmin() {
    return this.posts.listAdmin();
  }

  @Post('admin/posts')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @UsePipes(new ZodValidationPipe(PostInputSchema))
  async create(@Body() body: z.infer<typeof PostInputSchema>) {
    return this.posts.create(body);
  }

  @Put('admin/posts/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @UsePipes(new ZodValidationPipe(PostInputSchema))
  async update(@Param('id') id: string, @Body() body: z.infer<typeof PostInputSchema>) {
    return this.posts.update(id, body);
  }

  @Delete('admin/posts/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.posts.remove(id);
  }
}
