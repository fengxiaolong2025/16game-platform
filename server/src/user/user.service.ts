import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async registerByPhone(phone: string, nickname?: string): Promise<{ user: User; token: string }> {
    const existing = await this.userRepo.findOne({ where: { phone } });
    if (existing) {
      throw new ConflictException('该手机号已注册');
    }
    const user = this.userRepo.create({
      phone,
      nickname: nickname || `玩家_${phone.slice(-4)}`,
    });
    await this.userRepo.save(user);
    const token = this.generateToken(user);
    return { user, token };
  }

  async registerByEmail(email: string, password: string, nickname?: string): Promise<{ user: User; token: string }> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('该邮箱已注册');
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      email,
      password_hash,
      nickname: nickname || email.split('@')[0],
    });
    await this.userRepo.save(user);
    const token = this.generateToken(user);
    return { user, token };
  }

  async loginByEmail(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    await this.userRepo.update(user.id, { last_login_at: new Date() });
    const token = this.generateToken(user);
    return { user, token };
  }

  async loginByPhone(phone: string): Promise<{ user: User; token: string }> {
    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      // Auto register
      user = this.userRepo.create({
        phone,
        nickname: `玩家_${phone.slice(-4)}`,
      });
      await this.userRepo.save(user);
    }
    await this.userRepo.update(user.id, { last_login_at: new Date() });
    const token = this.generateToken(user);
    return { user, token };
  }

  async findByWechatUnionId(unionId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { wechat_union_id: unionId } });
  }

  async createOrUpdateByWechat(profile: { unionId: string; nickname: string; avatar: string }): Promise<{ user: User; token: string }> {
    let user = await this.userRepo.findOne({ where: { wechat_union_id: profile.unionId } });
    if (user) {
      user.nickname = profile.nickname || user.nickname;
      user.avatar = profile.avatar || user.avatar;
      user.last_login_at = new Date();
      await this.userRepo.save(user);
    } else {
      user = this.userRepo.create({
        wechat_union_id: profile.unionId,
        nickname: profile.nickname || `微信用户_${uuidv4().slice(0, 6)}`,
        avatar: profile.avatar,
      });
      await this.userRepo.save(user);
    }
    const token = this.generateToken(user);
    return { user, token };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async updateProfile(id: string, data: { nickname?: string; avatar?: string; games?: string[]; game_ids?: string }): Promise<User> {
    await this.userRepo.update(id, data);
    return this.userRepo.findOne({ where: { id } });
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({ sub: user.id, phone: user.phone, email: user.email });
  }
}
