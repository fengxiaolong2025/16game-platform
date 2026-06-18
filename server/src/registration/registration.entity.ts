import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tournament } from '../tournament/tournament.entity';
import { User } from '../user/user.entity';
import { Team } from '../team/team.entity';

@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournament_id' })
  tournament: Tournament;

  @Column({ name: 'tournament_id' })
  tournament_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ nullable: true, name: 'team_id' })
  team_id: string;

  @Column({ default: 'individual' })
  type: string; // individual | team

  @Column('simple-json', { nullable: true, name: 'custom_fields' })
  custom_fields: Record<string, string>;

  @Column({ default: 'submitted' })
  status: string; // submitted | reviewing | approved | rejected | checked_in | withdrawn

  @Column({ nullable: true, name: 'review_comment' })
  review_comment: string;

  @Column({ nullable: true, name: 'checked_in_at' })
  checked_in_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
