/**
 * 操作日志服务
 */

import { getDatabase, saveDatabase } from '../db';
import { bumpAuditWriteCount } from '../lib/auditMeta';

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
  /**
   * 审计级别（2026-09-19 新增）
   * 与 middleware/auditTrail.ts 的分档保持一致：success / warning(4xx) / error(5xx)。
   * 不传时按 success 落库 —— 但失败的操作（如登录失败）必须显式传 warning，
   * 否则统计接口的「警告/错误」计数永远是 0。
   */
  status?: 'success' | 'warning' | 'error';
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
        id, user_id, username, module, action, resource_id, description,
        ip_address, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      log.user_id || '',
      log.user_name || '',
      log.module || '',
      log.action || '',
      log.target_id || null,
      log.details || null,
      log.ip_address || null,
      log.status || 'success',
      log.operate_time || now,
    ]);

    saveDatabase();
    // 通知 middleware/auditTrail.ts：本请求已显式写过日志，不要重复记录
    bumpAuditWriteCount();
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
