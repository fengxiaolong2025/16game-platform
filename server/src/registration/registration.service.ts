import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from './registration.entity';
import { Tournament } from '../tournament/tournament.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(Registration)
    private regRepo: Repository<Registration>,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    private notificationService: NotificationService,
  ) {}

  async register(tournamentId: string, userId: string, data: { type?: string; team_id?: string; custom_fields?: Record<string, string> }): Promise<Registration> {
    const tournament = await this.tournamentRepo.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('赛事不存在');
    if (tournament.status !== 'registration') throw new ForbiddenException('当前不在报名阶段');

    // Check duplicate
    const existing = await this.regRepo.findOne({
      where: { tournament_id: tournamentId, user_id: userId },
    });
    if (existing) throw new ConflictException('您已报名该赛事');

    // Check capacity
    const count = await this.regRepo.count({ where: { tournament_id: tournamentId, status: 'approved' } });
    if (count >= tournament.max_participants) throw new ForbiddenException('名额已满');

    const registration = this.regRepo.create({
      tournament_id: tournamentId,
      user_id: userId,
      type: data.type || 'individual',
      team_id: data.team_id,
      custom_fields: data.custom_fields || {},
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
