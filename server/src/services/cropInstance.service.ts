/**
 * 作物实例服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface CropInstance {
  id: string;
  instance_code: string;
  order_id?: string;
  crop_name: string;
  crop_variety: string;
  source_instance_id?: string;
  planting_date?: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  batch_code?: string;
  quantity?: number;
  unit?: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class CropInstanceService {
  async getCropInstances(params: {
    cropName?: string;
    orderId?: string;
    greenhouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: CropInstance[]; total: number }> {
    const db = getDatabase();
    const { cropName, orderId, greenhouseId, status, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM crop_instances WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (cropName) {
      conditions.push('crop_name LIKE ?');
      queryParams.push(`%${cropName}%`);
    }
    if (orderId) {
      conditions.push('order_id = ?');
      queryParams.push(orderId);
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

    const finalSql = `${sql}${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: CropInstance[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as CropInstance);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM crop_instances WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<CropInstance | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM crop_instances WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as CropInstance;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(instance: Partial<CropInstance>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = instance.id || `ci_${Date.now()}`;

    db.run(`
      INSERT INTO crop_instances (
        id, instance_code, order_id, crop_name, crop_variety, source_instance_id,
        planting_date, expected_harvest_date, actual_harvest_date,
        greenhouse_id, greenhouse_name, batch_code, quantity, unit,
        status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      instance.instance_code || `CI${Date.now()}`,
      instance.order_id || null,
      instance.crop_name || '',
      instance.crop_variety || '',
      instance.source_instance_id || null,
      instance.planting_date || null,
      instance.expected_harvest_date || null,
      instance.actual_harvest_date || null,
      instance.greenhouse_id || null,
      instance.greenhouse_name || null,
      instance.batch_code || null,
      instance.quantity || null,
      instance.unit || null,
      instance.status || 'active',
      instance.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<CropInstance>): Promise<boolean> {
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

    db.run(`UPDATE crop_instances SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM crop_instances WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const cropInstanceService = new CropInstanceService();
