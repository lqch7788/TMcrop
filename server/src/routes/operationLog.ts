/**
 * 操作日志 API 路由
 * V6.0 Phase 1: 从 LocalStorage 迁移到 SQLite
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase, saveDatabase } from '../db/index';
import { expandAuditModuleFilter, bumpAuditWriteCount } from '../lib/auditMeta';
import { permissionGuard } from '../middleware/permissionGuard';

const router = Router();

// 生成唯一ID
function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 获取所有操作日志
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // 2026-09-19 修复三个筛选 bug：
    //  1) 前端「级别」发 level，但表里的列叫 status（无 level 列）→ 原代码一选级别就 500
    //  2) 前端「用户」发 username，原代码只读 user → 用户筛选完全失效
    //  3) 模块筛选原代码只映射了 farm，其余分类值（crop/schedule/labor/material/system/approval）
    //     与库里存的中文模块名对不上 → 选了等于查空
    // 同时把"列表查询"和"总数查询"合并为同一份 WHERE，避免两处条件各改各的再次跑偏
    const {
      module,
      level,
      status: statusParam,
      start_date,
      end_date,
      user,
      username,
      search,
      page = '1',
      limit = '50',
    } = req.query;

    // 级别：兼容前端历史参数名 level 与表列名 status
    const statusFilter = (statusParam ?? level) as string | undefined;
    // 用户：兼容两种参数名
    const userFilter = (user ?? username) as string | undefined;

    const conditions: string[] = [];
    const bindings: (string | number)[] = [];

    if (module && module !== 'all') {
      // 分类 → 该分类下的历史别名一并匹配（如「计划管理」同时匹配早期写入的「排班」）
      const moduleValues = expandAuditModuleFilter(module as string);
      conditions.push(`module IN (${moduleValues.map(() => '?').join(',')})`);
      bindings.push(...moduleValues);
    }

    if (statusFilter && statusFilter !== 'all') {
      // 与 /stats/summary 的分档保持一致：前端选「信息」时同时匹配 success 与 info
      const statusValues =
        statusFilter === 'info' ? ['success', 'info'] : [statusFilter];
      conditions.push(`status IN (${statusValues.map(() => '?').join(',')})`);
      bindings.push(...statusValues);
    }

    if (start_date) {
      conditions.push('created_at >= ?');
      bindings.push(start_date as string);
    }

    if (end_date) {
      conditions.push('created_at <= ?');
      bindings.push(end_date as string);
    }

    if (userFilter) {
      conditions.push('username LIKE ?');
      bindings.push(`%${userFilter}%`);
    }

    if (search) {
      // 2026-09-19：搜索范围从「描述 + 操作类型」扩到「描述 + 操作类型 + 操作人 + 模块」。
      // 原范围下搜人名、搜模块名都搜不到，用户会以为这个搜索框是坏的（实测反馈）。
      // 若搜索词本身就是模块分类名（如「计划管理」），把该分类的历史别名一并匹配
      // （历史记录里存的是「排班」，见 lib/auditMeta.ts 的 AUDIT_MODULE_ALIASES）。
      const moduleTerms = expandAuditModuleFilter(String(search));
      const hasAliases = moduleTerms.length > 1;
      const aliasClause = hasAliases
        ? ` OR module IN (${moduleTerms.map(() => '?').join(',')})`
        : '';
      conditions.push(
        `(description LIKE ? OR action LIKE ? OR username LIKE ? OR module LIKE ?${aliasClause})`
      );
      const likeTerm = `%${search}%`;
      bindings.push(likeTerm, likeTerm, likeTerm, likeTerm);
      // 只有真的拼了别名子句，才绑定别名参数 —— 否则占位符与参数个数不一致会直接 500
      if (hasAliases) bindings.push(...moduleTerms);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // 获取总数
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM operation_logs${whereClause}`);
    if (bindings.length > 0) {
      countStmt.bind(bindings);
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

    const logs: Record<string, unknown>[] = [];
    const stmt = db.prepare(
      `SELECT * FROM operation_logs${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    stmt.bind([...bindings, limitNum, offset]);
    while (stmt.step()) {
      logs.push(stmt.getAsObject());
    }
    stmt.free();

    // 直接返回数据，不使用 success: true 包装，以便前端 enhancedApiClient 保留 meta 信息
    res.json({
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

// 导出所有操作日志
router.get('/export/all', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { start_date, end_date, module, action, user } = req.query;

    // 农事管理模块映射
    const farmModules = ['农事任务', '临时任务', '巡查', '问题'];

    let sql = 'SELECT * FROM operation_logs WHERE 1=1';
    const bindings: (string | number)[] = [];

    if (start_date) {
      sql += ' AND created_at >= ?';
      bindings.push(start_date as string);
    }

    if (end_date) {
      sql += ' AND created_at <= ?';
      bindings.push(end_date as string);
    }

    if (module && module !== 'all') {
      if (module === 'farm') {
        sql += ` AND module IN (${farmModules.map(() => '?').join(',')})`;
        bindings.push(...farmModules);
      } else {
        sql += ' AND module = ?';
        bindings.push(module as string);
      }
    }

    if (action && action !== 'all') {
      sql += ' AND action = ?';
      bindings.push(action as string);
    }

    if (user) {
      sql += ' AND username LIKE ?';
      bindings.push(`%${user}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const logs: Record<string, unknown>[] = [];
    const stmt = db.prepare(sql);
    if (bindings.length > 0) {
      stmt.bind(bindings);
    }
    while (stmt.step()) {
      logs.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('导出操作日志失败:', error);
    res.status(500).json({ success: false, error: '导出操作日志失败' });
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

    saveDatabase();
    // 通知 middleware/auditTrail.ts：本次请求已写过日志（该路径本就在跳过列表内，这里是双保险）
    bumpAuditWriteCount();
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

/**
 * 删除审计日志的门槛之一：必须带真实登录令牌
 *
 * 背景：DEMO_MODE=true 时 middleware/auth.ts 的 authenticate 会给**所有无 token
 * 请求**注入 { userId:'demo_user', role:'admin' }。于是只靠 permissionGuard 做角色
 * 校验，在演示模式下一律放行 —— 等于"被审计者可以删掉自己的记录"。
 * 这里要求请求头必须带 Authorization，把演示旁路挡在门外。
 */
const requireRealToken = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.headers.authorization) {
    res.status(403).json({
      success: false,
      error: '删除审计日志需要真实登录令牌（演示模式旁路不可删除审计记录）',
    });
    return;
  }
  next();
};

// 删除日志（仅管理员）
// 2026-09-19 修复：原代码只有注释写了"仅管理员"，实际无任何校验 ——
// 任何登录用户都能删任意审计记录，审计本身形同虚设。现在真正做角色校验。
router.delete(
  '/:id',
  requireRealToken,
  permissionGuard(['super_admin', 'admin', 'base_admin']),
  (req: Request, res: Response) => {
    try {
      const db = getDatabase();
      const { id } = req.params;

      db.run('DELETE FROM operation_logs WHERE id = ?', [id]);

      saveDatabase();
      res.json({ success: true, message: '日志已删除' });
    } catch (error) {
      console.error('删除日志失败:', error);
      res.status(500).json({ success: false, error: '删除日志失败' });
    }
  }
);

export default router;
