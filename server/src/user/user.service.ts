import { Injectable, UnauthorizedException, ConflictException, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';
import { Tournament } from '../tournament/tournament.entity';
import { Registration } from '../registration/registration.entity';
import { Team, TeamMember } from '../team/team.entity';
import { Notification } from '../notification/notification.entity';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    @InjectRepository(Registration)
    private regRepo: Repository<Registration>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  async onModuleInit() {
    // Auto-create admin account if not exists
    const admin = await this.userRepo.findOne({ where: { username: 'admin' } });
    if (!admin) {
      const password_hash = await bcrypt.hash('fxl@2025', 10);
      const adminUser = this.userRepo.create({
        username: 'admin',
        password_hash,
        nickname: '管理员',
        role: 1,
      });
      await this.userRepo.save(adminUser);
      console.log('✅ Admin account created: admin / fxl@2025');
    }
  }

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

  async registerByUsername(username: string, password: string, nickname?: string): Promise<{ user: User; token: string }> {
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('该用户名已存在');
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      username,
      password_hash,
      nickname: nickname || username,
    });
    await this.userRepo.save(user);
    const token = this.generateToken(user);
    return { user, token };
  }

  async loginByUsername(username: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
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
    return this.jwtService.sign({ sub: user.id, phone: user.phone, email: user.email, role: user.role });
  }

  // === Admin methods ===

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user?.role === 1;
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepo.find({ order: { created_at: 'DESC' }, take: 500 });
  }

  async deleteUser(userId: string, adminId: string): Promise<void> {
    if (userId === adminId) throw new ForbiddenException('不能删除自己');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 1) throw new ForbiddenException('不能删除管理员账号');

    // Cascade delete all related data
    // 1. Delete notifications
    await this.notifRepo.delete({ user_id: userId });
    // 2. Delete team memberships
    await this.memberRepo.delete({ user_id: userId });
    // 3. Delete teams where user is captain (and their members)
    const captainTeams = await this.teamRepo.find({ where: { captain_id: userId } });
    for (const team of captainTeams) {
      await this.memberRepo.delete({ team_id: team.id });
      await this.teamRepo.remove(team);
    }
    // 4. Delete registrations
    await this.regRepo.delete({ user_id: userId });
    // 5. Delete tournaments created by user
    await this.tournamentRepo.delete({ creator_id: userId });
    // 6. Delete user
    await this.userRepo.remove(user);
  }

  async resetUserPassword(userId: string, newPassword: string, adminId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 1 && userId !== adminId) throw new ForbiddenException('不能修改其他管理员的密码');
    const password_hash = await bcrypt.hash(newPassword, 10);
    user.password_hash = password_hash;
    await this.userRepo.save(user);
  }

  async updateUserStatus(userId: string, status: string, adminId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 1) throw new ForbiddenException('不能修改管理员状态');
    user.status = status;
    await this.userRepo.save(user);
  }
}
