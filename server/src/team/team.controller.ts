import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, BadRequestException, ForbiddenException, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { TeamService } from './team.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

const TEAM_UPLOAD_DIR = join(__dirname, '..', '..', 'uploads', 'teams');

const teamStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(TEAM_UPLOAD_DIR)) mkdirSync(TEAM_UPLOAD_DIR, { recursive: true });
    cb(null, TEAM_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

@Controller('api/teams')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(
    private teamService: TeamService,
    private userService: UserService,
  ) {}

  @Post()
  async create(@Request() req, @Body() body: any) {
    return this.teamService.create(req.user.id, body);
  }

  @Get()
  async list(@Request() req) {
    return this.teamService.findByUser(req.user.id);
  }

  @Get('all')
  async all() {
    return this.teamService.findAll();
  }

  @Get('showcase')
  async showcase() {
    return this.teamService.findFeatured();
  }

  @Get('export')
  async export(@Request() req) {
    const isAdmin = await this.userService.isAdmin(req.user.id);
    if (!isAdmin) throw new ForbiddenException('仅管理员可导出');
    return this.teamService.findAllWithMembers();
  }

  @Get('captain/my')
  async myCaptainTeams(@Request() req) {
    return this.teamService.findByCaptain(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.teamService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.teamService.update(id, req.user.id, body);
  }

  @Get(':id/members')
  async members(@Param('id') id: string) {
    return this.teamService.getMembers(id);
  }

  @Post(':id/invite')
  async invite(@Param('id') id: string, @Request() req) {
    const code = await this.teamService.generateInviteCode(id, req.user.id);
    return { code };
  }

  @Post('join')
  async join(@Request() req, @Body() body: { code: string }) {
    return this.teamService.joinByInvite(body.code, req.user.id);
  }

  @Post(':id/join')
  async joinById(@Param('id') id: string, @Request() req) {
    return this.teamService.joinById(id, req.user.id);
  }

  @Post(':id/members/:memberId/review')
  async reviewMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req, @Body() body: { action: 'approve' | 'reject' }) {
    return this.teamService.reviewMember(id, req.user.id, memberId, body.action);
  }

  @Delete(':id/members/:memberId')
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    await this.teamService.removeMember(id, req.user.id, memberId);
    return { message: '移除成功' };
  }

  @Post(':id/leave')
  async leaveTeam(@Param('id') id: string, @Request() req) {
    await this.teamService.leaveTeam(id, req.user.id);
    return { message: '已退出战队' };
  }

  @Delete(':id/disband')
  async disbandTeam(@Param('id') id: string, @Request() req) {
    await this.teamService.disbandTeam(id, req.user.id);
    return { message: '战队已解散' };
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('images', 9, { storage: teamStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
      return cb(new BadRequestException('仅支持 jpg/png/gif/webp 格式'), false);
    }
    cb(null, true);
  }}))
  async uploadPhotos(@Request() req, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) throw new BadRequestException('请选择图片');
    const urls = files.map(f => `/uploads/teams/${f.filename}`);
    return { urls };
  }
}
