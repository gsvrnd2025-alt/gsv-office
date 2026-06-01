import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private repo: Repository<Department>,
    private auditService: AuditService,
  ) {}

  findAll() { return this.repo.find({ where: { deletedAt: null, isActive: true }, relations: ['parent'], order: { name: 'ASC' } }); }
  async findById(id: string) {
    const d = await this.repo.findOne({ where: { id }, relations: ['parent'] });
    if (!d) throw new NotFoundException('Department not found');
    return d;
  }
  async create(dto: any, by?: string) {
    const d = this.repo.create(dto) as any as Department;
    const s = await this.repo.save(d);
    await this.auditService.log({ userId: by, action: 'create', resourceType: 'department', resourceId: s.id });
    return s;
  }
  async update(id: string, dto: any, by?: string) {
    const d = await this.findById(id);
    Object.assign(d, dto);
    const s = await this.repo.save(d);
    await this.auditService.log({ userId: by, action: 'update', resourceType: 'department', resourceId: id });
    return s;
  }
  async delete(id: string, by?: string) {
    await this.findById(id);
    await this.repo.softDelete(id);
    await this.auditService.log({ userId: by, action: 'delete', resourceType: 'department', resourceId: id });
  }
}
