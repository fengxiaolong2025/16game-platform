import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bracket } from './bracket.entity';
import { Tournament } from '../tournament/tournament.entity';
import { Registration } from '../registration/registration.entity';
import { BracketEngine } from './bracket-engine.service';
import { BracketService } from './bracket.service';
import { BracketController } from './bracket.controller';
import { MatchModule } from '../match/match.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bracket, Tournament, Registration]),
    forwardRef(() => MatchModule),
  ],
  providers: [BracketEngine, BracketService],
  controllers: [BracketController],
  exports: [BracketEngine, BracketService],
})
export class BracketModule {}
