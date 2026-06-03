import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // Hostname

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'mac_address', nullable: true })
  macAddress: string;

  @Column({ name: 'os_version', default: 'Windows 10 Pro' })
  osVersion: string;

  @Column({ default: 'offline' })
  status: 'online' | 'offline'; // online, offline

  @Column({ name: 'cpu_model', nullable: true })
  cpuModel: string;

  @Column({ name: 'cpu_usage', type: 'float', default: 0 })
  cpuUsage: number;

  @Column({ name: 'ram_total', type: 'bigint', default: 0 })
  ramTotal: number;

  @Column({ name: 'ram_usage', type: 'float', default: 0 })
  ramUsage: number;

  @Column({ name: 'disk_total', type: 'bigint', default: 0 })
  diskTotal: number;

  @Column({ name: 'disk_usage', type: 'float', default: 0 })
  diskUsage: number;

  @Column({ name: 'gpu_model', nullable: true })
  gpuModel: string;

  @Column({ name: 'gpu_usage', type: 'float', default: 0 })
  gpuUsage: number;

  @Column({ nullable: true })
  antivirus: string;

  @Column({ name: 'windows_update', nullable: true })
  windowsUpdate: string;

  @Column({ name: 'device_group', default: 'Workstations' })
  group: string; // Workstations, Servers, Virtual Machines

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column({ name: 'paired_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  pairedAt: Date;

  @Column({ name: 'last_seen', type: 'timestamptz', nullable: true })
  lastSeen: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
