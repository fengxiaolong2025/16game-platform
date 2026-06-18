import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { JwtAuthGuard } from '../user/jwt-auth.guard';

@Controller('api/tournaments')
export class TournamentController {
  constructor(private tournamentService: TournamentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() body: any) {
    return this.tournamentService.create(req.user.id, body);
  }

  @Get()
  async findAll(@Query() query: { status?: string; game?: string; page?: number; limit?: number }) {
    return this.tournamentService.findAll(query);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMy(@Request() req, @Query('type') type: 'created' | 'participated' = 'created') {
    return this.tournamentService.findMyTournaments(req.user.id, type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tournamentService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.tournamentService.update(id, req.user.id, body);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Param('id') id: string, @Request() req) {
    return this.tournamentService.publish(id, req.user.id);
  }

  @Post(':id/advance')
  @UseGuards(JwtAuthGuard)
  async advanceStatus(@Param('id') id: string, @Request() req, @Body('status') status: string) {
    return this.tournamentService.advanceStatus(id, req.user.id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req) {
    await this.tournamentService.delete(id, req.user.id);
    return { message: '删除成功' };
  }
}
