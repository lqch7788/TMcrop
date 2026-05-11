/**
 * 临时任务服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface TempTask {
  id: string;
  task_code: string;
  title: string;
  content: string;
  task_type: string;
  executor_id: string;
  executor_name: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  deadline?: string;
  priority: string;
  status: string;
  feedback?: string;
  feedback_time?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class TempTaskService {
  async getTempTasks(params: {
    executorId?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: TempTask[]; total: number }> {
    const db = getDatabase();
    const { executorId, status, priority, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM temp_tasks WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (executorId) {
      conditions.push('executor_id = ?');
      queryParams.push(executorId);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }
    if (priority) {
      conditions.push('priority = ?');
      queryParams.push(priority);
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

    const items: TempTask[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as TempTask);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM temp_tasks WHERE 1=1${whereClause}`;
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

  async getById(id: string): Promise<TempTask | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as TempTask;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(task: Partial<TempTask>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = task.id || `temp_${Date.now()}`;

    db.run(`
      INSERT INTO temp_tasks (
        id, task_code, title, content, task_type, executor_id, executor_name,
        greenhouse_id, greenhouse_name, deadline, priority, status, feedback,
        feedback_time, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      task.task_code || `TT${Date.now()}`,
      task.title || '',
      task.content || '',
      task.task_type || '',
      task.executor_id || '',
      task.executor_name || '',
      task.greenhouse_id || null,
      task.greenhouse_name || null,
      task.deadline || null,
      task.priority || 'normal',
      task.status || 'pending',
      task.feedback || null,
      task.feedback_time || null,
      task.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<TempTask>): Promise<boolean> {
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

    db.run(`UPDATE temp_tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async submitFeedback(id: string, feedback: string): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.run(
      'UPDATE temp_tasks SET feedback = ?, feedback_time = ?, status = ?, updated_at = ? WHERE id = ?',
      [feedback, now, 'completed', now, id]
    );
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM temp_tasks WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const tempTaskService = new TempTaskService();
