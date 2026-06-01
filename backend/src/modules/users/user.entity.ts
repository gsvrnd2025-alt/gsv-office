import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  DeleteDateColumn, ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../roles/role.entity';
import { Department } from '../departments/department.entity';

export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending';
export type UserGender = 'male' | 'female' | 'other' | 'not_specified';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employee_id', unique: true, nullable: true })
  employeeId: string;

  @Index()
  @Column({ name: 'login_id', unique: true })
  loginId: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'first_name', nullable: true })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'other', 'not_specified'], default: 'not_specified' })
  gender: UserGender;

  @Column({ name: 'date_of_birth', nullable: true, type: 'date' })
  dateOfBirth: string;

  @Column({ nullable: true, type: 'text' })
  address: string;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @ManyToOne(() => Department, { eager: false, nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ nullable: true })
  designation: string;

  @Column({ name: 'role_id', nullable: true })
  roleId: string;

  @ManyToOne(() => Role, { eager: false, nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'enum', enum: ['active', 'inactive', 'blocked', 'pending'], default: 'active' })
  status: UserStatus;

  @Column({ name: 'is_online', default: false })
  isOnline: boolean;

  @Column({ name: 'last_seen', nullable: true, type: 'timestamptz' })
  lastSeen: Date;

  @Column({ name: 'last_login', nullable: true, type: 'timestamptz' })
  lastLogin: Date;

  @Column({ name: 'login_count', default: 0 })
  loginCount: number;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @Exclude()
  @Column({ name: 'two_factor_secret', nullable: true })
  twoFactorSecret: string;

  @Column({ name: 'force_password_change', default: false })
  forcePasswordChange: boolean;

  @Column({ default: 'Asia/Kolkata' })
  timezone: string;

  @Column({ default: 'en' })
  language: string;

  @Column({ default: 'light' })
  theme: string;

  @Column({ name: 'notification_preferences', type: 'jsonb', default: {} })
  notificationPreferences: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date;
}
