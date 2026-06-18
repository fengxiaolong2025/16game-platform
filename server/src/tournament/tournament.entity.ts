import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'creator_id' })
  creator_id: string;

  @Column({ length: 100 })
  title: string;

  @Column()
  game: string;

  @Column()
  format: string; // single_elimination | double_elimination | round_robin

  @Column({ name: 'participant_type', default: 'individual' })
  participant_type: string; // individual | team

  @Column({ nullable: true, name: 'team_size' })
  team_size: number;

  @Column({ name: 'max_participants' })
  max_participants: number;

  @Column({ default: 'draft' })
  status: string; // draft | registration | bracket | in_progress | completed

  @Column('simple-json', { nullable: true })
  config: TournamentConfig;

  @Column({ nullable: true })
  rules: string;

  @Column({ nullable: true, name: 'cover_image' })
  cover_image: string;

  @Column({ default: true, name: 'is_public' })
  is_public: boolean;

  @Column({ nullable: true, name: 'organizer_name' })
  organizer_name: string;

  @Column({ nullable: true, name: 'registration_start_at' })
  registration_start_at: Date;

  @Column({ nullable: true, name: 'registration_end_at' })
  registration_end_at: Date;

  @Column({ nullable: true, name: 'start_at' })
  start_at: Date;

  @Column({ nullable: true, name: 'end_at' })
  end_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

export interface TournamentConfig {
  gameMode?: string;
  mapPool?: string[];
  banPickEnabled?: boolean;
  roundCount?: number; // BO1/BO3/BO5
  thirdPlaceMatch?: boolean;
  checkinRequired?: boolean;
  checkinWindowMinutes?: number;
  customFields?: CustomField[];
  scoring?: {
    win: number;
    draw: number;
    loss: number;
  };
}

export interface CustomField {
  name: string;
  type: 'text' | 'select';
  required: boolean;
  options?: string[];
}
