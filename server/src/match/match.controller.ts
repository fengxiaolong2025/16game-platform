import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MatchService } from './match.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@Controller('api/tournaments/:tournamentId/matches')
export class MatchController {
  constructor(private matchService: MatchService) {}

  @Get()
  async list(@Param('tournamentId') tournamentId: string) {
    return this.matchService.getMatchesByTournament(tournamentId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(@Param('tournamentId') tournamentId: string, @Param('id') id: string, @Request() req, @Body() body: { status: string }) {
    return this.matchService.updateMatchStatus(tournamentId, id, req.user.id, body.status);
  }

  @Post(':id/result')
  @UseGuards(JwtAuthGuard)
  async submitResult(@Param('tournamentId') tournamentId: string, @Param('id') id: string, @Request() req, @Body() body: { score_a: number; score_b: number; winner_id: string; notes?: string }) {
    return this.matchService.submitResult(tournamentId, id, req.user.id, body);
  }

  @Put(':id/schedule')
  @UseGuards(JwtAuthGuard)
  async schedule(@Param('tournamentId') tournamentId: string, @Param('id') id: string, @Request() req, @Body() body: { scheduled_at: string }) {
    return this.matchService.scheduleMatch(tournamentId, id, req.user.id, new Date(body.scheduled_at));
  }
}
