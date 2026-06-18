import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@Controller('api/tournaments/:tournamentId/registrations')
export class RegistrationController {
  constructor(private registrationService: RegistrationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async register(@Param('tournamentId') tournamentId: string, @Request() req, @Body() body: any) {
    return this.registrationService.register(tournamentId, req.user.id, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Param('tournamentId') tournamentId: string, @Request() req) {
    return this.registrationService.getRegistrations(tournamentId, req.user.id);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async my(@Param('tournamentId') tournamentId: string, @Request() req) {
    return this.registrationService.getMyRegistration(tournamentId, req.user.id);
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard)
  async review(@Param('tournamentId') tournamentId: string, @Param('id') id: string, @Request() req, @Body() body: { action: 'approve' | 'reject'; comment?: string }) {
    return this.registrationService.review(tournamentId, req.user.id, id, body.action, body.comment);
  }

  @Post('batch-review')
  @UseGuards(JwtAuthGuard)
  async batchReview(@Param('tournamentId') tournamentId: string, @Request() req, @Body() body: { ids: string[]; action: 'approve' | 'reject' }) {
    await this.registrationService.batchReview(tournamentId, req.user.id, body.ids, body.action);
    return { message: '批量操作完成' };
  }

  @Post('checkin')
  @UseGuards(JwtAuthGuard)
  async checkin(@Param('tournamentId') tournamentId: string, @Request() req) {
    return this.registrationService.checkin(tournamentId, req.user.id);
  }
}
