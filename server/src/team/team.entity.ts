import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ nullable: true, length: 20 })
  tag: string;

  @Column({ nullable: true })
  logo: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'captain_id' })
  captain: User;

  @Column({ name: 'captain_id' })
  captain_id: string;

  @Column({ default: 0, name: 'member_count' })
  member_count: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'simple-json', nullable: true, name: 'photos' })
  photos: string[];

  @Column({ nullable: true, name: 'achievement' })
  achievement: string;

  @Column({ default: false, name: 'is_featured' })
  is_featured: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'team_id' })
  team_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({ default: 'member' })
  role: string;

  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'joined_at' })
  joined_at: Date;
}
