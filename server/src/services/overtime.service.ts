/**
 * 加班记录服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface OvertimeRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  department: string;
  work_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  overtime_type: string;
  reason?: string;
  status: string;
  approved_by?: string;
  approved_time?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class OvertimeService {
  async getOvertimeRecords(params: {
    workerId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: OvertimeRecord[]; total: number }> {
    const db = getDatabase();
    const { workerId, department, status, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM overtime_records WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (workerId) {
      conditions.push('worker_id = ?');
      queryParams.push(workerId);
    }
    if (department) {
      conditions.push('department = ?');
      queryParams.push(department);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }
    if (startDate) {
      conditions.push('work_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('work_date <= ?');
      queryParams.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY work_date DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: OvertimeRecord[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as OvertimeRecord);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM overtime_records WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<OvertimeRecord | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM overtime_records WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as OvertimeRecord;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(record: Partial<OvertimeRecord>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = record.id || `ot_${Date.now()}`;

    db.run(`
      INSERT INTO overtime_records (
        id, worker_id, worker_name, department, work_date,
        start_time, end_time, hours, overtime_type, reason,
        status, approved_by, approved_time, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      record.worker_id || '',
      record.worker_name || '',
      record.department || '',
      record.work_date || now.split('T')[0],
      record.start_time || '',
      record.end_time || '',
      record.hours || 0,
      record.overtime_type || 'weekday',
      record.reason || '',
      record.status || 'pending',
      record.approved_by || null,
      record.approved_time || null,
      record.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async approve(id: string, approvedBy: string): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.run(
      'UPDATE overtime_records SET status = ?, approved_by = ?, approved_time = ?, updated_at = ? WHERE id = ?',
      ['approved', approvedBy, now, now, id]
    );
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM overtime_records WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const overtimeService = new OvertimeService();
