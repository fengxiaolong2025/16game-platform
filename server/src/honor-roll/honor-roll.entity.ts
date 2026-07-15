import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Tournament } from '../tournament/tournament.entity';

@Entity('honor_rolls')
export class HonorRoll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'tournament_name', nullable: true })
  tournament_name: string;

  @Column({ name: 'game', nullable: true })
  game: string;

  @Column({ name: 'award_type' })
  award_type: string; // champion, runner_up, third_place, mvp, best_team

  @Column({ name: 'winner_name' })
  winner_name: string;

  @Column({ nullable: true, name: 'winner_avatar' })
  winner_avatar: string;

  @Column({ nullable: true, name: 'team_name' })
  team_name: string;

  @Column({ nullable: true, name: 'award_date' })
  award_date: string;

  @Column({ nullable: true, name: 'photo' })
  photo: string;

  @Column({ default: 0 })
  sort_order: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
