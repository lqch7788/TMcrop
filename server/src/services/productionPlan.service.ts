/**
 * 生产计划服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface ProductionPlan {
  id: string;
  plan_code: string;
  plan_name: string;
  crop_name: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  planting_area?: number;
  planting_date?: string;
  expected_harvest_date?: string;
  target_yield?: number;
  actual_yield?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class ProductionPlanService {
  async getProductionPlans(params: {
    cropName?: string;
    greenhouseId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ProductionPlan[]; total: number }> {
    const db = getDatabase();
    const { cropName, greenhouseId, status, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM production_plans WHERE 1=1';
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
    if (startDate) {
      conditions.push('planting_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('planting_date <= ?');
      queryParams.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: ProductionPlan[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as ProductionPlan);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM production_plans WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<ProductionPlan | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM production_plans WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as ProductionPlan;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(plan: Partial<ProductionPlan>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = plan.id || `pp_${Date.now()}`;

    db.run(`
      INSERT INTO production_plans (
        id, plan_code, plan_name, crop_name, greenhouse_id, greenhouse_name,
        planting_area, planting_date, expected_harvest_date, target_yield,
        actual_yield, status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      plan.plan_code || `PP${Date.now()}`,
      plan.plan_name || '',
      plan.crop_name || '',
      plan.greenhouse_id || null,
      plan.greenhouse_name || null,
      plan.planting_area || null,
      plan.planting_date || null,
      plan.expected_harvest_date || null,
      plan.target_yield || null,
      plan.actual_yield || null,
      plan.status || 'draft',
      plan.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<ProductionPlan>): Promise<boolean> {
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

    db.run(`UPDATE production_plans SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM production_plans WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const productionPlanService = new ProductionPlanService();
