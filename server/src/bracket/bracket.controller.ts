import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { BracketService } from './bracket.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@Controller('api/tournaments/:tournamentId/bracket')
export class BracketController {
  constructor(private bracketService: BracketService) {}

  @Get()
  async getBracket(@Param('tournamentId') tournamentId: string) {
    return this.bracketService.getBracket(tournamentId);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(@Param('tournamentId') tournamentId: string, @Request() req, @Body() body: { mode: 'auto' | 'manual'; data?: any }) {
    return this.bracketService.generateBracket(tournamentId, req.user.id, body.mode, body.data);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async update(@Param('tournamentId') tournamentId: string, @Request() req, @Body() body: { rounds_data: any }) {
    return this.bracketService.updateBracket(tournamentId, req.user.id, body.rounds_data);
  }

  @Post('publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Param('tournamentId') tournamentId: string, @Request() req) {
    return this.bracketService.publishBracket(tournamentId, req.user.id);
  }
}
