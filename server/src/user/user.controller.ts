import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/users')
export class UserController {
  constructor(private userService: UserService) {}

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
  async loginByWechat(@Body() body: { code: string }) {
    // In production, exchange code with WeChat API
    const mockProfile = {
      unionId: `wx_${body.code}`,
      nickname: '微信用户',
      avatar: '',
    };
    return this.userService.createOrUpdateByWechat(mockProfile);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.userService.findById(req.user.id);
    const { password_hash, ...profile } = user;
    return profile;
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() body: { nickname?: string; avatar?: string; games?: string[]; game_ids?: string }) {
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

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) return null;
    const { password_hash, phone, email, wechat_union_id, ...profile } = user;
    return profile;
  }
}
