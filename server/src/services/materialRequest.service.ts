/**
 * 物料申请服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface MaterialRequest {
  id: string;
  request_code: string;
  applicant_id: string;
  applicant_name: string;
  department: string;
  warehouse_id?: string;
  warehouse_name?: string;
  purpose?: string;
  expected_date?: string;
  items: string; // JSON string
  total_amount?: number;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class MaterialRequestService {
  async getMaterialRequests(params: {
    applicantId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MaterialRequest[]; total: number }> {
    const db = getDatabase();
    const { applicantId, department, status, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM material_requests WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (applicantId) {
      conditions.push('applicant_id = ?');
      queryParams.push(applicantId);
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
      conditions.push('created_at >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('created_at <= ?');
      queryParams.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: MaterialRequest[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as MaterialRequest);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM material_requests WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<MaterialRequest | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM material_requests WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as MaterialRequest;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(request: Partial<MaterialRequest>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = request.id || `mr_${Date.now()}`;

    db.run(`
      INSERT INTO material_requests (
        id, request_code, applicant_id, applicant_name, department,
        warehouse_id, warehouse_name, purpose, expected_date, items,
        total_amount, status, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      request.request_code || `MR${Date.now()}`,
      request.applicant_id || '',
      request.applicant_name || '',
      request.department || '',
      request.warehouse_id || null,
      request.warehouse_name || null,
      request.purpose || null,
      request.expected_date || null,
      request.items || '[]',
      request.total_amount || null,
      request.status || 'pending',
      request.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async updateStatus(id: string, status: string): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.run('UPDATE material_requests SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM material_requests WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const materialRequestService = new MaterialRequestService();
