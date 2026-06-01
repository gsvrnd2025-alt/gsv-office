import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class TicketsService {
  constructor(private dataSource: DataSource) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, status, priority, assignedTo, raisedBy } = query;
    let where = 't.deleted_at IS NULL';
    const params: any[] = [];
    let pIdx = 1;
    if (status) { where += ` AND t.status = $${pIdx++}`; params.push(status); }
    if (priority) { where += ` AND t.priority = $${pIdx++}`; params.push(priority); }
    if (assignedTo) { where += ` AND t.assigned_to = $${pIdx++}`; params.push(assignedTo); }
    if (raisedBy) { where += ` AND t.raised_by = $${pIdx++}`; params.push(raisedBy); }
    const offset = (page - 1) * limit;
    return this.dataSource.query(
      `SELECT t.*, ra.full_name AS raised_by_name, aa.full_name AS assigned_to_name, tc.name AS category_name
       FROM tickets t
       LEFT JOIN users ra ON ra.id = t.raised_by
       LEFT JOIN users aa ON aa.id = t.assigned_to
       LEFT JOIN ticket_categories tc ON tc.id = t.category_id
       WHERE ${where} ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
  }

  async create(dto: any, userId: string) {
    const [seq] = await this.dataSource.query(
      `UPDATE number_sequences SET current_number = current_number + 1 WHERE type = 'ticket' RETURNING prefix, current_number, pad_length`
    );
    const number = `${seq.prefix}-${String(seq.current_number).padStart(seq.pad_length, '0')}`;
    const [ticket] = await this.dataSource.query(
      `INSERT INTO tickets (number, title, description, priority, category_id, raised_by, department_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [number, dto.title, dto.description, dto.priority || 'medium', dto.categoryId, userId, dto.departmentId]
    );
    await this.dataSource.query(
      `INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value)
       VALUES ($1, $2, 'status', NULL, 'open')`,
      [ticket.id, userId]
    );
    return ticket;
  }

  async update(id: string, dto: any, userId: string) {
    const fields = Object.entries(dto).map(([k, v], i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.values(dto);
    const [ticket] = await this.dataSource.query(
      `UPDATE tickets SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return ticket;
  }

  async addComment(ticketId: string, dto: any, userId: string) {
    const [comment] = await this.dataSource.query(
      `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES ($1, $2, $3, $4) RETURNING *`,
      [ticketId, userId, dto.content, dto.isInternal || false]
    );
    return comment;
  }

  async getCategories() {
    return this.dataSource.query(`SELECT * FROM ticket_categories WHERE is_active = true ORDER BY name`);
  }
}
