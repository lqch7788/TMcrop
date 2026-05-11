/**
 * 问题记录服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface Problem {
  id: string;
  problem_code: string;
  title: string;
  description: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  inspector_id?: string;
  inspector_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  severity: string;
  status: string;
  resolve_deadline?: string;
  resolve_time?: string;
  resolution?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class ProblemService {
  async getProblems(params: {
    assigneeId?: string;
    greenhouseId?: string;
    status?: string;
    severity?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Problem[]; total: number }> {
    const db = getDatabase();
    const { assigneeId, greenhouseId, status, severity, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM problems WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (assigneeId) {
      conditions.push('assignee_id = ?');
      queryParams.push(assigneeId);
    }
    if (greenhouseId) {
      conditions.push('greenhouse_id = ?');
      queryParams.push(greenhouseId);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }
    if (severity) {
      conditions.push('severity = ?');
      queryParams.push(severity);
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

    const items: Problem[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Problem);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM problems WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<Problem | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM problems WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Problem;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(problem: Partial<Problem>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = problem.id || `prob_${Date.now()}`;

    db.run(`
      INSERT INTO problems (
        id, problem_code, title, description, greenhouse_id, greenhouse_name,
        inspector_id, inspector_name, assignee_id, assignee_name,
        severity, status, resolve_deadline, resolution, remarks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      problem.problem_code || `PR${Date.now()}`,
      problem.title || '',
      problem.description || '',
      problem.greenhouse_id || null,
      problem.greenhouse_name || null,
      problem.inspector_id || null,
      problem.inspector_name || null,
      problem.assignee_id || null,
      problem.assignee_name || null,
      problem.severity || 'medium',
      problem.status || 'pending',
      problem.resolve_deadline || null,
      problem.resolution || null,
      problem.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<Problem>): Promise<boolean> {
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

    db.run(`UPDATE problems SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async resolve(id: string, resolution: string): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.run(
      'UPDATE problems SET resolution = ?, resolve_time = ?, status = ?, updated_at = ? WHERE id = ?',
      [resolution, now, 'resolved', now, id]
    );
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM problems WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const problemService = new ProblemService();
