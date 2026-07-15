import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HonorRoll } from './honor-roll.entity';

@Injectable()
export class HonorRollService {
  constructor(
    @InjectRepository(HonorRoll)
    private honorRollRepo: Repository<HonorRoll>,
  ) {}

  async create(data: Partial<HonorRoll>): Promise<HonorRoll> {
    const honor = this.honorRollRepo.create(data);
    return this.honorRollRepo.save(honor);
  }

  async findAllPublic(): Promise<HonorRoll[]> {
    return this.honorRollRepo.find({
      order: { award_date: 'DESC', sort_order: 'ASC', created_at: 'DESC' },
      take: 100,
    });
  }

  async findAll(): Promise<HonorRoll[]> {
    return this.honorRollRepo.find({
      order: { sort_order: 'ASC', created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<HonorRoll> {
    const honor = await this.honorRollRepo.findOne({ where: { id } });
    if (!honor) throw new NotFoundException('记录不存在');
    return honor;
  }

  async update(id: string, data: Partial<HonorRoll>): Promise<HonorRoll> {
    const honor = await this.findOne(id);
    Object.assign(honor, data);
    return this.honorRollRepo.save(honor);
  }

  async delete(id: string): Promise<void> {
    const honor = await this.findOne(id);
    await this.honorRollRepo.remove(honor);
  }
}
