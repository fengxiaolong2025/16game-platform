import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './user.entity';
import { UserService } from './user.service';
import { WechatAuthService } from './wechat-auth.service';
import { UserController } from './user.controller';
import { JwtStrategy } from './jwt.strategy';
import { Tournament } from '../tournament/tournament.entity';
import { Registration } from '../registration/registration.entity';
import { Team } from '../team/team.entity';
import { TeamMember } from '../team/team.entity';
import { Notification } from '../notification/notification.entity';
import { Match } from '../match/match.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tournament, Registration, Team, TeamMember, Notification, Match]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'esports-platform-secret-key-change-in-production'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  providers: [UserService, WechatAuthService, JwtStrategy],
  controllers: [UserController],
  exports: [UserService, WechatAuthService],
})
export class UserModule {}
