/**
 * 供应商服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface Supplier {
  id: string;
  supplier_code: string;
  supplier_name: string;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  supplier_type: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class SupplierService {
  async getSuppliers(params: {
    keyword?: string;
    supplierType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Supplier[]; total: number }> {
    const db = getDatabase();
    const { keyword, supplierType, status, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM suppliers WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (keyword) {
      conditions.push('(supplier_name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ?)');
      const kw = `%${keyword}%`;
      queryParams.push(kw, kw, kw);
    }
    if (supplierType) {
      conditions.push('supplier_type = ?');
      queryParams.push(supplierType);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: Supplier[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Supplier);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM suppliers WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<Supplier | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM suppliers WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Supplier;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(supplier: Partial<Supplier>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = supplier.id || `sup_${Date.now()}`;

    db.run(`
      INSERT INTO suppliers (
        id, supplier_code, supplier_name, contact_person, contact_phone,
        address, supplier_type, status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      supplier.supplier_code || `SUP${Date.now()}`,
      supplier.supplier_name || '',
      supplier.contact_person || '',
      supplier.contact_phone || '',
      supplier.address || '',
      supplier.supplier_type || '',
      supplier.status || 'active',
      supplier.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<Supplier>): Promise<boolean> {
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

    db.run(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM suppliers WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const supplierService = new SupplierService();
