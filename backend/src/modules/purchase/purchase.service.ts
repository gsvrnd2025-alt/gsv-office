import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PurchaseService {
  constructor(private ds: DataSource) {}
  async getPOs(q: any) {
    return this.ds.query(`SELECT po.*, s.name AS supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.deleted_at IS NULL ORDER BY po.created_at DESC LIMIT 20`);
  }
  async createPO(dto: any, userId: string) {
    const [seq] = await this.ds.query(`UPDATE number_sequences SET current_number = current_number + 1 WHERE type = 'purchase_order' RETURNING prefix, current_number, pad_length`);
    const number = `${seq.prefix}-${new Date().getFullYear()}-${String(seq.current_number).padStart(seq.pad_length, '0')}`;
    const [po] = await this.ds.query(`INSERT INTO purchase_orders (number, supplier_id, warehouse_id, order_date, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [number, dto.supplierId, dto.warehouseId, dto.orderDate || new Date().toISOString().split('T')[0], dto.notes, userId]);
    return po;
  }
  async getSuppliers() { return this.ds.query(`SELECT * FROM suppliers WHERE deleted_at IS NULL ORDER BY name`); }
  async createSupplier(dto: any) {
    const [s] = await this.ds.query(`INSERT INTO suppliers (name, email, phone, address, gstin) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [dto.name, dto.email, dto.phone, dto.address, dto.gstin]);
    return s;
  }
}
