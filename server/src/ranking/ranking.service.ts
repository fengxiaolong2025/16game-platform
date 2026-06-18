import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ranking } from './ranking.entity';

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Ranking)
    private rankingRepo: Repository<Ranking>,
  ) {}

  async getByTournament(tournamentId: string): Promise<Ranking[]> {
    return this.rankingRepo.find({
      where: { tournament_id: tournamentId },
      order: { rank: 'ASC' },
    });
  }

  async saveRankings(tournamentId: string, rankings: { participantId: string; participantName: string; rank: number; score?: number; wins?: number; losses?: number; draws?: number; scoreFor?: number; scoreAgainst?: number }[]): Promise<void> {
    await this.rankingRepo.delete({ tournament_id: tournamentId });

    const entities = rankings.map(r => this.rankingRepo.create({
      tournament_id: tournamentId,
      participant_id: r.participantId,
      participant_name: r.participantName,
      rank: r.rank,
      score: r.score || 0,
      wins: r.wins || 0,
      losses: r.losses || 0,
      draws: r.draws || 0,
      score_for: r.scoreFor || 0,
      score_against: r.scoreAgainst || 0,
    }));

    await this.rankingRepo.save(entities);
  }
}
