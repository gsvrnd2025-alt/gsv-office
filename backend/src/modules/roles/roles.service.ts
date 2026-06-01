import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Role } from './role.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private rolesRepo: Repository<Role>,
    private dataSource: DataSource,
    private auditService: AuditService,
  ) {}

  async findAll() {
    return this.rolesRepo.find({ where: { deletedAt: null }, order: { level: 'DESC' } });
  }

  async findById(id: string) {
    const role = await this.rolesRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: any, createdBy?: string) {
    const existing = await this.rolesRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Role name already exists');
    const role = this.rolesRepo.create(dto) as any as Role;
    const saved = await this.rolesRepo.save(role);
    await this.auditService.log({ userId: createdBy, action: 'create', resourceType: 'role', resourceId: saved.id, description: `Created role ${saved.name}` });
    return saved;
  }

  async update(id: string, dto: any, updatedBy?: string) {
    const role = await this.findById(id);
    if (role.isSystem) throw new ConflictException('Cannot modify system roles');
    Object.assign(role, dto);
    const saved = await this.rolesRepo.save(role);
    await this.auditService.log({ userId: updatedBy, action: 'update', resourceType: 'role', resourceId: id });
    return saved;
  }

  async delete(id: string, deletedBy?: string) {
    const role = await this.findById(id);
    if (role.isSystem) throw new ConflictException('Cannot delete system roles');
    await this.rolesRepo.softDelete(id);
    await this.auditService.log({ userId: deletedBy, action: 'delete', resourceType: 'role', resourceId: id });
  }

  async assignPermissions(roleId: string, permissionIds: string[], adminId?: string) {
    await this.dataSource.query(
      `DELETE FROM role_permissions WHERE role_id = $1`, [roleId]
    );
    if (permissionIds.length > 0) {
      const values = permissionIds.map(pid => `('${roleId}', '${pid}', true)`).join(',');
      await this.dataSource.query(
        `INSERT INTO role_permissions (role_id, permission_id, granted) VALUES ${values} ON CONFLICT DO NOTHING`
      );
    }
    await this.auditService.log({ userId: adminId, action: 'permission_change', resourceType: 'role', resourceId: roleId, description: `Updated permissions for role` });
  }

  async getPermissions(roleId: string) {
    return this.dataSource.query(
      `SELECT p.*, rp.granted FROM permissions p
       LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = $1
       ORDER BY p.module, p.action`,
      [roleId]
    );
  }
}
