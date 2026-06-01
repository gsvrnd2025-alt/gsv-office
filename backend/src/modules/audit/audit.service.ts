import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

export interface LogParams {
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: LogParams): Promise<void> {
    const log = this.auditRepo.create(params);
    await this.auditRepo.save(log).catch(() => {}); // Never fail main operation
  }

  async findAll(query: {
    userId?: string; resourceType?: string; action?: string;
    page?: number; limit?: number;
  }) {
    const { page = 1, limit = 50, userId, resourceType, action } = query;
    const qb = this.auditRepo.createQueryBuilder('log').orderBy('log.created_at', 'DESC');

    if (userId) qb.andWhere('log.user_id = :userId', { userId });
    if (resourceType) qb.andWhere('log.resource_type = :resourceType', { resourceType });
    if (action) qb.andWhere('log.action = :action', { action });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
