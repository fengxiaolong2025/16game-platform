import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './tournament.entity';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { MatchModule } from '../match/match.module';
import { Registration } from '../registration/registration.entity';
import { Bracket } from '../bracket/bracket.entity';
import { Match } from '../match/match.entity';
import { Ranking } from '../ranking/ranking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournament, Registration, Bracket, Match, Ranking]),
    forwardRef(() => MatchModule),
  ],
  providers: [TournamentService],
  controllers: [TournamentController],
  exports: [TournamentService],
})
export class TournamentModule {}
