import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class InventoryService {
  constructor(private dataSource: DataSource) {}

  async getProducts(query: any) {
    const { page = 1, limit = 20, search, categoryId, lowStock } = query;
    let where = 'p.deleted_at IS NULL';
    const params: any[] = [];
    let idx = 1;
    if (search) { where += ` AND (p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.barcode ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    if (categoryId) { where += ` AND p.category_id = $${idx++}`; params.push(categoryId); }
    if (lowStock === 'true') { where += ` AND p.stock_qty <= p.reorder_level AND p.reorder_level > 0`; }
    return this.dataSource.query(
      `SELECT p.*, pc.name AS category_name FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id WHERE ${where} ORDER BY p.name ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    );
  }

  async createProduct(dto: any, userId: string) {
    const [p] = await this.dataSource.query(
      `INSERT INTO products (sku, barcode, name, description, category_id, unit, purchase_price, selling_price, mrp, tax_rate, hsn_code, stock_qty, reorder_level, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [dto.sku, dto.barcode, dto.name, dto.description, dto.categoryId, dto.unit || 'pcs', dto.purchasePrice || 0, dto.sellingPrice || 0, dto.mrp || 0, dto.taxRate || 18, dto.hsnCode, dto.stockQty || 0, dto.reorderLevel || 0, userId]
    );
    return p;
  }

  async updateProduct(id: string, dto: any) {
    const fields = Object.entries(dto).filter(([k]) => !['id', 'createdAt'].includes(k)).map(([k, v], i) => `${k} = $${i + 2}`).join(', ');
    const values = Object.entries(dto).filter(([k]) => !['id', 'createdAt'].includes(k)).map(([, v]) => v);
    const [p] = await this.dataSource.query(`UPDATE products SET ${fields} WHERE id = $1 RETURNING *`, [id, ...values]);
    return p;
  }

  async adjustStock(productId: string, dto: any, userId: string) {
    const [product] = await this.dataSource.query(`SELECT * FROM products WHERE id = $1`, [productId]);
    const after = parseFloat(product.stock_qty) + parseFloat(dto.qty);
    await this.dataSource.query(`UPDATE products SET stock_qty = $1 WHERE id = $2`, [after, productId]);
    await this.dataSource.query(
      `INSERT INTO stock_movements (product_id, type, qty, before_qty, after_qty, notes, created_by) VALUES ($1, 'adjustment', $2, $3, $4, $5, $6)`,
      [productId, dto.qty, product.stock_qty, after, dto.notes, userId]
    );
    return { stockQty: after };
  }

  async getCategories() {
    return this.dataSource.query(`SELECT * FROM product_categories WHERE is_active = true ORDER BY name`);
  }
}
