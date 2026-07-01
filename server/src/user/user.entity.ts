import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: true })
  password_hash: string;

  @Column({ nullable: true, name: 'wechat_union_id' })
  wechat_union_id: string;

  @Column({ length: 50 })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column('simple-array', { nullable: true, name: 'games' })
  games: string[];

  @Column({ nullable: true, name: 'game_ids' })
  game_ids: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 0 })
  role: number; // 0=user, 1=admin

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ nullable: true, name: 'last_login_at' })
  last_login_at: Date;
}
