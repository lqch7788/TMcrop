/**
 * 订单服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface CropOrder {
  id: string;
  order_code: string;
  customer_name: string;
  customer_contact?: string;
  crop_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  total_amount?: number;
  order_date: string;
  expected_delivery_date?: string;
  delivery_date?: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class CropOrderService {
  async getCropOrders(params: {
    customerName?: string;
    cropName?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: CropOrder[]; total: number }> {
    const db = getDatabase();
    const { customerName, cropName, status, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM crop_orders WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (customerName) {
      conditions.push('customer_name LIKE ?');
      queryParams.push(`%${customerName}%`);
    }
    if (cropName) {
      conditions.push('crop_name LIKE ?');
      queryParams.push(`%${cropName}%`);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }
    if (startDate) {
      conditions.push('order_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('order_date <= ?');
      queryParams.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY order_date DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: CropOrder[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as CropOrder);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM crop_orders WHERE 1=1${whereClause}`;
    const countStmt = db.prepare(countSql);
    countStmt.bind(queryParams);
    countStmt.step();
    const countResult = countStmt.getAsObject();
    countStmt.free();

    return {
      data: items,
      total: countResult.total as number,
    };
  }

  async getById(id: string): Promise<CropOrder | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM crop_orders WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as CropOrder;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(order: Partial<CropOrder>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = order.id || `order_${Date.now()}`;

    db.run(`
      INSERT INTO crop_orders (
        id, order_code, customer_name, customer_contact, crop_name,
        quantity, unit, unit_price, total_amount, order_date,
        expected_delivery_date, delivery_date, status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      order.order_code || `CO${Date.now()}`,
      order.customer_name || '',
      order.customer_contact || null,
      order.crop_name || '',
      order.quantity || 0,
      order.unit || '',
      order.unit_price || null,
      order.total_amount || null,
      order.order_date || now.split('T')[0],
      order.expected_delivery_date || null,
      order.delivery_date || null,
      order.status || 'pending',
      order.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<CropOrder>): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE crop_orders SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM crop_orders WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const cropOrderService = new CropOrderService();
