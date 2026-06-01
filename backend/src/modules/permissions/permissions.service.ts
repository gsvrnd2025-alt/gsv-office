import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PermissionsService {
  constructor(private ds: DataSource) {}
  async getAll() { return this.ds.query(`SELECT * FROM permissions ORDER BY module, action`); }
  async getAllGrouped() {
    const perms = await this.getAll();
    return perms.reduce((acc: any, p: any) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});
  }
  async getUserPermissions(userId: string) {
    return this.ds.query(
      `SELECT p.*, up.granted AS user_granted, rp.granted AS role_granted
       FROM permissions p
       LEFT JOIN user_permissions up ON up.permission_id = p.id AND up.user_id = $1
       LEFT JOIN users u ON u.id = $1
       LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = u.role_id
       ORDER BY p.module, p.action`,
      [userId]
    );
  }
  async setUserPermission(userId: string, permissionId: string, granted: boolean) {
    await this.ds.query(
      `INSERT INTO user_permissions (user_id, permission_id, granted) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = $3`,
      [userId, permissionId, granted]
    );
  }
}
