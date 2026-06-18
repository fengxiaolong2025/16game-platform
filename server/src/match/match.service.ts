import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './match.entity';
import { Bracket } from '../bracket/bracket.entity';
import { Tournament } from '../tournament/tournament.entity';
import { NotificationService } from '../notification/notification.service';
import { RankingService } from '../ranking/ranking.service';
import { BracketEngine } from '../bracket/bracket-engine.service';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private matchRepo: Repository<Match>,
    @InjectRepository(Bracket)
    private bracketRepo: Repository<Bracket>,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => RankingService))
    private rankingService: RankingService,
    @Inject(forwardRef(() => BracketEngine))
    private bracketEngine: BracketEngine,
  ) {}

  async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    const bracket = await this.bracketRepo.findOne({ where: { tournament_id: tournamentId } });
    if (!bracket) return [];

    return this.matchRepo.find({
      where: { bracket_id: bracket.id },
      order: { round: 'ASC', position: 'ASC' },
    });
  }

  async updateMatchStatus(tournamentId: string, matchId: string, userId: string, status: string): Promise<Match> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament || tournament.creator_id !== userId) throw new ForbiddenException('无权操作');

    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('比赛不存在');

    match.status = status;
    return this.matchRepo.save(match);
  }

  async submitResult(tournamentId: string, matchId: string, userId: string, result: { score_a: number; score_b: number; winner_id: string; notes?: string }): Promise<Match> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament || tournament.creator_id !== userId) throw new ForbiddenException('无权操作');

    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('比赛不存在');

    match.score_a = result.score_a;
    match.score_b = result.score_b;
    match.winner_id = result.winner_id;
    match.status = 'completed';
    match.completed_at = new Date();
    match.notes = result.notes;

    const saved = await this.matchRepo.save(match);

    // Auto-advance winner to next round
    await this.advanceWinner(match);

    // Recalculate rankings after every match result
    await this.recalculateRankings(tournamentId);

    return saved;
  }

  async scheduleMatch(tournamentId: string, matchId: string, userId: string, scheduledAt: Date): Promise<Match> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament || tournament.creator_id !== userId) throw new ForbiddenException('无权操作');

    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('比赛不存在');

    match.scheduled_at = scheduledAt;

    const saved = await this.matchRepo.save(match);
    return saved;
  }

  async deleteByBracket(bracketId: string): Promise<void> {
    await this.matchRepo.delete({ bracket_id: bracketId });
  }

  async syncFromBracket(bracketId: string, roundsData: any[]): Promise<void> {
    await this.matchRepo.delete({ bracket_id: bracketId });

    const matches: Partial<Match>[] = [];
    roundsData.forEach((round, roundIdx) => {
      round.matches?.forEach((slot: any) => {
        matches.push({
          bracket_id: bracketId,
          round: roundIdx + 1,
          position: slot.position,
          participant_a_id: slot.participant_a?.id,
          participant_a_name: slot.participant_a?.name,
          participant_b_id: slot.participant_b?.id,
          participant_b_name: slot.participant_b?.name,
          status: 'pending',
        });
      });
    });

    if (matches.length > 0) {
      await this.matchRepo.save(matches);
    }
  }

  /**
   * Recalculate rankings for a tournament based on match results
   */
  async recalculateRankings(tournamentId: string): Promise<void> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) return;

    const bracket = await this.bracketRepo.findOne({ where: { tournament_id: tournamentId } });
    if (!bracket) return;

    const matches = await this.matchRepo.find({
      where: { bracket_id: bracket.id },
    });

    const completedMatches = matches.filter(m => m.status === 'completed');
    if (completedMatches.length === 0) return;

    // Collect all participants from all matches (excluding "待定")
    const participantMap = new Map<string, string>();
    matches.forEach(m => {
      if (m.participant_a_id && m.participant_a_name && m.participant_a_name !== '待定') {
        participantMap.set(m.participant_a_id, m.participant_a_name);
      }
      if (m.participant_b_id && m.participant_b_name && m.participant_b_name !== '待定') {
        participantMap.set(m.participant_b_id, m.participant_b_name);
      }
    });

    if (tournament.format === 'round_robin') {
      // Round-robin ranking
      const participants = Array.from(participantMap.entries()).map(([id, name]) => ({ id, name }));
      const matchResults = completedMatches.map(m => ({
        participantAId: m.participant_a_id,
        participantBId: m.participant_b_id,
        scoreA: m.score_a,
        scoreB: m.score_b,
      }));
      const rankings = this.bracketEngine.calculateRoundRobinRankings(participants, matchResults);
      await this.rankingService.saveRankings(tournamentId, rankings);
    } else {
      // Elimination ranking with win/loss stats
      const totalRounds = bracket.rounds_data?.length || 1;

      // Calculate wins, losses, scoreFor, scoreAgainst for each participant
      const stats = new Map<string, { wins: number; losses: number; scoreFor: number; scoreAgainst: number }>();
      participantMap.forEach((_, id) => {
        stats.set(id, { wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 });
      });

      completedMatches.forEach(m => {
        if (m.participant_a_id && m.participant_b_id) {
          const a = stats.get(m.participant_a_id);
          const b = stats.get(m.participant_b_id);
          if (a && b) {
            a.scoreFor += m.score_a || 0;
            a.scoreAgainst += m.score_b || 0;
            b.scoreFor += m.score_b || 0;
            b.scoreAgainst += m.score_a || 0;
            if (m.winner_id === m.participant_a_id) { a.wins++; b.losses++; }
            else if (m.winner_id === m.participant_b_id) { b.wins++; a.losses++; }
          }
        }
      });

      // Scoring config from tournament (default: win=3, draw=1, loss=0)
      const scoring = tournament.config?.scoring || { win: 3, draw: 1, loss: 0 };

      // Build ranking list with real stats
      const rankings: { participantId: string; participantName: string; rank: number; score: number; wins: number; losses: number; draws: number; scoreFor: number; scoreAgainst: number }[] = [];
      const processed = new Set<string>();

      // Find champion
      const finalMatch = matches.find(m => m.round === totalRounds && m.position === 0);
      const championId = finalMatch?.winner_id || null;

      // Champion
      if (championId && participantMap.has(championId)) {
        const s = stats.get(championId)!;
        rankings.push({
          participantId: championId,
          participantName: participantMap.get(championId)!,
          rank: 1,
          score: s.wins * scoring.win + s.losses * scoring.loss,
          wins: s.wins, losses: s.losses, draws: 0,
          scoreFor: s.scoreFor, scoreAgainst: s.scoreAgainst,
        });
        processed.add(championId);
      }

      // Finalist
      if (finalMatch) {
        const finalistId = finalMatch.participant_a_id === championId
          ? finalMatch.participant_b_id
          : finalMatch.participant_a_id;
        if (finalistId && participantMap.has(finalistId) && !processed.has(finalistId)) {
          const s = stats.get(finalistId)!;
          rankings.push({
            participantId: finalistId,
            participantName: participantMap.get(finalistId)!,
            rank: 2,
            score: s.wins * scoring.win + s.losses * scoring.loss,
            wins: s.wins, losses: s.losses, draws: 0,
            scoreFor: s.scoreFor, scoreAgainst: s.scoreAgainst,
          });
          processed.add(finalistId);
        }
      }

      // Semi-finalists (lost in semi)
      const semiRound = totalRounds - 1;
      if (semiRound > 0) {
        bracket.rounds_data[semiRound - 1]?.matches?.forEach((slot: any) => {
          const match = matches.find(m => m.round === semiRound && m.position === slot.position);
          if (match?.status === 'completed' && match.winner_id) {
            const loserId = match.participant_a_id === match.winner_id
              ? match.participant_b_id
              : match.participant_a_id;
            if (loserId && participantMap.has(loserId) && !processed.has(loserId)) {
              const s = stats.get(loserId)!;
              rankings.push({
                participantId: loserId,
                participantName: participantMap.get(loserId)!,
                rank: 3, // shared 3rd
                score: s.wins * scoring.win + s.losses * scoring.loss,
                wins: s.wins, losses: s.losses, draws: 0,
                scoreFor: s.scoreFor, scoreAgainst: s.scoreAgainst,
              });
              processed.add(loserId);
            }
          }
        });
      }

      // Remaining: ordered by elimination round (later = better), then by wins
      const remaining = Array.from(participantMap.entries())
        .filter(([id]) => !processed.has(id))
        .sort((a, b) => {
          const roundA = [...bracket.rounds_data].reverse().findIndex((round: any) =>
            round.matches?.some((slot: any) => {
              const m = matches.find(mm => mm.round === bracket.rounds_data.indexOf(round) + 1 && mm.position === slot.position);
              return m?.status === 'completed' && m.winner_id && (m.participant_a_id === a[0] || m.participant_b_id === a[0]) && m.winner_id !== a[0];
            })
          );
          const roundB = [...bracket.rounds_data].reverse().findIndex((round: any) =>
            round.matches?.some((slot: any) => {
              const m = matches.find(mm => mm.round === bracket.rounds_data.indexOf(round) + 1 && mm.position === slot.position);
              return m?.status === 'completed' && m.winner_id && (m.participant_a_id === b[0] || m.participant_b_id === b[0]) && m.winner_id !== b[0];
            })
          );
          const sa = stats.get(a[0])!;
          const sb = stats.get(b[0])!;
          if (sb.wins !== sa.wins) return sb.wins - sa.wins;
          return roundB - roundA;
        });

      remaining.forEach(([id]) => {
        const s = stats.get(id)!;
        rankings.push({
          participantId: id,
          participantName: participantMap.get(id)!,
          rank: 0, // assigned below
          score: s.wins * scoring.win + s.losses * scoring.loss,
          wins: s.wins, losses: s.losses, draws: 0,
          scoreFor: s.scoreFor, scoreAgainst: s.scoreAgainst,
        });
        processed.add(id);
      });

      // Assign proper sequential ranks
      rankings.forEach((r, i) => { r.rank = i + 1; });

      await this.rankingService.saveRankings(tournamentId, rankings);
    }
  }

  private async advanceWinner(match: Match): Promise<void> {
    if (!match.winner_id) return;

    const bracket = await this.bracketRepo.findOne({ where: { id: match.bracket_id } });
    if (!bracket) return;

    const currentRound = bracket.rounds_data[match.round - 1];
    const currentSlot = currentRound?.matches?.find((m: any) => m.position === match.position);

    if (currentSlot?.winner_to) {
      const nextMatch = await this.matchRepo.findOne({
        where: { bracket_id: bracket.id, round: currentSlot.winner_to.round + 1, position: currentSlot.winner_to.match },
      });

      if (nextMatch) {
        const position = currentSlot.winner_to.position;
        const winnerName = match.participant_a_id === match.winner_id ? match.participant_a_name : match.participant_b_name;
        if (position === 'a') {
          nextMatch.participant_a_id = match.winner_id;
          nextMatch.participant_a_name = winnerName;
        } else {
          nextMatch.participant_b_id = match.winner_id;
          nextMatch.participant_b_name = winnerName;
        }
        await this.matchRepo.save(nextMatch);
      }
    }
  }
}
