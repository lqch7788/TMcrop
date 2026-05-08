/**
 * 操作日志 API 路由
 * V6.0 Phase 1: 从 LocalStorage 迁移到 SQLite
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

// 生成唯一ID
function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 获取所有操作日志
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { module, level, start_date, end_date, user, search, page = '1', limit = '50' } = req.query;

    let sql = 'SELECT * FROM operation_logs WHERE 1=1';
    const bindings: (string | number)[] = [];

    if (module && module !== 'all') {
      sql += ' AND module = ?';
      bindings.push(module as string);
    }

    if (level && level !== 'all') {
      sql += ' AND level = ?';
      bindings.push(level as string);
    }

    if (start_date) {
      sql += ' AND created_at >= ?';
      bindings.push(start_date as string);
    }

    if (end_date) {
      sql += ' AND created_at <= ?';
      bindings.push(end_date as string);
    }

    if (user) {
      sql += ' AND username LIKE ?';
      bindings.push(`%${user}%`);
    }

    if (search) {
      sql += ' AND (description LIKE ? OR action LIKE ?)';
      bindings.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM operation_logs WHERE 1=1` +
      (module && module !== 'all' ? ' AND module = ?' : '') +
      (level && level !== 'all' ? ' AND level = ?' : '') +
      (start_date ? ' AND created_at >= ?' : '') +
      (end_date ? ' AND created_at <= ?' : '') +
      (user ? ' AND username LIKE ?' : '') +
      (search ? ' AND (description LIKE ? OR action LIKE ?)' : '');

    const countBindings: (string | number)[] = [];
    if (module && module !== 'all') countBindings.push(module as string);
    if (level && level !== 'all') countBindings.push(level as string);
    if (start_date) countBindings.push(start_date as string);
    if (end_date) countBindings.push(end_date as string);
    if (user) countBindings.push(`%${user}%`);
    if (search) countBindings.push(`%${search}%`, `%${search}%`);

    const countStmt = db.prepare(countSql);
    if (countBindings.length > 0) {
      countStmt.bind(countBindings);
    }
    let total = 0;
    if (countStmt.step()) {
      const row = countStmt.getAsObject();
      total = (row.total as number) || 0;
    }
    countStmt.free();

    // 分页
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ? OFFSET ?`;

    const logs: Record<string, unknown>[] = [];
    const stmt = db.prepare(sql);
    const allBindings = [...bindings, limitNum, offset];
    if (allBindings.length > 0) {
      stmt.bind(allBindings);
    }
    while (stmt.step()) {
      logs.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({ success: false, error: '获取操作日志失败' });
  }
});

// 获取单个操作日志详情
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const stmt = db.prepare('SELECT * FROM operation_logs WHERE id = ?');
    stmt.bind([id]);
    let log = null;
    if (stmt.step()) {
      log = stmt.getAsObject();
    }
    stmt.free();

    if (!log) {
      return res.status(404).json({ success: false, error: '日志不存在' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    console.error('获取日志详情失败:', error);
    res.status(500).json({ success: false, error: '获取日志详情失败' });
  }
});

// 创建操作日志
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { user_id, username, action, module, resource_type, resource_id, description, old_value, new_value, status = 'success', error_message } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: '操作类型不能为空' });
    }

    const id = generateId();
    const created_at = new Date().toISOString();

    // 获取客户端信息
    const ip_address = req.ip || req.socket.remoteAddress || '-';
    const user_agent = req.headers['user-agent'] || '-';

    db.run(`
      INSERT INTO operation_logs
      (id, user_id, username, action, module, resource_type, resource_id, description, old_value, new_value, ip_address, user_agent, status, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      user_id || null,
      username || 'system',
      action,
      module || '系统',
      resource_type || null,
      resource_id || null,
      description || '',
      old_value || null,
      new_value || null,
      ip_address,
      user_agent,
      status,
      error_message || null,
      created_at
    ]);

    res.json({ success: true, data: { id, created_at } });
  } catch (error) {
    console.error('创建操作日志失败:', error);
    res.status(500).json({ success: false, error: '创建操作日志失败' });
  }
});

// 获取统计信息
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const stats = {
      total: 0,
      today: 0,
      info: 0,
      warning: 0,
      error: 0
    };

    // 获取总数
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM operation_logs');
    if (totalStmt.step()) {
      const row = totalStmt.getAsObject();
      stats.total = (row.count as number) || 0;
    }
    totalStmt.free();

    // 获取今日数量
    const today = new Date().toISOString().split('T')[0];
    const todayStmt = db.prepare('SELECT COUNT(*) as count FROM operation_logs WHERE date(created_at) = ?');
    todayStmt.bind([today]);
    if (todayStmt.step()) {
      const row = todayStmt.getAsObject();
      stats.today = (row.count as number) || 0;
    }
    todayStmt.free();

    // 按级别统计
    const levelStmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM operation_logs
      GROUP BY status
    `);
    while (levelStmt.step()) {
      const row = levelStmt.getAsObject();
      const status = row.status as string;
      const count = (row.count as number) || 0;
      if (status === 'success' || status === 'info') {
        stats.info += count;
      } else if (status === 'warning') {
        stats.warning += count;
      } else if (status === 'error') {
        stats.error += count;
      }
    }
    levelStmt.free();

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ success: false, error: '获取统计信息失败' });
  }
});

// 删除日志（仅管理员）
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    db.run('DELETE FROM operation_logs WHERE id = ?', [id]);

    res.json({ success: true, message: '日志已删除' });
  } catch (error) {
    console.error('删除日志失败:', error);
    res.status(500).json({ success: false, error: '删除日志失败' });
  }
});

export default router;
