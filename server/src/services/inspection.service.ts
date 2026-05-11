/**
 * 巡查记录服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface Inspection {
  id: string;
  inspection_code: string;
  inspector_id: string;
  inspector_name: string;
  greenhouse_id: string;
  greenhouse_name: string;
  check_date: string;
  check_time: string;
  weather?: string;
  temperature?: number;
  humidity?: number;
  findings?: string;
  issues_count?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class InspectionService {
  async getInspections(params: {
    inspectorId?: string;
    greenhouseId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Inspection[]; total: number }> {
    const db = getDatabase();
    const { inspectorId, greenhouseId, status, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM inspections WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (inspectorId) {
      conditions.push('inspector_id = ?');
      queryParams.push(inspectorId);
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
      conditions.push('check_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('check_date <= ?');
      queryParams.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY check_date DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: Inspection[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Inspection);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM inspections WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<Inspection | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inspections WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Inspection;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(inspection: Partial<Inspection>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = inspection.id || `insp_${Date.now()}`;

    db.run(`
      INSERT INTO inspections (
        id, inspection_code, inspector_id, inspector_name, greenhouse_id, greenhouse_name,
        check_date, check_time, weather, temperature, humidity, findings,
        issues_count, status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      inspection.inspection_code || `INSP${Date.now()}`,
      inspection.inspector_id || '',
      inspection.inspector_name || '',
      inspection.greenhouse_id || '',
      inspection.greenhouse_name || '',
      inspection.check_date || now.split('T')[0],
      inspection.check_time || now.split('T')[1].split('.')[0],
      inspection.weather || null,
      inspection.temperature || null,
      inspection.humidity || null,
      inspection.findings || '',
      inspection.issues_count || 0,
      inspection.status || 'completed',
      inspection.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<Inspection>): Promise<boolean> {
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

    db.run(`UPDATE inspections SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM inspections WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const inspectionService = new InspectionService();
