import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team, TeamMember } from './team.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
  ) {}

  async create(userId: string, data: { name: string; tag?: string; logo?: string; description?: string }): Promise<Team> {
    const team = this.teamRepo.create({
      ...data,
      captain_id: userId,
      member_count: 1,
    });
    const saved = await this.teamRepo.save(team);

    // Auto-add captain as member
    await this.memberRepo.save({
      team_id: saved.id,
      user_id: userId,
      role: 'captain',
      status: 'approved',
    });

    return saved;
  }

  async findByUser(userId: string): Promise<Team[]> {
    const memberships = await this.memberRepo.find({
      where: { user_id: userId, status: 'approved' },
      relations: { team: true },
    });
    return memberships.map(m => m.team);
  }

  async findById(id: string): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { id }, relations: { captain: true } });
    if (!team) throw new NotFoundException('战队不存在');
    return team;
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    return this.memberRepo.find({
      where: { team_id: teamId },
      relations: { user: true },
    });
  }

  async generateInviteCode(teamId: string, userId: string): Promise<string> {
    const team = await this.findById(teamId);
    if (team.captain_id !== userId) throw new ForbiddenException('仅队长可生成邀请码');
    return `${teamId}_${uuidv4().slice(0, 8)}`;
  }

  async joinByInvite(inviteCode: string, userId: string): Promise<TeamMember> {
    const teamId = inviteCode.split('_')[0];
    const team = await this.findById(teamId);

    // Check existing
    const existing = await this.memberRepo.findOne({ where: { team_id: teamId, user_id: userId } });
    if (existing) {
      if (existing.status === 'approved') throw new ForbiddenException('已是战队成员');
      if (existing.status === 'pending') throw new ForbiddenException('申请已提交，等待审核');
    }

    const member = this.memberRepo.create({
      team_id: teamId,
      user_id: userId,
      role: 'member',
      status: 'pending',
    });
    return this.memberRepo.save(member);
  }

  async joinById(teamId: string, userId: string): Promise<TeamMember> {
    const team = await this.findById(teamId);

    const existing = await this.memberRepo.findOne({ where: { team_id: teamId, user_id: userId } });
    if (existing) {
      if (existing.status === 'approved') throw new ForbiddenException('已是战队成员');
      if (existing.status === 'pending') throw new ForbiddenException('申请已提交，等待审核');
    }

    const member = this.memberRepo.create({
      team_id: teamId,
      user_id: userId,
      role: 'member',
      status: 'pending',
    });
    return this.memberRepo.save(member);
  }

  async reviewMember(teamId: string, captainId: string, memberId: string, action: 'approve' | 'reject'): Promise<TeamMember> {
    const team = await this.findById(teamId);
    if (team.captain_id !== captainId) throw new ForbiddenException('仅队长可审核');

    const member = await this.memberRepo.findOne({ where: { id: memberId, team_id: teamId } });
    if (!member) throw new NotFoundException('成员申请不存在');

    member.status = action === 'approve' ? 'approved' : 'rejected';
    const saved = await this.memberRepo.save(member);

    if (action === 'approve') {
      await this.teamRepo.update(teamId, { member_count: () => 'member_count + 1' });
    }

    return saved;
  }

  async removeMember(teamId: string, captainId: string, memberId: string): Promise<void> {
    const team = await this.findById(teamId);
    if (team.captain_id !== captainId) throw new ForbiddenException('仅队长可移除成员');

    const member = await this.memberRepo.findOne({ where: { id: memberId, team_id: teamId } });
    if (!member) throw new NotFoundException('成员不存在');
    if (member.user_id === captainId) throw new ForbiddenException('不能移除队长');

    await this.memberRepo.remove(member);
    await this.teamRepo.update(teamId, { member_count: () => 'MAX(member_count - 1, 0)' });
  }

  async update(teamId: string, userId: string, data: { name?: string; tag?: string; logo?: string; description?: string }): Promise<Team> {
    const team = await this.findById(teamId);
    if (team.captain_id !== userId) throw new ForbiddenException('仅队长可编辑');

    Object.assign(team, data);
    return this.teamRepo.save(team);
  }

  /**
   * Member leaves team on their own
   */
  async leaveTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.findById(teamId);
    if (team.captain_id === userId) throw new ForbiddenException('队长不能退出，请使用解散战队功能');

    const member = await this.memberRepo.findOne({ where: { team_id: teamId, user_id: userId, status: 'approved' } });
    if (!member) throw new NotFoundException('您不是该战队成员');

    await this.memberRepo.remove(member);
    await this.teamRepo.update(teamId, { member_count: () => 'MAX(member_count - 1, 0)' });
  }

  /**
   * Captain disbands the team (deletes team and all memberships)
   */
  async disbandTeam(teamId: string, captainId: string): Promise<void> {
    const team = await this.findById(teamId);
    if (team.captain_id !== captainId) throw new ForbiddenException('仅队长可解散战队');

    // Delete all members
    await this.memberRepo.delete({ team_id: teamId });
    // Delete team
    await this.teamRepo.remove(team);
  }

  async findByCaptain(captainId: string): Promise<Team[]> {
    return this.teamRepo.find({ where: { captain_id: captainId } });
  }

  async findAll(): Promise<Team[]> {
    return this.teamRepo.find({ order: { created_at: 'DESC' }, take: 100 });
  }

  async findByIdSilent(id: string): Promise<Team | null> {
    return this.teamRepo.findOne({ where: { id } });
  }

  async getApprovedMembers(teamId: string): Promise<TeamMember[]> {
    return this.memberRepo.find({
      where: { team_id: teamId, status: 'approved' },
      relations: { user: true },
    });
  }
}
