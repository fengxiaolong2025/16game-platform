import { Injectable, UnauthorizedException, ConflictException, NotFoundException, ForbiddenException, BadRequestException, OnModuleInit } from '@nestjs/common';
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
import { Match } from '../match/match.entity';

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
    @InjectRepository(Match)
    private matchRepo: Repository<Match>,
  ) {}

  async onModuleInit() {
    // Auto-create admin account if not exists, and ensure role is correct
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
    } else if (admin.role !== 1) {
      // Fix admin role if it was incorrectly migrated
      admin.role = 1;
      await this.userRepo.save(admin);
      console.log('✅ Admin role corrected to 1');
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

  /**
   * 绑定已有网页端账号：验证账号密码后，将微信 unionId 写入该用户
   */
  async bindWechatAccount(
    account: string,
    password: string,
    unionId: string,
    nickname?: string,
    avatar?: string,
  ): Promise<{ user: User; token: string }> {
    // 支持用户名 / 邮箱 / 手机号登录
    const user = await this.userRepo.findOne({
      where: [
        { username: account },
        { email: account },
        { phone: account },
      ],
    });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    // 检查该账号是否已绑定其他微信
    if (user.wechat_union_id && user.wechat_union_id !== unionId) {
      throw new ConflictException('该账号已绑定其他微信，请先在小程序「我的-编辑资料」或网页端「个人中心」解绑，或联系管理员协助解绑');
    }
    // 绑定微信
    user.wechat_union_id = unionId;
    // 如果用户头像/昵称是默认值，用微信信息补充
    if (avatar && !user.avatar) user.avatar = avatar;
    if (nickname && (user.nickname.startsWith('玩家') || user.nickname.startsWith('微信用户'))) {
      user.nickname = nickname;
    }
    user.last_login_at = new Date();
    await this.userRepo.save(user);
    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * 跳过绑定，直接用微信信息创建新用户
   */
  async createWechatUser(unionId: string, nickname: string, avatar: string): Promise<{ user: User; token: string }> {
    // 防止重复创建
    const existing = await this.userRepo.findOne({ where: { wechat_union_id: unionId } });
    if (existing) {
      const token = this.generateToken(existing);
      return { user: existing, token };
    }
    const user = this.userRepo.create({
      wechat_union_id: unionId,
      nickname: nickname || `微信用户_${uuidv4().slice(0, 6)}`,
      avatar: avatar || '',
    });
    await this.userRepo.save(user);
    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * 用户自助解绑微信
   * 安全检查：用户必须有其他登录方式（用户名/邮箱/手机号 + 密码），否则解绑后无法登录
   */
  async unbindWechat(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.wechat_union_id) {
      throw new BadRequestException('当前账号未绑定微信');
    }
    // 安全检查：解绑后用户必须有其他登录方式
    const hasOtherLogin = (user.username || user.email || user.phone) && user.password_hash;
    if (!hasOtherLogin) {
      throw new BadRequestException('解绑后无法登录，请先绑定用户名/邮箱/手机号并设置密码');
    }
    user.wechat_union_id = null;
    await this.userRepo.save(user);
  }

  /**
   * 管理员协助解绑微信（可强制解绑，即使没有其他登录方式）
   */
  async adminUnbindWechat(targetUserId: string, adminId: string): Promise<void> {
    if (targetUserId === adminId) {
      throw new ForbiddenException('不能对自己操作');
    }
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 1) {
      throw new ForbiddenException('不能对超级管理员执行此操作');
    }
    // 二级管理员只能被超级管理员操作
    if (user.role === 2) {
      const admin = await this.userRepo.findOne({ where: { id: adminId } });
      if (!admin || admin.role !== 1) {
        throw new ForbiddenException('仅超级管理员可对二级管理员操作');
      }
    }
    if (!user.wechat_union_id) {
      throw new BadRequestException('该用户未绑定微信');
    }
    user.wechat_union_id = null;
    await this.userRepo.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async updateProfile(id: string, data: { nickname?: string; avatar?: string; games?: string[]; game_ids?: string; bio?: string; position?: string; phone?: string; email?: string; ladder_score?: number; player_photos?: string[] }): Promise<User> {
    // 只允许更新这些字段，防止越权修改 role 等
    const allowed: any = {};
    const fields = ['nickname', 'avatar', 'games', 'game_ids', 'bio', 'position', 'phone', 'email', 'ladder_score', 'player_photos'];
    for (const f of fields) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }
    if (Object.keys(allowed).length === 0) {
      throw new BadRequestException('没有可更新的字段');
    }
    // 手机号/邮箱唯一性校验
    if (allowed.phone) {
      const existing = await this.userRepo.findOne({ where: { phone: allowed.phone } });
      if (existing && existing.id !== id) {
        throw new ConflictException('该手机号已被其他用户使用');
      }
    }
    if (allowed.email) {
      const existing = await this.userRepo.findOne({ where: { email: allowed.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('该邮箱已被其他用户使用');
      }
    }
    await this.userRepo.update(id, allowed);
    const updated = await this.userRepo.findOne({ where: { id } });
    if (updated) {
      const { password_hash, ...profile } = updated;
      return profile as any;
    }
    throw new NotFoundException('用户不存在');
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({ sub: user.id, phone: user.phone, email: user.email, role: user.role });
  }

  // === Admin methods ===

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return (user?.role ?? 0) >= 1; // role=1 超级管理员, role=2 二级管理员
  }

  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user?.role === 1;
  }

  /**
   * 设置用户角色（仅超级管理员可操作）
   * role: 0=普通用户, 1=超级管理员, 2=二级管理员
   */
  async updateUserRole(targetUserId: string, role: number, adminId: string): Promise<void> {
    if (targetUserId === adminId) {
      throw new ForbiddenException('不能修改自己的角色');
    }
    // 仅超级管理员可操作
    const admin = await this.userRepo.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== 1) {
      throw new ForbiddenException('仅超级管理员可设置用户角色');
    }
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('用户不存在');
    // 不能修改超级管理员的角色
    if (user.role === 1) {
      throw new ForbiddenException('不能修改超级管理员的角色');
    }
    // role 只能设为 0 或 2（不能通过此接口设为超级管理员）
    if (role !== 0 && role !== 2) {
      throw new BadRequestException('角色值无效，仅支持设为普通用户(0)或二级管理员(2)');
    }
    user.role = role;
    await this.userRepo.save(user);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepo.find({ order: { created_at: 'DESC' }, take: 500 });
  }

  async deleteUser(userId: string, adminId: string): Promise<void> {
    if (userId === adminId) throw new ForbiddenException('不能删除自己');
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 1) throw new ForbiddenException('不能删除超级管理员账号');
    // 二级管理员只能被超级管理员删除
    if (user.role === 2) {
      const admin = await this.userRepo.findOne({ where: { id: adminId } });
      if (!admin || admin.role !== 1) {
        throw new ForbiddenException('仅超级管理员可删除二级管理员');
      }
    }

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
    if (!userId || userId === 'NaN' || userId === 'undefined') {
      throw new BadRequestException('无效的用户ID');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 1 && userId !== adminId) throw new ForbiddenException('不能修改超级管理员的密码');
    // 二级管理员的密码只能由超级管理员修改
    if (user.role === 2 && userId !== adminId) {
      const admin = await this.userRepo.findOne({ where: { id: adminId } });
      if (!admin || admin.role !== 1) {
        throw new ForbiddenException('仅超级管理员可修改二级管理员的密码');
      }
    }
    const password_hash = await bcrypt.hash(newPassword, 10);
    user.password_hash = password_hash;
    await this.userRepo.save(user);
  }

  async updateUserStatus(userId: string, status: string, adminId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 1) throw new ForbiddenException('不能修改超级管理员状态');
    // 二级管理员的状态只能由超级管理员修改
    if (user.role === 2) {
      const admin = await this.userRepo.findOne({ where: { id: adminId } });
      if (!admin || admin.role !== 1) {
        throw new ForbiddenException('仅超级管理员可修改二级管理员状态');
      }
    }
    user.status = status;
    await this.userRepo.save(user);
  }

  async findFeaturedPlayers(): Promise<User[]> {
    return this.userRepo.find({
      where: { status: 'active' },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  /**
   * 获取用户参赛统计：参赛场次、胜场、负场
   * 同时考虑个人赛（participant_id = userId）和战队赛（participant_id = teamId）
   */
  async getMatchStats(userId: string): Promise<{ total: number; wins: number; losses: number }> {
    // 1. 获取用户所属的所有战队ID
    const teamMembers = await this.memberRepo
      .createQueryBuilder('tm')
      .where('tm.user_id = :userId', { userId })
      .andWhere('tm.status = :status', { status: 'approved' })
      .select('tm.team_id')
      .getRawMany();
    const teamIds = teamMembers.map((m: any) => m.team_id);

    // 2. 构建参赛者ID列表（userId + teamIds）
    const participantIds = [userId, ...teamIds];

    // 3. 查询所有已完成的比赛，用户（或其战队）参与的比赛
    const matches = await this.matchRepo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: 'completed' })
      .andWhere(
        '(m.participant_a_id IN (:...ids) OR m.participant_b_id IN (:...ids))',
        { ids: participantIds },
      )
      .getMany();

    let wins = 0;
    let losses = 0;

    for (const m of matches) {
      const isParticipantA = m.participant_a_id && participantIds.includes(m.participant_a_id);
      const myId = isParticipantA ? m.participant_a_id : m.participant_b_id;
      if (m.winner_id && m.winner_id === myId) {
        wins++;
      } else {
        losses++;
      }
    }

    return { total: matches.length, wins, losses };
  }
}
