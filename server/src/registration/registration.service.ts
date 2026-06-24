import { Injectable, NotFoundException, ForbiddenException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from './registration.entity';
import { Tournament } from '../tournament/tournament.entity';
import { NotificationService } from '../notification/notification.service';
import { TeamService } from '../team/team.service';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(Registration)
    private regRepo: Repository<Registration>,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => TeamService))
    private teamService: TeamService,
  ) {}

  async register(tournamentId: string, userId: string, data: { type?: string; team_id?: string; custom_fields?: Record<string, string> }): Promise<Registration> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('赛事不存在');
    if (tournament.status !== 'registration') throw new ForbiddenException('当前不在报名阶段');

    const isTeam = tournament.participant_type === 'team';

    if (isTeam) {
      return this.registerTeam(tournament, userId, data);
    } else {
      return this.registerIndividual(tournament, userId, data);
    }
  }

  /**
   * Individual registration
   */
  private async registerIndividual(tournament: Tournament, userId: string, data: { custom_fields?: Record<string, string> }): Promise<Registration> {
    // Check duplicate by user
    const existing = await this.regRepo.findOne({
      where: { tournament_id: tournament.id, user_id: userId },
    });
    if (existing) throw new ConflictException('您已报名该赛事');

    // Check capacity
    const count = await this.regRepo.count({ where: { tournament_id: tournament.id, status: 'approved' } });
    if (count >= tournament.max_participants) throw new ForbiddenException('名额已满');

    const registration = this.regRepo.create({
      tournament_id: tournament.id,
      user_id: userId,
      type: 'individual',
      custom_fields: data.custom_fields || {},
      status: 'submitted',
    });

    return this.regRepo.save(registration);
  }

  /**
   * Team registration — captain registers the team
   */
  private async registerTeam(tournament: Tournament, captainId: string, data: { team_id?: string; custom_fields?: Record<string, string> }): Promise<Registration> {
    if (!data.team_id) throw new ForbiddenException('团队赛报名请选择战队');

    // Verify the team exists and user is the captain
    const team = await this.teamService.findByIdSilent(data.team_id);
    if (!team) throw new NotFoundException('战队不存在');
    if (team.captain_id !== captainId) throw new ForbiddenException('仅队长可报名团队赛');

    // Check team size
    const requiredSize = tournament.team_size || 1;
    const members = await this.teamService.getApprovedMembers(data.team_id);
    if (members.length < requiredSize) {
      throw new ForbiddenException(`战队人数不足，至少需要 ${requiredSize} 人，当前 ${members.length} 人`);
    }

    // Check duplicate by team_id
    const existing = await this.regRepo.findOne({
      where: { tournament_id: tournament.id, team_id: data.team_id },
    });
    if (existing) throw new ConflictException('该战队已报名此赛事');

    // Check capacity by team count
    const teamCount = await this.regRepo
      .createQueryBuilder('r')
      .where('r.tournament_id = :tid', { tid: tournament.id })
      .andWhere('r.status IN (:...statuses)', { statuses: ['submitted', 'approved', 'checked_in'] })
      .andWhere('r.team_id IS NOT NULL')
      .getCount();
    if (teamCount >= tournament.max_participants) throw new ForbiddenException('名额已满');

    // Create registration record for captain (representing the team)
    const registration = this.regRepo.create({
      tournament_id: tournament.id,
      user_id: captainId,
      type: 'team',
      team_id: data.team_id,
      custom_fields: {
        ...data.custom_fields,
        team_name: team.name,
        team_tag: team.tag || '',
        member_count: String(members.length),
      },
      status: 'submitted',
    });

    return this.regRepo.save(registration);
  }

  async getRegistrations(tournamentId: string, userId: string): Promise<Registration[]> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('赛事不存在');
    if (tournament.creator_id !== userId) throw new ForbiddenException('无权查看');

    return this.regRepo.find({
      where: { tournament_id: tournamentId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get team registrations with member details for tournament organizer
   */
  async getTeamRegistrations(tournamentId: string, userId: string): Promise<any[]> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('赛事不存在');
    if (tournament.creator_id !== userId) throw new ForbiddenException('无权查看');

    const registrations = await this.regRepo.find({
      where: { tournament_id: tournamentId, type: 'team' },
      order: { created_at: 'DESC' },
    });

    // Enrich with team member details
    const result = [];
    for (const reg of registrations) {
      let members: any[] = [];
      if (reg.team_id) {
        const teamMembers = await this.teamService.getApprovedMembers(reg.team_id);
        members = teamMembers.map(m => ({
          user_id: m.user_id,
          nickname: (m as any).user?.nickname || '',
          game_ids: (m as any).user?.game_ids || '',
          role: m.role,
        }));
      }
      result.push({
        ...reg,
        team_name: reg.custom_fields?.team_name || '',
        team_tag: reg.custom_fields?.team_tag || '',
        member_count: members.length,
        members,
      });
    }

    return result;
  }

  async review(tournamentId: string, userId: string, registrationId: string, action: 'approve' | 'reject', comment?: string): Promise<Registration> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament || tournament.creator_id !== userId) throw new ForbiddenException('无权操作');

    const registration = await this.regRepo.findOne({ where: { id: registrationId } });
    if (!registration) throw new NotFoundException('报名记录不存在');

    registration.status = action === 'approve' ? 'approved' : 'rejected';
    registration.review_comment = comment;
    await this.regRepo.save(registration);

    // Notify
    await this.notificationService.send(
      registration.user_id,
      'registration_review',
      action === 'approve' ? '报名已通过' : '报名未通过',
      `您在赛事"${tournament.title}"的报名${action === 'approve' ? '已通过审核' : '未通过审核'}`,
    );

    return registration;
  }

  async checkin(tournamentId: string, userId: string): Promise<Registration> {
    const registration = await this.regRepo.findOne({
      where: { tournament_id: tournamentId, user_id: userId, status: 'approved' },
    });
    if (!registration) throw new NotFoundException('未找到已通过的报名记录');

    registration.status = 'checked_in';
    registration.checked_in_at = new Date();
    return this.regRepo.save(registration);
  }

  async getMyRegistration(tournamentId: string, userId: string): Promise<Registration | null> {
    return this.regRepo.findOne({ where: { tournament_id: tournamentId, user_id: userId } });
  }

  async batchReview(tournamentId: string, userId: string, ids: string[], action: 'approve' | 'reject'): Promise<void> {
    for (const id of ids) {
      await this.review(tournamentId, userId, id, action);
    }
  }
}
