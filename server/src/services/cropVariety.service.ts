/**
 * 作物品种服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface CropVariety {
  id: string;
  variety_code: string;
  variety_name: string;
  sub_variety1_name?: string;
  sub_variety2_name?: string;
  detail_variety_name?: string;
  category_code?: string;
  crop_code?: string;
  crop_name?: string;
  type_name?: string;
  sort_order?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class CropVarietyService {
  async getCropVarieties(params: {
    keyword?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: CropVariety[]; total: number }> {
    const db = getDatabase();
    const { keyword, category, status, page = 1, limit = 50 } = params;

    const sql = 'SELECT * FROM crop_varieties WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (keyword) {
      conditions.push('(variety_name LIKE ? OR sub_variety1_name LIKE ? OR detail_variety_name LIKE ? OR crop_code LIKE ?)');
      const kw = `%${keyword}%`;
      queryParams.push(kw, kw, kw, kw);
    }
    if (category) {
      conditions.push('category_code = ?');
      queryParams.push(category);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY crop_code, variety_name LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: CropVariety[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as CropVariety);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM crop_varieties WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<CropVariety | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM crop_varieties WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as CropVariety;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(variety: Partial<CropVariety>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = variety.id || `cv_${Date.now()}`;

    db.run(`
      INSERT INTO crop_varieties (
        id, variety_code, variety_name, sub_variety1_name, sub_variety2_name,
        detail_variety_name, category_code, crop_code, crop_name, type_name,
        sort_order, status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      variety.variety_code || `CV${Date.now()}`,
      variety.variety_name || '',
      variety.sub_variety1_name || null,
      variety.sub_variety2_name || null,
      variety.detail_variety_name || null,
      variety.category_code || null,
      variety.crop_code || null,
      variety.crop_name || null,
      variety.type_name || null,
      variety.sort_order || 0,
      variety.status || 'active',
      variety.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<CropVariety>): Promise<boolean> {
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

    db.run(`UPDATE crop_varieties SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM crop_varieties WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const cropVarietyService = new CropVarietyService();
