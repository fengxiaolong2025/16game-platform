import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@Controller('api/teams')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Post()
  async create(@Request() req, @Body() body: any) {
    return this.teamService.create(req.user.id, body);
  }

  @Get()
  async list(@Request() req) {
    return this.teamService.findByUser(req.user.id);
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

  @Post(':id/members/:memberId/review')
  async reviewMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req, @Body() body: { action: 'approve' | 'reject' }) {
    return this.teamService.reviewMember(id, req.user.id, memberId, body.action);
  }

  @Delete(':id/members/:memberId')
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req) {
    await this.teamService.removeMember(id, req.user.id, memberId);
    return { message: '移除成功' };
  }
}
