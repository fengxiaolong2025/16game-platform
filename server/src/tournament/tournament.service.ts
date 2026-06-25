import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './tournament.entity';
import { MatchService } from '../match/match.service';
import { Registration } from '../registration/registration.entity';
import { Bracket } from '../bracket/bracket.entity';
import { Match } from '../match/match.entity';
import { Ranking } from '../ranking/ranking.entity';

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    @Inject(forwardRef(() => MatchService))
    private matchService: MatchService,
    @InjectRepository(Registration)
    private regRepo: Repository<Registration>,
    @InjectRepository(Bracket)
    private bracketRepo: Repository<Bracket>,
    @InjectRepository(Match)
    private matchRepo: Repository<Match>,
    @InjectRepository(Ranking)
    private rankingRepo: Repository<Ranking>,
  ) {}

  async create(userId: string, data: Partial<Tournament>): Promise<Tournament> {
    // Validate required fields
    if (!data.title || !data.title.trim()) {
      throw new ForbiddenException('赛事名称不能为空');
    }
    if (!data.game) {
      throw new ForbiddenException('请选择游戏项目');
    }
    if (!data.format) {
      throw new ForbiddenException('请选择赛制');
    }
    if (!data.max_participants || data.max_participants < 2) {
      throw new ForbiddenException('参赛数量至少为 2');
    }

    const tournament = this.tournamentRepo.create({
      ...data,
      creator_id: userId,
      status: data.status || 'draft',
    });
    return this.tournamentRepo.save(tournament);
  }

  async findAll(filters: { status?: string; game?: string; page?: number; limit?: number }): Promise<{ items: Tournament[]; total: number }> {
    const { status, game, page = 1, limit = 12 } = filters;
    const qb = this.tournamentRepo.createQueryBuilder('t')
      .where('t.is_public = :isPublic', { isPublic: true });

    if (status) qb.andWhere('t.status = :status', { status });
    if (game) qb.andWhere('t.game = :game', { game });

    qb.orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findMyTournaments(userId: string, type: 'created' | 'participated'): Promise<Tournament[]> {
    if (type === 'created') {
      return this.tournamentRepo.find({
        where: { creator_id: userId },
        order: { created_at: 'DESC' },
      });
    }
    return this.tournamentRepo
      .createQueryBuilder('t')
      .innerJoin('registrations', 'r', 'r.tournament_id = t.id')
      .where('r.user_id = :userId', { userId })
      .orderBy('t.created_at', 'DESC')
      .getMany();
  }

  async findById(id: string): Promise<Tournament> {
    const tournament = await this.tournamentRepo.findOne({ where: { id } });
    if (!tournament) throw new NotFoundException('赛事不存在');
    return tournament;
  }

  async update(id: string, userId: string, data: Partial<Tournament>): Promise<Tournament> {
    const tournament = await this.findById(id);
    if (tournament.creator_id !== userId) throw new ForbiddenException('无权修改此赛事');

    Object.assign(tournament, data);
    return this.tournamentRepo.save(tournament);
  }

  async publish(id: string, userId: string): Promise<Tournament> {
    const tournament = await this.findById(id);
    if (tournament.creator_id !== userId) throw new ForbiddenException('无权操作');
    if (tournament.status !== 'draft') throw new ForbiddenException('仅草稿状态可发布');

    if (!tournament.title || !tournament.game || !tournament.format) {
      throw new ForbiddenException('请完善赛事信息后再发布');
    }

    tournament.status = 'registration';
    return this.tournamentRepo.save(tournament);
  }

  async delete(id: string, userId: string): Promise<void> {
    const tournament = await this.findById(id);
    if (tournament.creator_id !== userId) throw new ForbiddenException('无权删除');

    // Delete all related data first to avoid FK constraint errors
    // 1. Delete rankings
    await this.rankingRepo.delete({ tournament_id: id });
    // 2. Delete matches (need bracket_id first)
    const brackets = await this.bracketRepo.find({ where: { tournament_id: id } });
    for (const b of brackets) {
      await this.matchRepo.delete({ bracket_id: b.id });
    }
    // 3. Delete brackets
    await this.bracketRepo.delete({ tournament_id: id });
    // 4. Delete registrations
    await this.regRepo.delete({ tournament_id: id });
    // 5. Delete tournament
    await this.tournamentRepo.remove(tournament);
  }

  async advanceStatus(id: string, userId: string, newStatus: string): Promise<Tournament> {
    const tournament = await this.findById(id);
    if (tournament.creator_id !== userId) throw new ForbiddenException('无权操作');

    // 允许所有状态互相切换（包括回退）
    const validStatuses = ['draft', 'registration', 'bracket', 'in_progress', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      throw new ForbiddenException(`无效的状态: ${newStatus}`);
    }

    tournament.status = newStatus;
    const saved = await this.tournamentRepo.save(tournament);

    // When completing tournament, trigger final ranking calculation
    if (newStatus === 'completed') {
      try {
        await this.matchService.recalculateRankings(id);
      } catch (e) {
        // Don't fail the status change if ranking calc has issues
        console.error('Ranking calculation failed:', e);
      }
    }

    return saved;
  }
}
