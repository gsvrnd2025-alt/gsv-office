import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class StorageService {
  constructor(private dataSource: DataSource) {}

  async getStorageMetrics() {
    // 1. Get total database storage sum by user
    const fileSizes = await this.dataSource.query(`
      SELECT owner_id AS "ownerId", COALESCE(SUM(size), 0) AS "usedBytes"
      FROM files
      WHERE deleted_at IS NULL
      GROUP BY owner_id
    `);

    const fileSizesMap = new Map<string, number>();
    for (const row of fileSizes) {
      fileSizesMap.set(row.ownerId, Number(row.usedBytes));
    }

    // 2. Get users list and their metadata to retrieve quota limits
    const users = await this.dataSource.query(`
      SELECT u.id AS "userId", u.full_name AS "fullName", u.login_id AS "loginId", u.metadata, r.name AS "roleName"
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL
    `);

    // Default limit: 10 GB = 10 * 1024 * 1024 * 1024 bytes
    const DEFAULT_LIMIT = 10 * 1024 * 1024 * 1024;

    const userMetrics = users.map((u: any) => {
      const usedBytes = fileSizesMap.get(u.userId) || 0;
      // Get storageLimitBytes from metadata
      const meta = u.metadata || {};
      const limitBytes = Number(meta.storageQuotaBytes) || DEFAULT_LIMIT;

      return {
        userId: u.userId,
        fullName: u.fullName,
        loginId: u.loginId,
        roleName: u.roleName || 'User',
        usedBytes,
        limitBytes,
      };
    });

    const totalUsedBytes = userMetrics.reduce((sum, u) => sum + u.usedBytes, 0);
    // Let's assume total cluster capacity is 1000 GB
    const totalLimitBytes = 1000 * 1024 * 1024 * 1024;
    const freeBytes = Math.max(0, totalLimitBytes - totalUsedBytes);

    return {
      totalLimitBytes,
      totalUsedBytes,
      freeBytes,
      users: userMetrics,
    };
  }

  async updateQuota(loginId: string, limitBytes: number) {
    const [user] = await this.dataSource.query(
      `SELECT id, metadata FROM users WHERE login_id = $1 AND deleted_at IS NULL`,
      [loginId]
    );

    if (!user) {
      throw new NotFoundException(`User with login ID ${loginId} not found`);
    }

    const metadata = user.metadata || {};
    metadata.storageQuotaBytes = limitBytes;

    await this.dataSource.query(
      `UPDATE users SET metadata = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(metadata), user.id]
    );

    return { success: true, limitBytes };
  }
}
