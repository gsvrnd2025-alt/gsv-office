import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/create-user.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private auditService: AuditService,
  ) {}

  async findAll(query: {
    page?: number; limit?: number; search?: string;
    status?: string; departmentId?: string; roleId?: string;
  }) {
    const { page = 1, limit = 20, search, status, departmentId, roleId } = query;
    const skip = (page - 1) * limit;

    const qb = this.usersRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.department', 'department')
      .where('user.deletedAt IS NULL');

    if (search) {
      qb.andWhere(
        '(user.full_name ILIKE :search OR user.email ILIKE :search OR user.login_id ILIKE :search OR user.employee_id ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (status) qb.andWhere('user.status = :status', { status });
    if (departmentId) qb.andWhere('user.department_id = :departmentId', { departmentId });
    if (roleId) qb.andWhere('user.role_id = :roleId', { roleId });

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: data.map(this.sanitize),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['role', 'department'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, createdBy?: string): Promise<User> {
    // Check for duplicates
    const existing = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { loginId: dto.loginId }],
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email already in use' : 'Login ID already in use',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const employeeId = await this.generateEmployeeId();

    const user = this.usersRepo.create({
      ...dto,
      passwordHash,
      employeeId,
      createdBy,
    } as any) as any as User;

    const saved = await this.usersRepo.save(user);
    await this.auditService.log({
      userId: createdBy,
      action: 'create',
      resourceType: 'user',
      resourceId: saved.id,
      description: `Created user ${saved.loginId}`,
    });

    return saved;
  }

  async update(id: string, dto: UpdateUserDto, updatedBy?: string): Promise<User> {
    const user = await this.findById(id);
    const old = { ...user };

    Object.assign(user, dto);
    const saved = await this.usersRepo.save(user);

    await this.auditService.log({
      userId: updatedBy,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      oldData: old,
      newData: dto,
    });

    return this.sanitize(saved) as any;
  }

  async updateStatus(id: string, status: string, roleId?: string, permissions?: string[], updatedBy?: string): Promise<void> {
    const user = await this.findById(id);
    
    const updatePayload: any = { status: status as any };
    if (roleId) {
      updatePayload.roleId = roleId;
    }
    
    await this.usersRepo.update(id, updatePayload);

    if (permissions) {
      // Clear existing overrides
      await this.usersRepo.query(`DELETE FROM user_permissions WHERE user_id = $1`, [id]);
      
      // Insert new overrides
      for (const permId of permissions) {
        await this.usersRepo.query(
          `INSERT INTO user_permissions (user_id, permission_id, granted) VALUES ($1, $2, true)
           ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true`,
          [id, permId]
        );
      }
    }

    await this.auditService.log({
      userId: updatedBy,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      description: `Status changed from ${user.status} to ${status} (Role: ${roleId || 'none'})`,
    });
  }

  async resetPassword(id: string, newPassword: string, updatedBy?: string): Promise<void> {
    await this.findById(id);
    const hash = await bcrypt.hash(newPassword, 12);
    await this.usersRepo.update(id, {
      passwordHash: hash,
      forcePasswordChange: true,
    });
    await this.auditService.log({
      userId: updatedBy,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      description: 'Password reset by admin',
    });
  }

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.findById(id);
    await this.usersRepo.softDelete(id);
    await this.auditService.log({
      userId: deletedBy,
      action: 'delete',
      resourceType: 'user',
      resourceId: id,
    });
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<void> {
    await this.usersRepo.update(id, { avatarUrl });
  }

  async setOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await this.usersRepo.update(id, {
      isOnline,
      lastSeen: isOnline ? undefined : new Date(),
    });
  }

  private async generateEmployeeId(): Promise<string> {
    const count = await this.usersRepo.count({ withDeleted: true });
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }

  sanitize(user: User): Partial<User> {
    const { passwordHash, twoFactorSecret, ...safe } = user as any;
    return safe;
  }
}
