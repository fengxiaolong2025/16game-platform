import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus, ForbiddenException, BadRequestException, UseInterceptors, UploadedFiles, ConflictException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UserService } from './user.service';
import { WechatAuthService } from './wechat-auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const PLAYER_UPLOAD_DIR = join(__dirname, '..', '..', 'uploads', 'players');

const playerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(PLAYER_UPLOAD_DIR)) mkdirSync(PLAYER_UPLOAD_DIR, { recursive: true });
    cb(null, PLAYER_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

@Controller('api/users')
export class UserController {
  constructor(
    private userService: UserService,
    private wechatAuthService: WechatAuthService,
  ) {}

  @Post('register/phone')
  async registerByPhone(@Body() body: { phone: string; code: string; nickname?: string }) {
    // In production, verify SMS code here
    return this.userService.registerByPhone(body.phone, body.nickname);
  }

  @Post('register/email')
  async registerByEmail(@Body() body: { email: string; password: string; nickname?: string }) {
    return this.userService.registerByEmail(body.email, body.password, body.nickname);
  }

  @Post('register/username')
  async registerByUsername(@Body() body: { username: string; password: string; nickname?: string }) {
    return this.userService.registerByUsername(body.username, body.password, body.nickname);
  }

  @Post('login/phone')
  @HttpCode(HttpStatus.OK)
  async loginByPhone(@Body() body: { phone: string; code: string }) {
    return this.userService.loginByPhone(body.phone);
  }

  @Post('login/email')
  @HttpCode(HttpStatus.OK)
  async loginByEmail(@Body() body: { email: string; password: string }) {
    return this.userService.loginByEmail(body.email, body.password);
  }

  @Post('login/username')
  @HttpCode(HttpStatus.OK)
  async loginByUsername(@Body() body: { username: string; password: string }) {
    return this.userService.loginByUsername(body.username, body.password);
  }

  @Post('login/wechat')
  @HttpCode(HttpStatus.OK)
  async loginByWechat(@Body() body: { code: string; nickname?: string; avatar?: string }) {
    // 调用微信 code2Session 获取 openid/session_key
    const session = await this.wechatAuthService.code2Session(body.code);
    const unionId = session.unionid || session.openid;

    // 检查该微信是否已绑定账号
    const existing = await this.userService.findByWechatUnionId(unionId);
    if (existing) {
      // 已绑定，直接登录
      const result = await this.userService.createOrUpdateByWechat({
        unionId,
        nickname: body.nickname || '微信用户',
        avatar: body.avatar || '',
      });
      return { needBind: false, ...result };
    }

    // 未绑定，返回需要绑定的信息
    return {
      needBind: true,
      wechatProfile: {
        unionId,
        nickname: body.nickname || '',
        avatar: body.avatar || '',
      },
    };
  }

  /**
   * 绑定已有网页端账号（用户名/邮箱/手机号 + 密码）
   */
  @Post('bindWechat')
  @HttpCode(HttpStatus.OK)
  async bindWechat(@Body() body: { username: string; password: string; unionId: string; nickname?: string; avatar?: string }) {
    if (!body.username || !body.password || !body.unionId) {
      throw new BadRequestException('请填写完整信息');
    }
    return this.userService.bindWechatAccount(body.username, body.password, body.unionId, body.nickname, body.avatar);
  }

  /**
   * 跳过绑定，直接用微信信息创建新用户
   */
  @Post('wechat/register')
  @HttpCode(HttpStatus.OK)
  async wechatRegister(@Body() body: { unionId: string; nickname: string; avatar?: string }) {
    if (!body.unionId) {
      throw new BadRequestException('缺少微信信息');
    }
    return this.userService.createWechatUser(body.unionId, body.nickname || '微信用户', body.avatar || '');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.userService.findById(req.user.id);
    const { password_hash, ...profile } = user;
    return profile;
  }

  /**
   * 用户自助解绑微信
   */
  @Post('me/unbindWechat')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unbindWechat(@Request() req) {
    await this.userService.unbindWechat(req.user.id);
    return { message: '微信解绑成功' };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() body: { nickname?: string; avatar?: string; games?: string[]; game_ids?: string; bio?: string; position?: string; phone?: string; email?: string; ladder_score?: number; player_photos?: string[] }) {
    return this.userService.updateProfile(req.user.id, body);
  }

  // === Admin endpoints (must be before :id route) ===

  @Get('admin/users')
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Request() req) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    const users = await this.userService.getAllUsers();
    return users.map(u => {
      const { password_hash, ...profile } = u;
      return profile;
    });
  }

  @Delete('admin/users/:id')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string, @Request() req) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    await this.userService.deleteUser(id, req.user.id);
    return { message: '删除成功' };
  }

  @Put('admin/users/:id/password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(@Param('id') id: string, @Request() req, @Body() body: { password: string }) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    if (!id || id === 'NaN' || id === 'undefined') {
      throw new BadRequestException('无效的用户ID');
    }
    await this.userService.resetUserPassword(id, body.password, req.user.id);
    return { message: '密码已重置' };
  }

  @Put('admin/users/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateUserStatus(@Param('id') id: string, @Request() req, @Body() body: { status: string }) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    await this.userService.updateUserStatus(id, body.status, req.user.id);
    return { message: '状态已更新' };
  }

  /**
   * 管理员协助解绑用户微信
   */
  @Put('admin/users/:id/unbindWechat')
  @UseGuards(JwtAuthGuard)
  async adminUnbindWechat(@Param('id') id: string, @Request() req) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可操作');
    await this.userService.adminUnbindWechat(id, req.user.id);
    return { message: '微信解绑成功' };
  }

  /**
   * 设置用户角色（仅超级管理员可操作）
   * role: 0=普通用户, 2=二级管理员
   */
  @Put('admin/users/:id/role')
  @UseGuards(JwtAuthGuard)
  async updateUserRole(@Param('id') id: string, @Request() req, @Body() body: { role: number }) {
    const isSuperAdmin = await this.userService.isSuperAdmin(req.user.id);
    if (!isSuperAdmin) throw new ForbiddenException('仅超级管理员可设置用户角色');
    await this.userService.updateUserRole(id, body.role, req.user.id);
    return { message: '角色已更新' };
  }

  // Public: list featured players
  @Get('players')
  async listPlayers() {
    return this.userService.findFeaturedPlayers();
  }

  // Upload player photos
  @Post('me/photos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 6, { storage: playerStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
      return cb(new BadRequestException('仅支持 jpg/png/gif/webp 格式'), false);
    }
    cb(null, true);
  }}))
  async uploadPlayerPhotos(@Request() req, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) throw new BadRequestException('请选择图片');
    const urls = files.map(f => `/uploads/players/${f.filename}`);
    return { urls };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) return null;
    const { password_hash, phone, email, wechat_union_id, ...profile } = user;
    return profile;
  }
}
