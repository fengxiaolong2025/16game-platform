import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Bracket } from '../bracket/bracket.entity';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Bracket)
  @JoinColumn({ name: 'bracket_id' })
  bracket: Bracket;

  @Column({ name: 'bracket_id' })
  bracket_id: string;

  @Column()
  round: number;

  @Column()
  position: number;

  @Column({ nullable: true, name: 'participant_a_id' })
  participant_a_id: string;

  @Column({ nullable: true, name: 'participant_a_name' })
  participant_a_name: string;

  @Column({ nullable: true, name: 'participant_b_id' })
  participant_b_id: string;

  @Column({ nullable: true, name: 'participant_b_name' })
  participant_b_name: string;

  @Column({ nullable: true, name: 'score_a' })
  score_a: number;

  @Column({ nullable: true, name: 'score_b' })
  score_b: number;

  @Column({ nullable: true, name: 'winner_id' })
  winner_id: string;

  @Column({ default: 'pending' })
  status: string; // pending | live | completed | cancelled

  @Column({ nullable: true, name: 'scheduled_at' })
  scheduled_at: Date;

  @Column({ nullable: true, name: 'completed_at' })
  completed_at: Date;

  @Column({ default: 1, name: 'best_of' })
  best_of: number; // 1=BO1, 3=BO3, 5=BO5

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
