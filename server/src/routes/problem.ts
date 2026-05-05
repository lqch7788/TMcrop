/**
 * 问题记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 问题状态值标准化映射（中文 -> 英文）
const PROBLEM_STATUS_MAP: Record<string, string> = {
  '待处理': 'pending',
  '处理中': 'in_progress',
  '已处理': 'completed',
  'pending': 'pending',
  'in_progress': 'in_progress',
  'completed': 'completed',
};

// 英文状态值到中文的映射
const PROBLEM_STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待处理',
  'in_progress': '处理中',
  'completed': '已处理',
};

/**
 * 标准化问题状态值（将中文转换为英文）
 */
function normalizeProblemStatus(status?: string): string {
  if (!status) return 'pending';
  return PROBLEM_STATUS_MAP[status] || status;
}

/**
 * 获取状态显示标签
 */
function getStatusLabel(status: string): string {
  return PROBLEM_STATUS_LABEL_MAP[status] || status;
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { problem_type, status, priority, greenhouse_name, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM problems WHERE 1=1';
    const params: any[] = [];

    if (problem_type) {
      sql += ' AND problem_type LIKE ?';
      params.push(`%${problem_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // 保存原始SQL用于count查询
    const countSql = sql;

    sql += ' ORDER BY create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    // 为每个item添加状态标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: getStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取问题记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM problems WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '问题记录不存在' });
    }

    // 添加状态标签
    item.statusLabel = getStatusLabel(item.status || 'pending');

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取问题详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, problem_code, problem_type, title, description, greenhouse_name,
            reporter_id, reporter_name, assignee_id, assignee_name, priority, status } = req.body;

    const newId = id || `PRB${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO problems (id, problem_code, problem_type, title, description, greenhouse_name,
        reporter_id, reporter_name, assignee_id, assignee_name, priority, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, problem_code, problem_type, title, description, greenhouse_name,
        reporter_id, reporter_name, assignee_id, assignee_name, priority || 'medium', normalizeProblemStatus(status), now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建问题记录失败:', error);
    res.status(500).json({ success: false, error: '创建问题记录失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 对 status 字段进行标准化转换
    if (updates.status) {
      updates.status = normalizeProblemStatus(updates.status);
    }

    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE problems SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新问题记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM problems WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除问题记录失败' });
  }
});

/**
 * 获取每日问题汇总统计
 * GET /api/problems/daily-summary
 * 根据日期范围和温室分组统计问题数量
 */
router.get('/daily-summary', (req: Request, res: Response) => {
  try {
    const { start_date, end_date, greenhouse_name, group_by = 'date' } = req.query;
    const db = getDatabase();

    let sql: string;
    let params: any[] = [];

    if (group_by === 'greenhouse') {
      // 按温室分组
      sql = `
        SELECT
          greenhouse_name as name,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority
        FROM problems
        WHERE 1=1
      `;
    } else if (group_by === 'status') {
      // 按状态分组
      sql = `
        SELECT
          status as name,
          COUNT(*) as count,
          greenhouse_name as greenhouse
        FROM problems
        WHERE 1=1
      `;
    } else if (group_by === 'priority') {
      // 按优先级分组
      sql = `
        SELECT
          priority as name,
          COUNT(*) as count,
          greenhouse_name as greenhouse
        FROM problems
        WHERE 1=1
      `;
    } else {
      // 按日期分组（默认）
      sql = `
        SELECT
          strftime('%Y-%m-%d', create_time) as date,
          strftime('%Y-%m', create_time) as month,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority
        FROM problems
        WHERE 1=1
      `;
    }

    // 添加过滤条件
    if (start_date) {
      sql += ' AND create_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND create_time <= ?';
      params.push(end_date + ' 23:59:59');
    }
    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // 添加分组和排序
    if (group_by === 'greenhouse') {
      sql += ' GROUP BY greenhouse_name ORDER BY total DESC';
    } else if (group_by === 'status') {
      sql += ' GROUP BY status, greenhouse_name ORDER BY status';
    } else if (group_by === 'priority') {
      sql += ' GROUP BY priority, greenhouse_name ORDER BY priority';
    } else {
      sql += ' GROUP BY strftime("%Y-%m-%d", create_time) ORDER BY date DESC';
    }

    const items = queryToObjects(db, sql, params);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取问题汇总统计失败:', error);
    res.status(500).json({ success: false, error: '获取问题汇总统计失败' });
  }
});

/**
 * 获取问题统计概览（供生产汇总表使用）
 * GET /api/problems/summary-overview
 */
router.get('/summary-overview', (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const db = getDatabase();

    let whereClause = '1=1';
    const params: any[] = [];

    if (start_date) {
      whereClause += ' AND create_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND create_time <= ?';
      params.push(end_date + ' 23:59:59');
    }

    // 总问题数
    const totalSql = `SELECT COUNT(*) as total FROM problems WHERE ${whereClause}`;
    const totalResult = queryToObjects(db, totalSql, params);

    // 待处理问题数
    const pendingSql = `SELECT COUNT(*) as pending FROM problems WHERE status = 'pending' AND ${whereClause}`;
    const pendingResult = queryToObjects(db, pendingSql, params);

    // 进行中问题数
    const inProgressSql = `SELECT COUNT(*) as in_progress FROM problems WHERE status = 'in_progress' AND ${whereClause}`;
    const inProgressResult = queryToObjects(db, inProgressSql, params);

    // 已处理问题数
    const resolvedSql = `SELECT COUNT(*) as resolved FROM problems WHERE status = 'completed' AND ${whereClause}`;
    const resolvedResult = queryToObjects(db, resolvedSql, params);

    // 严重问题数
    const highPrioritySql = `SELECT COUNT(*) as high_priority FROM problems WHERE priority = 'high' AND ${whereClause}`;
    const highPriorityResult = queryToObjects(db, highPrioritySql, params);

    // 本月新增问题数
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();
    const monthSql = `SELECT COUNT(*) as month_new FROM problems WHERE create_time >= ?`;
    const monthResult = queryToObjects(db, monthSql, [monthStartStr]);

    // 环比增长率（与上月同期相比）
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart);
    lastMonthEnd.setDate(0); // 上月最后一天
    lastMonthEnd.setHours(23, 59, 59, 999);

    const currentPeriodSql = `SELECT COUNT(*) as count FROM problems WHERE ${whereClause}`;
    const currentPeriodResult = queryToObjects(db, currentPeriodSql, params);

    const lastMonthSql = `SELECT COUNT(*) as count FROM problems WHERE create_time >= ? AND create_time <= ?`;
    const lastMonthResult = queryToObjects(db, lastMonthSql, [lastMonthStart.toISOString(), lastMonthEnd.toISOString()]);

    const currentCount = currentPeriodResult[0]?.count || 0;
    const lastMonthCount = lastMonthResult[0]?.count || 0;
    let trend = 0;
    if (lastMonthCount > 0) {
      trend = Math.round(((currentCount - lastMonthCount) / lastMonthCount) * 100);
    }

    const data = {
      total: totalResult[0]?.total || 0,
      pending: pendingResult[0]?.pending || 0,
      in_progress: inProgressResult[0]?.in_progress || 0,
      resolved: resolvedResult[0]?.resolved || 0,
      high_priority: highPriorityResult[0]?.high_priority || 0,
      month_new: monthResult[0]?.month_new || 0,
      trend: trend,
      resolution_rate: totalResult[0]?.total > 0
        ? Math.round((resolvedResult[0]?.resolved / totalResult[0]?.total) * 100)
        : 0
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取问题统计概览失败:', error);
    res.status(500).json({ success: false, error: '获取问题统计概览失败' });
  }
});

export default router;
