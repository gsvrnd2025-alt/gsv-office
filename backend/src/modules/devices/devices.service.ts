import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Device } from './device.entity';

@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device) private devicesRepo: Repository<Device>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('Initializing RMM Devices schema check...');
      
      // 1. Run DDL query to ensure the devices table is created (self-healing migration)
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS devices (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) UNIQUE NOT NULL,
          ip_address VARCHAR(45),
          mac_address VARCHAR(17),
          os_version VARCHAR(100) DEFAULT 'Windows 10 Pro',
          status VARCHAR(20) DEFAULT 'offline',
          cpu_model VARCHAR(255),
          cpu_usage FLOAT DEFAULT 0,
          ram_total BIGINT DEFAULT 0,
          ram_usage FLOAT DEFAULT 0,
          disk_total BIGINT DEFAULT 0,
          disk_usage FLOAT DEFAULT 0,
          gpu_model VARCHAR(255),
          gpu_usage FLOAT DEFAULT 0,
          antivirus VARCHAR(255),
          windows_update VARCHAR(255),
          device_group VARCHAR(100) DEFAULT 'Workstations',
          tags TEXT[] DEFAULT '{}',
          paired_at TIMESTAMPTZ DEFAULT NOW(),
          last_seen TIMESTAMPTZ,
          metadata JSONB DEFAULT '{}'
        );
      `);

      this.logger.log('Devices table verified in database.');

      // 2. Seed mock devices if no devices exist
      const count = await this.devicesRepo.count();
      if (count === 0) {
        this.logger.log('Seeding default RMM endpoints into database...');
        const mockDevices: Partial<Device>[] = [
          {
            name: 'GSV-SERVER-01',
            ipAddress: '192.168.0.180',
            macAddress: '00:15:5D:01:23:45',
            osVersion: 'Windows Server 2022 Datacenter',
            status: 'online',
            cpuModel: 'Intel Xeon Gold 6248R @ 3.00GHz (16 Cores)',
            cpuUsage: 14.5,
            ramTotal: 68719476736, // 64 GB
            ramUsage: 42.1,
            diskTotal: 1099511627776, // 1 TB
            diskUsage: 35.8,
            gpuModel: 'NVIDIA Tesla T4 (16GB)',
            gpuUsage: 5.0,
            antivirus: 'Windows Defender Antivirus',
            windowsUpdate: 'Up to Date',
            group: 'Servers',
            tags: ['Production', 'Primary', 'DomainController'],
            lastSeen: new Date(),
            metadata: {
              services: [
                { name: 'Active Directory Domain Services', state: 'running', startup: 'Automatic' },
                { name: 'DNS Server', state: 'running', startup: 'Automatic' },
                { name: 'DHCP Server', state: 'running', startup: 'Automatic' },
                { name: 'GSV RMM Agent Service', state: 'running', startup: 'Automatic' }
              ],
              processes: [
                { pid: 104, name: 'System', cpu: 0.1, ram: 0.1 },
                { pid: 488, name: 'lsass.exe', cpu: 1.2, ram: 2.5 },
                { pid: 1024, name: 'dns.exe', cpu: 0.5, ram: 1.8 },
                { pid: 2048, name: 'gsv-rmm-agent.exe', cpu: 1.1, ram: 0.9 }
              ],
              ups: { status: 'AC Online', charge: 100, runtime: '64 min' }
            }
          },
          {
            name: 'FINANCE-PC-10',
            ipAddress: '192.168.0.231',
            macAddress: 'F8:E4:3B:56:C2:23',
            osVersion: 'Windows 11 Enterprise',
            status: 'online',
            cpuModel: 'AMD Ryzen 7 5800X 8-Core Processor',
            cpuUsage: 28.2,
            ramTotal: 17179869184, // 16 GB
            ramUsage: 58.4,
            diskTotal: 512110190592, // 512 GB
            diskUsage: 72.1,
            gpuModel: 'NVIDIA GeForce RTX 3060 (12GB)',
            gpuUsage: 12.0,
            antivirus: 'Windows Defender Antivirus',
            windowsUpdate: 'Pending Updates (KB5034123)',
            group: 'Workstations',
            tags: ['Finance', 'Secure', 'Sales'],
            lastSeen: new Date(),
            metadata: {
              services: [
                { name: 'Print Spooler', state: 'running', startup: 'Automatic' },
                { name: 'Windows Update', state: 'stopped', startup: 'Manual' },
                { name: 'GSV RMM Agent Service', state: 'running', startup: 'Automatic' }
              ],
              processes: [
                { pid: 4, name: 'System', cpu: 0.2, ram: 0.1 },
                { pid: 1402, name: 'chrome.exe', cpu: 8.4, ram: 15.2 },
                { pid: 3104, name: 'excel.exe', cpu: 4.5, ram: 8.8 },
                { pid: 4096, name: 'gsv-rmm-agent.exe', cpu: 0.8, ram: 0.7 }
              ],
              ups: { status: 'Battery Charging', charge: 92, runtime: '18 min' }
            }
          },
          {
            name: 'HR-DESKTOP-05',
            ipAddress: '192.168.0.125',
            macAddress: '24:4B:FE:89:C4:0A',
            osVersion: 'Windows 10 Pro',
            status: 'offline',
            cpuModel: 'Intel Core i5-10400 @ 2.90GHz',
            cpuUsage: 0,
            ramTotal: 8589934592, // 8 GB
            ramUsage: 0,
            diskTotal: 256060190592, // 256 GB
            diskUsage: 54.2,
            gpuModel: 'Intel UHD Graphics 630',
            gpuUsage: 0,
            antivirus: 'McAfee LiveSafe (Expired)',
            windowsUpdate: 'Needs Restart',
            group: 'Workstations',
            tags: ['HR', 'General'],
            lastSeen: new Date(Date.now() - 3 * 3600000), // 3 hours ago
            metadata: {}
          },
          {
            name: 'GSV-VIRTUAL-02',
            ipAddress: '192.168.0.199',
            macAddress: '00:50:56:C0:00:08',
            osVersion: 'Ubuntu 22.04 LTS (Kernel 5.15)',
            status: 'online',
            cpuModel: 'QEMU Virtual CPU (4 Cores)',
            cpuUsage: 8.1,
            ramTotal: 8589934592, // 8 GB
            ramUsage: 22.8,
            diskTotal: 107374182400, // 100 GB
            diskUsage: 18.5,
            gpuModel: 'None (headless)',
            gpuUsage: 0,
            antivirus: 'ClamAV (active)',
            windowsUpdate: 'Security Updates Configured',
            group: 'Virtual Machines',
            tags: ['Testing', 'Linux', 'Docker-Host'],
            lastSeen: new Date(),
            metadata: {
              services: [
                { name: 'ssh', state: 'running', startup: 'enabled' },
                { name: 'docker', state: 'running', startup: 'enabled' },
                { name: 'nginx', state: 'stopped', startup: 'disabled' }
              ],
              processes: [
                { pid: 1, name: 'systemd', cpu: 0.1, ram: 0.5 },
                { pid: 840, name: 'dockerd', cpu: 1.5, ram: 4.8 },
                { pid: 980, name: 'containerd', cpu: 0.8, ram: 3.2 }
              ]
            }
          }
        ];

        for (const dev of mockDevices) {
          await this.devicesRepo.save(this.devicesRepo.create(dev));
        }
        this.logger.log('Mock RMM endpoints successfully seeded.');
      }
    } catch (e) {
      this.logger.error('Failed to initialize Devices Schema / seed data:', e);
    }
  }

  async findAll(): Promise<Device[]> {
    return this.devicesRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Device> {
    const dev = await this.devicesRepo.findOne({ where: { id } });
    if (!dev) throw new NotFoundException(`Device ${id} not found`);
    return dev;
  }

  async findByName(name: string): Promise<Device> {
    const dev = await this.devicesRepo.findOne({ where: { name } });
    if (!dev) throw new NotFoundException(`Device named ${name} not found`);
    return dev;
  }

  async create(data: Partial<Device>): Promise<Device> {
    const dev = this.devicesRepo.create({
      ...data,
      pairedAt: new Date(),
      lastSeen: new Date()
    });
    return this.devicesRepo.save(dev);
  }

  async update(id: string, data: Partial<Device>): Promise<Device> {
    const dev = await this.findById(id);
    Object.assign(dev, data);
    dev.lastSeen = new Date();
    return this.devicesRepo.save(dev);
  }

  async delete(id: string): Promise<void> {
    const dev = await this.findById(id);
    await this.devicesRepo.remove(dev);
  }

  async updateMetrics(id: string, metrics: {
    cpuUsage: number;
    ramUsage: number;
    gpuUsage?: number;
    diskUsage?: number;
    status?: 'online' | 'offline';
    metadata?: Record<string, any>;
  }): Promise<Device> {
    const dev = await this.findById(id);
    dev.cpuUsage = metrics.cpuUsage;
    dev.ramUsage = metrics.ramUsage;
    if (metrics.gpuUsage !== undefined) dev.gpuUsage = metrics.gpuUsage;
    if (metrics.diskUsage !== undefined) dev.diskUsage = metrics.diskUsage;
    if (metrics.status) dev.status = metrics.status;
    if (metrics.metadata) {
      dev.metadata = {
        ...(dev.metadata || {}),
        ...metrics.metadata
      };
    }
    dev.lastSeen = new Date();
    return this.devicesRepo.save(dev);
  }
}
