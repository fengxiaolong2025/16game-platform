import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tournament } from '../tournament/tournament.entity';

@Entity('brackets')
export class Bracket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id' })
  tournament_id: string;

  @Column()
  type: string; // single_elimination | double_elimination | round_robin

  @Column('simple-json', { name: 'rounds_data' })
  rounds_data: BracketRound[];

  @Column({ default: 'draft' })
  status: string; // draft | published

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

export interface BracketRound {
  name: string;
  matches: BracketMatchSlot[];
}

export interface BracketMatchSlot {
  id: string;
  position: number;
  participant_a?: BracketParticipant;
  participant_b?: BracketParticipant;
  winner_to?: { round: number; match: number; position: 'a' | 'b' };
  loser_to?: { round: number; match: number; position: 'a' | 'b' }; // for double elim
}

export interface BracketParticipant {
  id: string;
  name: string;
  seed?: number;
  is_bye?: boolean;
}
