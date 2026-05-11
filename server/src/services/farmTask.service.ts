/**
 * 农事任务服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface FarmTask {
  id: string;
  task_code: string;
  title: string;
  content: string;
  task_type: string;
  greenhouse_id: string;
  greenhouse_name: string;
  assignee_id: string;
  assignee_name: string;
  plan_date: string;
  status: string;
  priority: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class FarmTaskService {
  async getTasks(params: {
    status?: string;
    assigneeId?: string;
    greenhouseId?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: FarmTask[]; total: number }> {
    const db = getDatabase();
    const { status, assigneeId, greenhouseId, startDate, endDate, keyword, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM farm_tasks WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }
    if (assigneeId) {
      conditions.push('assignee_id = ?');
      queryParams.push(assigneeId);
    }
    if (greenhouseId) {
      conditions.push('greenhouse_id = ?');
      queryParams.push(greenhouseId);
    }
    if (startDate) {
      conditions.push('plan_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('plan_date <= ?');
      queryParams.push(endDate);
    }
    if (keyword) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
      const kw = `%${keyword}%`;
      queryParams.push(kw, kw);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY plan_date DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const tasks: FarmTask[] = [];
    while (stmt.step()) {
      tasks.push(stmt.getAsObject() as unknown as FarmTask);
    }
    stmt.free();

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM farm_tasks WHERE 1=1${whereClause}`;
    const countStmt = db.prepare(countSql);
    countStmt.bind(queryParams);
    countStmt.step();
    const countResult = countStmt.getAsObject();
    countStmt.free();

    return {
      data: tasks,
      total: countResult.total as number,
    };
  }

  async getById(id: string): Promise<FarmTask | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as FarmTask;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(task: Partial<FarmTask>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    db.run(`
      INSERT INTO farm_tasks (
        id, task_code, title, content, task_type, greenhouse_id, greenhouse_name,
        assignee_id, assignee_name, plan_date, status, priority, remarks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      task.task_code || `FT${Date.now()}`,
      task.title || '',
      task.content || '',
      task.task_type || '',
      task.greenhouse_id || '',
      task.greenhouse_name || '',
      task.assignee_id || '',
      task.assignee_name || '',
      task.plan_date || now.split('T')[0],
      task.status || 'pending',
      task.priority || 'normal',
      task.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<FarmTask>): Promise<boolean> {
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

    db.run(`UPDATE farm_tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM farm_tasks WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const farmTaskService = new FarmTaskService();
