import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFiles, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AnnouncementService } from './announcement.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { UserService } from '../user/user.service';

const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads', 'announcements');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

@Controller('api/announcements')
export class AnnouncementController {
  constructor(
    private announcementService: AnnouncementService,
    private userService: UserService,
  ) {}

  // Public: list published announcements
  @Get()
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.announcementService.findAllPublic(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // Public: get single announcement
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.announcementService.findOne(id);
  }

  // Admin: list all announcements (including drafts)
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  async adminList(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    return this.announcementService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  // Admin: create announcement
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() body: { title: string; content: string; images?: string[]; is_pinned?: boolean; status?: string }) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    if (!body.title || !body.content) throw new BadRequestException('标题和内容不能为空');
    return this.announcementService.create(req.user.id, body);
  }

  // Admin: update announcement
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Request() req, @Body() body: Partial<{ title: string; content: string; images: string[]; is_pinned: boolean; status: string }>) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    return this.announcementService.update(id, req.user.id, body);
  }

  // Admin: delete announcement
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    await this.announcementService.delete(id);
    return { message: '已删除' };
  }

  // Admin: upload images
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 9, { storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
      return cb(new BadRequestException('仅支持 jpg/png/gif/webp 格式'), false);
    }
    cb(null, true);
  }}))
  async uploadImages(@Request() req, @UploadedFiles() files: Express.Multer.File[]) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    if (!files || files.length === 0) throw new BadRequestException('请选择图片');
    const urls = files.map(f => `/uploads/announcements/${f.filename}`);
    return { urls };
  }
}
