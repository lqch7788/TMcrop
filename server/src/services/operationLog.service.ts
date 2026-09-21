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

    // 2026-09-21 落盘合并（降低写盘频率）：
    //   成功审计不再显式落盘 —— 审计写入全部发生在 HTTP 写请求内（调用方仅 authority.ts
    //   与 schedule.ts 两个路由），其 2xx 响应必然触发 middleware/autoPersist.ts 的 1.5s
    //   debounce 兜底落盘；auditTrail.ts 的文件头注释本来就是按这个前提设计的
    //   （"不在这里调 saveDatabase，已由 autoPersist 覆盖"）。
    //   效果：整页加载的 2 次登录审计从 2 次全量写盘（各 10.6MB）降为 1 次。
    //   失败审计（status != success）例外并保留显式落盘：对应响应是 4xx/5xx，
    //   autoPersist 不落盘，交给兜底就要等下一次成功写盘才写磁盘，进程中途被杀即丢失。
    if ((log.status || 'success') !== 'success') {
      saveDatabase();
    }
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
