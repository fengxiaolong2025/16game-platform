import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bracket } from './bracket.entity';
import { BracketEngine } from './bracket-engine.service';
import { Tournament } from '../tournament/tournament.entity';
import { Registration } from '../registration/registration.entity';
import { MatchService } from '../match/match.service';

@Injectable()
export class BracketService {
  constructor(
    @InjectRepository(Bracket)
    private bracketRepo: Repository<Bracket>,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
    private engine: BracketEngine,
    @Inject(forwardRef(() => MatchService))
    private matchService: MatchService,
  ) {}

  async generateBracket(tournamentId: string, userId: string, mode: 'auto' | 'manual', manualData?: any): Promise<Bracket> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('赛事不存在');
    if (tournament.creator_id !== userId) throw new ForbiddenException('无权操作');

    // Get approved registrations
    const registrations = await this.registrationRepo.find({
      where: { tournament_id: tournamentId, status: 'approved' },
    });

    if (registrations.length < 2) {
      throw new ForbiddenException('已通过报名不足 2 人/队，无法生成对阵');
    }

    // Build participants — use team name for team tournaments, player name for individual
    const isTeam = tournament.participant_type === 'team';
    const participants = registrations.map((r, i) => ({
      id: r.id,
      name: isTeam
        ? (r.custom_fields?.team_name || `战队_${r.team_id?.slice(0, 8) || r.user_id.slice(0, 8)}`)
        : (r.custom_fields?.player_name || `选手_${r.user_id.slice(0, 8)}`),
      seed: i < 4 ? i + 1 : undefined,
    }));

    let roundsData;
    if (tournament.format === 'single_elimination') {
      roundsData = this.engine.generateSingleElimination(participants);
    } else if (tournament.format === 'double_elimination') {
      const { winnersBracket, losersBracket } = this.engine.generateDoubleElimination(participants);
      roundsData = [...winnersBracket, ...losersBracket];
    } else if (tournament.format === 'round_robin') {
      roundsData = this.engine.generateRoundRobin(participants, false);
    } else {
      throw new ForbiddenException('不支持的赛制');
    }

    // Delete existing bracket and matches
    const existingBracket = await this.bracketRepo.findOne({ where: { tournament_id: tournamentId } });
    if (existingBracket) {
      await this.matchService.deleteByBracket(existingBracket.id);
      await this.bracketRepo.remove(existingBracket);
    }

    const bracket = this.bracketRepo.create({
      tournament_id: tournamentId,
      type: tournament.format,
      rounds_data: roundsData,
      status: 'draft',
    });

    const saved = await this.bracketRepo.save(bracket);

    // Sync matches from bracket data
    await this.matchService.syncFromBracket(saved.id, roundsData);

    return saved;
  }

  async getBracket(tournamentId: string): Promise<Bracket | null> {
    return this.bracketRepo.findOne({ where: { tournament_id: tournamentId } });
  }

  async publishBracket(tournamentId: string, userId: string): Promise<Bracket> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (tournament?.creator_id !== userId) throw new ForbiddenException('无权操作');

    const bracket = await this.bracketRepo.findOne({ where: { tournament_id: tournamentId } });
    if (!bracket) throw new NotFoundException('对阵表不存在');

    bracket.status = 'published';
    return this.bracketRepo.save(bracket);
  }

  async updateBracket(tournamentId: string, userId: string, roundsData: any): Promise<Bracket> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (tournament?.creator_id !== userId) throw new ForbiddenException('无权操作');

    const bracket = await this.bracketRepo.findOne({ where: { tournament_id: tournamentId } });
    if (!bracket) throw new NotFoundException('对阵表不存在');
    if (bracket.status === 'published') throw new ForbiddenException('已发布的对阵不可修改');

    bracket.rounds_data = roundsData;
    const saved = await this.bracketRepo.save(bracket);

    // Re-sync matches
    await this.matchService.deleteByBracket(bracket.id);
    await this.matchService.syncFromBracket(bracket.id, roundsData);

    return saved;
  }
}
