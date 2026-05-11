/**
 * 请假记录服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface LeaveRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  substitute_id?: string;
  substitute_name?: string;
  contact_phone?: string;
  status: string;
  approved_by?: string;
  approved_time?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class LeaveService {
  async getLeaveRecords(params: {
    workerId?: string;
    department?: string;
    status?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: LeaveRecord[]; total: number }> {
    const db = getDatabase();
    const { workerId, department, status, leaveType, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM leave_records WHERE 1=1';
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
    if (leaveType) {
      conditions.push('leave_type = ?');
      queryParams.push(leaveType);
    }
    if (startDate) {
      conditions.push('start_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('end_date <= ?');
      queryParams.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: LeaveRecord[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as LeaveRecord);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM leave_records WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<LeaveRecord | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM leave_records WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as LeaveRecord;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(record: Partial<LeaveRecord>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = record.id || `leave_${Date.now()}`;

    db.run(`
      INSERT INTO leave_records (
        id, worker_id, worker_name, department, leave_type,
        start_date, end_date, total_days, reason, substitute_id, substitute_name,
        contact_phone, status, approved_by, approved_time, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      record.worker_id || '',
      record.worker_name || '',
      record.department || '',
      record.leave_type || 'personal',
      record.start_date || now.split('T')[0],
      record.end_date || now.split('T')[0],
      record.total_days || 1,
      record.reason || '',
      record.substitute_id || null,
      record.substitute_name || null,
      record.contact_phone || null,
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
      'UPDATE leave_records SET status = ?, approved_by = ?, approved_time = ?, updated_at = ? WHERE id = ?',
      ['approved', approvedBy, now, now, id]
    );
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM leave_records WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const leaveService = new LeaveService();
