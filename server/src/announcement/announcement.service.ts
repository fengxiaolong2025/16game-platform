import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepo: Repository<Announcement>,
  ) {}

  async create(authorId: string, data: { title: string; content: string; images?: string[]; is_pinned?: boolean; status?: string }): Promise<Announcement> {
    const announcement = this.announcementRepo.create({
      title: data.title,
      content: data.content,
      images: data.images || [],
      author_id: authorId,
      is_pinned: data.is_pinned || false,
      status: data.status || 'published',
    });
    return this.announcementRepo.save(announcement);
  }

  async findAllPublic(page: number = 1, limit: number = 20): Promise<{ items: Announcement[]; total: number }> {
    const [items, total] = await this.announcementRepo.findAndCount({
      where: { status: 'published' },
      order: { is_pinned: 'DESC', created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { author: true },
    });
    return { items, total };
  }

  async findAll(page: number = 1, limit: number = 50): Promise<{ items: Announcement[]; total: number }> {
    const [items, total] = await this.announcementRepo.findAndCount({
      order: { is_pinned: 'DESC', created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { author: true },
    });
    return { items, total };
  }

  async findOne(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepo.findOne({
      where: { id },
      relations: { author: true },
    });
    if (!announcement) throw new NotFoundException('公告不存在');
    return announcement;
  }

  async update(id: string, adminId: string, data: Partial<{ title: string; content: string; images: string[]; is_pinned: boolean; status: string }>): Promise<Announcement> {
    const announcement = await this.announcementRepo.findOne({ where: { id } });
    if (!announcement) throw new NotFoundException('公告不存在');
    Object.assign(announcement, data);
    return this.announcementRepo.save(announcement);
  }

  async delete(id: string): Promise<void> {
    const announcement = await this.announcementRepo.findOne({ where: { id } });
    if (!announcement) throw new NotFoundException('公告不存在');
    await this.announcementRepo.remove(announcement);
  }
}
