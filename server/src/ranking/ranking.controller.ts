import { Controller, Get, Param } from '@nestjs/common';
import { RankingService } from './ranking.service';

@Controller('api/tournaments/:tournamentId/rankings')
export class RankingController {
  constructor(private rankingService: RankingService) {}

  @Get()
  async get(@Param('tournamentId') tournamentId: string) {
    return this.rankingService.getByTournament(tournamentId);
  }
}
