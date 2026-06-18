import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tournament } from '../tournament/tournament.entity';

@Entity('rankings')
export class Ranking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id' })
  tournament_id: string;

  @Column({ name: 'participant_id' })
  participant_id: string;

  @Column({ name: 'participant_name' })
  participant_name: string;

  @Column({ default: 0 })
  rank: number;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ default: 0 })
  draws: number;

  @Column({ default: 0, name: 'score_for' })
  score_for: number;

  @Column({ default: 0, name: 'score_against' })
  score_against: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
