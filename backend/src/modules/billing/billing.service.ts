import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class BillingService {
  constructor(private dataSource: DataSource) {}

  async getInvoices(query: any) {
    const { page = 1, limit = 20, type, status, customerId } = query;
    let where = 'i.deleted_at IS NULL';
    const params: any[] = [];
    let p = 1;
    if (type) { where += ` AND i.type = $${p++}`; params.push(type); }
    if (status) { where += ` AND i.status = $${p++}`; params.push(status); }
    if (customerId) { where += ` AND i.customer_id = $${p++}`; params.push(customerId); }
    return this.dataSource.query(
      `SELECT i.*, c.name AS customer_name FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE ${where} ORDER BY i.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    );
  }

  async getInvoiceById(id: string) {
    const [invoice] = await this.dataSource.query(
      `SELECT i.*, c.* FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.id = $1`, [id]
    );
    const items = await this.dataSource.query(
      `SELECT ii.*, p.name AS product_name FROM invoice_items ii LEFT JOIN products p ON p.id = ii.product_id WHERE ii.invoice_id = $1`, [id]
    );
    const payments = await this.dataSource.query(
      `SELECT * FROM payments WHERE invoice_id = $1`, [id]
    );
    return { ...invoice, items, payments };
  }

  async createInvoice(dto: any, userId: string) {
    const typePrefix = { invoice: 'INV', quotation: 'QT', estimate: 'EST', sales_order: 'SO', credit_note: 'CN', debit_note: 'DN' };
    const seqType = dto.type || 'invoice';
    const [seq] = await this.dataSource.query(
      `UPDATE number_sequences SET current_number = current_number + 1 WHERE type = $1 RETURNING prefix, current_number, pad_length, current_year`,
      [seqType]
    );
    const year = new Date().getFullYear();
    const number = `${seq.prefix}-${year}-${String(seq.current_number).padStart(seq.pad_length, '0')}`;
    // Calculate totals
    const items = dto.items || [];
    let subtotal = 0, taxAmount = 0;
    for (const item of items) {
      item.taxableAmount = item.qty * item.unitPrice * (1 - (item.discountPercent || 0) / 100);
      item.taxAmount = item.taxableAmount * (item.taxRate || 18) / 100;
      item.total = item.taxableAmount + item.taxAmount;
      subtotal += item.taxableAmount;
      taxAmount += item.taxAmount;
    }
    const total = subtotal + taxAmount - (dto.discountAmount || 0);
    const [inv] = await this.dataSource.query(
      `INSERT INTO invoices (number, type, status, customer_id, invoice_date, due_date, notes, subtotal, tax_amount, total, balance_due, created_by)
       VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9, $9, $10) RETURNING *`,
      [number, dto.type || 'invoice', dto.customerId, dto.invoiceDate || new Date().toISOString().split('T')[0], dto.dueDate, dto.notes, subtotal, taxAmount, total, userId]
    );
    for (const item of items) {
      await this.dataSource.query(
        `INSERT INTO invoice_items (invoice_id, product_id, description, qty, unit_price, tax_rate, taxable_amount, tax_amount, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [inv.id, item.productId, item.description, item.qty, item.unitPrice, item.taxRate || 18, item.taxableAmount, item.taxAmount, item.total]
      );
    }
    return inv;
  }

  async getCustomers(query: any) {
    return this.dataSource.query(`SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY name ASC`);
  }

  async createCustomer(dto: any) {
    const [c] = await this.dataSource.query(
      `INSERT INTO customers (name, email, phone, mobile, address, city, state, gstin, pan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [dto.name, dto.email, dto.phone, dto.mobile, dto.address, dto.city, dto.state, dto.gstin, dto.pan]
    );
    return c;
  }

  async recordPayment(invoiceId: string, dto: any, userId: string) {
    const [payment] = await this.dataSource.query(
      `INSERT INTO payments (invoice_id, amount, method, reference, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [invoiceId, dto.amount, dto.method, dto.reference, dto.notes, userId]
    );
    await this.dataSource.query(
      `UPDATE invoices SET paid_amount = paid_amount + $1, balance_due = balance_due - $1,
       status = CASE WHEN balance_due - $1 <= 0 THEN 'paid' WHEN balance_due - $1 < total THEN 'partially_paid' ELSE status END
       WHERE id = $2`,
      [dto.amount, invoiceId]
    );
    return payment;
  }
}
