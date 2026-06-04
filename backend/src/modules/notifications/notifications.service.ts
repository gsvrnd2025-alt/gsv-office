import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class NotificationsService {
  constructor(private ds: DataSource) {}
  async getForUser(userId: string, unreadOnly = false) {
    const where = unreadOnly ? 'AND is_read = false' : '';
    return this.ds.query(`SELECT * FROM notifications WHERE user_id = $1 ${where} ORDER BY created_at DESC LIMIT 50`, [userId]);
  }
  async create(dto: { userId: string; type: string; title: string; body: string; data?: any; actionUrl?: string }) {
    const [n] = await this.ds.query(`INSERT INTO notifications (user_id, type, title, body, data, action_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [dto.userId, dto.type, dto.title, dto.body, dto.data || {}, dto.actionUrl]);
    return n;
  }
  async markRead(id: string, userId: string) {
    await this.ds.query(`UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2`, [id, userId]);
  }
  async markAllRead(userId: string) {
    await this.ds.query(`UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false`, [userId]);
  }
  async getUnreadCount(userId: string): Promise<number> {
    const [r] = await this.ds.query(`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`, [userId]);
    return parseInt(r.count, 10);
  }
}
