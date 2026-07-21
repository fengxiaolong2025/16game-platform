import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, Request, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { CommunityService } from './community.service';

@Controller('api/community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ===== Posts =====

  @Get('posts')
  async listPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.communityService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      category,
      keyword,
    });
  }

  @Get('posts/:id')
  async getPost(@Param('id', ParseUUIDPipe) id: string) {
    const post = await this.communityService.findOne(id);
    if (!post) return { message: '帖子不存在' };
    return post;
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  async createPost(@Request() req, @Body() body: any) {
    return this.communityService.create(req.user.id, {
      title: body.title,
      content: body.content,
      images: body.images,
      category: body.category || 'general',
    });
  }

  @Put('posts/:id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() body: any,
  ) {
    return this.communityService.update(id, req.user.id, body);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  async deletePost(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.communityService.delete(id, req.user.id);
  }

  @Get('users/:userId/posts')
  async getUserPosts(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.communityService.findByAuthor(userId);
  }

  // ===== Likes =====

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  async togglePostLike(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.communityService.toggleLike(req.user.id, id, 'post');
  }

  @Get('posts/:id/liked')
  @UseGuards(JwtAuthGuard)
  async isPostLiked(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return { liked: await this.communityService.isLiked(req.user.id, id, 'post') };
  }

  // ===== Comments =====

  @Get('posts/:id/comments')
  async listComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.communityService.findComments(id);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() body: any,
  ) {
    return this.communityService.createComment(req.user.id, id, {
      content: body.content,
      parent_id: body.parent_id,
    });
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.communityService.deleteComment(id, req.user.id);
  }

  @Post('comments/:id/like')
  @UseGuards(JwtAuthGuard)
  async toggleCommentLike(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.communityService.toggleLike(req.user.id, id, 'comment');
  }
}
