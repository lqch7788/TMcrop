/**
 * 育苗服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface Seedling {
  id: string;
  seedling_code: string;
  crop_name: string;
  crop_variety: string;
  source_id: string;
  greenhouse_id: string;
  greenhouse_name: string;
  seedling_date: string;
  expected_finish_date?: string;
  quantity: number;
  unit: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class SeedlingService {
  async getSeedlings(params: {
    cropName?: string;
    greenhouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Seedling[]; total: number }> {
    const db = getDatabase();
    const { cropName, greenhouseId, status, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM seedlings WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (cropName) {
      conditions.push('crop_name LIKE ?');
      queryParams.push(`%${cropName}%`);
    }
    if (greenhouseId) {
      conditions.push('greenhouse_id = ?');
      queryParams.push(greenhouseId);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY seedling_date DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: Seedling[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Seedling);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM seedlings WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<Seedling | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Seedling;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(seedling: Partial<Seedling>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = seedling.id || `sd_${Date.now()}`;

    db.run(`
      INSERT INTO seedlings (
        id, seedling_code, crop_name, crop_variety, source_id,
        greenhouse_id, greenhouse_name, seedling_date, expected_finish_date,
        quantity, unit, status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      seedling.seedling_code || `SD${Date.now()}`,
      seedling.crop_name || '',
      seedling.crop_variety || '',
      seedling.source_id || '',
      seedling.greenhouse_id || '',
      seedling.greenhouse_name || '',
      seedling.seedling_date || now.split('T')[0],
      seedling.expected_finish_date || null,
      seedling.quantity || 0,
      seedling.unit || '',
      seedling.status || 'active',
      seedling.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<Seedling>): Promise<boolean> {
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

    db.run(`UPDATE seedlings SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM seedlings WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const seedlingService = new SeedlingService();
