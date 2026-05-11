/**
 * 技术方案服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface TechSolution {
  id: string;
  solution_code: string;
  title: string;
  planting_mode?: string;
  crop_name?: string;
  stage?: string;
  version?: string;
  content: string;
  attachments?: string;
  status: string;
  approved_by?: string;
  approved_time?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class TechSolutionService {
  async getTechSolutions(params: {
    keyword?: string;
    cropName?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TechSolution[]; total: number }> {
    const db = getDatabase();
    const { keyword, cropName, status, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM tech_solutions WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (keyword) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
      const kw = `%${keyword}%`;
      queryParams.push(kw, kw);
    }
    if (cropName) {
      conditions.push('crop_name LIKE ?');
      queryParams.push(`%${cropName}%`);
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

    const items: TechSolution[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as TechSolution);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM tech_solutions WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<TechSolution | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM tech_solutions WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as TechSolution;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(solution: Partial<TechSolution>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = solution.id || `ts_${Date.now()}`;

    db.run(`
      INSERT INTO tech_solutions (
        id, solution_code, title, planting_mode, crop_name, stage, version,
        content, attachments, status, approved_by, approved_time, remarks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      solution.solution_code || `TS${Date.now()}`,
      solution.title || '',
      solution.planting_mode || null,
      solution.crop_name || null,
      solution.stage || null,
      solution.version || '1.0',
      solution.content || '',
      solution.attachments || null,
      solution.status || 'draft',
      solution.approved_by || null,
      solution.approved_time || null,
      solution.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<TechSolution>): Promise<boolean> {
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

    db.run(`UPDATE tech_solutions SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM tech_solutions WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const techSolutionService = new TechSolutionService();
