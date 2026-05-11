/**
 * 操作日志服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface OperationLog {
  id: string;
  user_id: string;
  user_name: string;
  module: string;
  action: string;
  target_id?: string;
  target_name?: string;
  ip_address?: string;
  details?: string;
  operate_time: string;
}

export class OperationLogService {
  async getOperationLogs(params: {
    userId?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: OperationLog[]; total: number }> {
    const db = getDatabase();
    const { userId, module, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM operation_logs WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (userId) {
      conditions.push('user_id = ?');
      queryParams.push(userId);
    }
    if (module) {
      conditions.push('module = ?');
      queryParams.push(module);
    }
    if (startDate) {
      conditions.push('operate_time >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('operate_time <= ?');
      queryParams.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY operate_time DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: OperationLog[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as OperationLog);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM operation_logs WHERE 1=1${whereClause}`;
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

  async create(log: Partial<OperationLog>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = log.id || `log_${Date.now()}`;

    db.run(`
      INSERT INTO operation_logs (
        id, user_id, user_name, module, action, target_id, target_name,
        ip_address, details, operate_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      log.user_id || '',
      log.user_name || '',
      log.module || '',
      log.action || '',
      log.target_id || null,
      log.target_name || null,
      log.ip_address || null,
      log.details || null,
      log.operate_time || now,
    ]);

    saveDatabase();
    return id;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM operation_logs WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const operationLogService = new OperationLogService();
