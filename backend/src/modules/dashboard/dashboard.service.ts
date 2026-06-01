import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private dataSource: DataSource) {}

  async getStats() {
    const [
      userStats, chatStats, fileStats, ticketStats, billingStats, inventoryStats,
    ] = await Promise.all([
      this.getUserStats(),
      this.getChatStats(),
      this.getFileStats(),
      this.getTicketStats(),
      this.getBillingStats(),
      this.getInventoryStats(),
    ]);

    return { userStats, chatStats, fileStats, ticketStats, billingStats, inventoryStats };
  }

  private async getUserStats() {
    const [result] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
        COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) AS active,
        COUNT(*) FILTER (WHERE is_online = true AND deleted_at IS NULL) AS online,
        COUNT(*) FILTER (WHERE status = 'blocked' AND deleted_at IS NULL) AS blocked
      FROM users
    `);
    return result;
  }

  private async getChatStats() {
    const [result] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE type = 'private') AS private_chats,
        COUNT(*) FILTER (WHERE type = 'group') AS groups,
        COUNT(*) FILTER (WHERE type = 'department') AS dept_chats
      FROM conversations
    `);
    const [msgResult] = await this.dataSource.query(`
      SELECT COUNT(*) AS total_messages FROM messages WHERE deleted_at IS NULL
    `);
    return { ...result, totalMessages: msgResult.total_messages };
  }

  private async getFileStats() {
    const [result] = await this.dataSource.query(`
      SELECT
        COUNT(*) AS total_files,
        COALESCE(SUM(size), 0) AS total_size_bytes
      FROM files WHERE deleted_at IS NULL
    `);
    return result;
  }

  private async getTicketStats() {
    const [result] = await this.dataSource.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'open') AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
        COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') AS resolved
      FROM tickets WHERE deleted_at IS NULL
    `);
    return result;
  }

  private async getBillingStats() {
    const [result] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE type = 'invoice') AS total_invoices,
        COALESCE(SUM(total) FILTER (WHERE type = 'invoice'), 0) AS total_revenue,
        COALESCE(SUM(balance_due) FILTER (WHERE type = 'invoice' AND status != 'paid'), 0) AS outstanding
      FROM invoices WHERE deleted_at IS NULL
    `);
    const [monthResult] = await this.dataSource.query(`
      SELECT COALESCE(SUM(total), 0) AS monthly_revenue
      FROM invoices
      WHERE type = 'invoice' AND deleted_at IS NULL
        AND invoice_date >= date_trunc('month', CURRENT_DATE)
    `);
    return { ...result, monthlyRevenue: monthResult.monthly_revenue };
  }

  private async getInventoryStats() {
    const [result] = await this.dataSource.query(`
      SELECT
        COUNT(*) AS total_products,
        COUNT(*) FILTER (WHERE stock_qty <= reorder_level AND reorder_level > 0) AS low_stock,
        COUNT(*) FILTER (WHERE stock_qty = 0) AS out_of_stock
      FROM products WHERE deleted_at IS NULL
    `);
    return result;
  }

  async getRecentActivity(limit = 20) {
    return this.dataSource.query(`
      SELECT al.*, u.full_name, u.avatar_url
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT $1
    `, [limit]);
  }

  async getMonthlyRevenue() {
    return this.dataSource.query(`
      SELECT
        TO_CHAR(invoice_date, 'YYYY-MM') AS month,
        SUM(total) AS revenue,
        COUNT(*) AS count
      FROM invoices
      WHERE type = 'invoice' AND deleted_at IS NULL
        AND invoice_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
      ORDER BY month ASC
    `);
  }

  async getTicketTrends() {
    return this.dataSource.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'resolved' OR status = 'closed') AS resolved
      FROM tickets
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND deleted_at IS NULL
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `);
  }
}
