import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { TournamentModule } from './tournament/tournament.module';
import { RegistrationModule } from './registration/registration.module';
import { BracketModule } from './bracket/bracket.module';
import { MatchModule } from './match/match.module';
import { TeamModule } from './team/team.module';
import { NotificationModule } from './notification/notification.module';
import { RankingModule } from './ranking/ranking.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): any => {
        return {
          type: 'better-sqlite3',
          database: join(__dirname, '..', 'data', 'esports.db'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
          logging: false,
          // Disable foreign key enforcement for SQLite dev mode
          // (TypeORM synchronize creates FK constraints but we want flexibility)
          prepareDatabase: (db: any) => {
            db.pragma('foreign_keys = OFF');
          },
        };
      },
    }),
    UserModule,
    TournamentModule,
    RegistrationModule,
    BracketModule,
    MatchModule,
    TeamModule,
    NotificationModule,
    RankingModule,
  ],
})
export class AppModule {}
