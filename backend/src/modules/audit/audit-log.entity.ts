import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'download' | 'upload' | 'permission_change';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'enum', enum: ['create', 'update', 'delete', 'login', 'logout', 'view', 'download', 'upload', 'permission_change'] })
  action: AuditAction;

  @Column({ name: 'resource_type', nullable: true })
  resourceType: string;

  @Column({ name: 'resource_id', nullable: true, type: 'uuid' })
  resourceId: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'old_data', nullable: true, type: 'jsonb' })
  oldData: Record<string, any>;

  @Column({ name: 'new_data', nullable: true, type: 'jsonb' })
  newData: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true, type: 'inet' })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
