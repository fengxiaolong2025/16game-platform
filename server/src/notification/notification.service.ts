import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  async send(userId: string, type: string, title: string, content: string, link?: string): Promise<Notification> {
    const notif = this.notifRepo.create({ user_id: userId, type, title, content, link });
    return this.notifRepo.save(notif);
  }

  async getByUser(userId: string, page: number = 1, limit: number = 20): Promise<{ items: Notification[]; total: number }> {
    const [items, total] = await this.notifRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifRepo.count({ where: { user_id: userId, is_read: false } });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id, user_id: userId }, { is_read: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notifRepo.update({ user_id: userId, is_read: false }, { is_read: true });
  }
}
