import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './match.entity';
import { Bracket } from '../bracket/bracket.entity';
import { Tournament } from '../tournament/tournament.entity';
import { MatchService } from './match.service';
import { MatchController } from './match.controller';
import { NotificationModule } from '../notification/notification.module';
import { RankingModule } from '../ranking/ranking.module';
import { BracketModule } from '../bracket/bracket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Bracket, Tournament]),
    NotificationModule,
    forwardRef(() => RankingModule),
    forwardRef(() => BracketModule),
  ],
  providers: [MatchService],
  controllers: [MatchController],
  exports: [MatchService],
})
export class MatchModule {}
