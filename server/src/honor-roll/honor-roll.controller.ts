import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, BadRequestException, ForbiddenException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { HonorRollService } from './honor-roll.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { UserService } from '../user/user.service';

const UPLOAD_DIR = join(__dirname, '..', '..', 'uploads', 'honor');

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

@Controller('api/honor-rolls')
export class HonorRollController {
  constructor(
    private honorRollService: HonorRollService,
    private userService: UserService,
  ) {}

  @Get()
  async list() {
    return this.honorRollService.findAllPublic();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  async adminList(@Request() req) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    return this.honorRollService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() body: Partial<any>) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    if (!body.title || !body.award_type || !body.winner_name) {
      throw new BadRequestException('标题、奖项类型和获奖者名称不能为空');
    }
    return this.honorRollService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Request() req, @Body() body: Partial<any>) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    return this.honorRollService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    await this.honorRollService.delete(id);
    return { message: '已删除' };
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', { storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
      return cb(new BadRequestException('仅支持 jpg/png/gif/webp 格式'), false);
    }
    cb(null, true);
  }}))
  async uploadImage(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    if (!file) throw new BadRequestException('请选择图片');
    return { url: `/uploads/honor/${file.filename}` };
  }
}
