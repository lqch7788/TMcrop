/**
 * 请假记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 请假类型值标准化映射（中文 -> 英文）
const LEAVE_TYPE_MAP: Record<string, string> = {
  '年假': 'annual',
  '病假': 'sick',
  '事假': 'personal',
  '婚假': 'marriage',
  '产假': 'maternity',
  '陪产假': 'paternity',
  '丧假': 'bereavement',
  '工伤假': 'work_injury',
  'annual': 'annual',
  'sick': 'sick',
  'personal': 'personal',
  'marriage': 'marriage',
  'maternity': 'maternity',
  'paternity': 'paternity',
  'bereavement': 'bereavement',
  'work_injury': 'work_injury',
};

// 英文类型值到中文的映射
const LEAVE_TYPE_LABEL_MAP: Record<string, string> = {
  'annual': '年假',
  'sick': '病假',
  'personal': '事假',
  'marriage': '婚假',
  'maternity': '产假',
  'paternity': '陪产假',
  'bereavement': '丧假',
  'work_injury': '工伤假',
};

// 请假状态值标准化映射（中文 -> 英文）
const LEAVE_STATUS_MAP: Record<string, string> = {
  '待审批': 'pending',
  '已通过': 'approved',
  '已拒绝': 'rejected',
  '已取消': 'cancelled',
  '已撤回': 'withdrawn',
  'pending': 'pending',
  'approved': 'approved',
  'rejected': 'rejected',
  'cancelled': 'cancelled',
  'withdrawn': 'withdrawn',
};

// 英文状态值到中文的映射
const LEAVE_STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待审批',
  'approved': '已通过',
  'rejected': '已拒绝',
  'cancelled': '已取消',
  'withdrawn': '已撤回',
};

/**
 * 标准化请假类型值（将中文转换为英文）
 */
function normalizeLeaveType(leaveType?: string): string {
  if (!leaveType) return 'personal';
  return LEAVE_TYPE_MAP[leaveType] || leaveType;
}

/**
 * 标准化请假状态值（将中文转换为英文）
 */
function normalizeLeaveStatus(status?: string): string {
  if (!status) return 'pending';
  return LEAVE_STATUS_MAP[status] || status;
}

/**
 * 获取请假类型显示标签
 */
function getLeaveTypeLabel(leaveType: string): string {
  return LEAVE_TYPE_LABEL_MAP[leaveType] || leaveType;
}

/**
 * 获取请假状态显示标签
 */
function getLeaveStatusLabel(status: string): string {
  return LEAVE_STATUS_LABEL_MAP[status] || status;
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { worker_name, leave_type, status, start_date, end_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM leave_records WHERE 1=1';
    const params: any[] = [];

    if (worker_name) {
      sql += ' AND worker_name LIKE ?';
      params.push(`%${worker_name}%`);
    }

    if (leave_type) {
      sql += ' AND leave_type = ?';
      params.push(normalizeLeaveType(leave_type as string));
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(normalizeLeaveStatus(status as string));
    }

    if (start_date) {
      sql += ' AND start_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND end_date <= ?';
      params.push(end_date);
    }

    // 保存原始SQL用于count查询
    const countSql = sql;

    sql += ' ORDER BY start_date DESC, create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    // 为每个item添加状态标签和类型标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      leaveTypeLabel: getLeaveTypeLabel(item.leave_type || 'personal'),
      statusLabel: getLeaveStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取请假记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM leave_records WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '请假记录不存在' });
    }

    // 添加标签
    item.leaveTypeLabel = getLeaveTypeLabel(item.leave_type || 'personal');
    item.statusLabel = getLeaveStatusLabel(item.status || 'pending');

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取请假记录详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, worker_id, worker_name, leave_type, start_date, end_date, days,
      reason, status, department_id, department_name, remarks
    } = req.body;

    const newId = id || `LV${Date.now()}`;
    const now = new Date().toISOString();
    const normalizedType = normalizeLeaveType(leave_type);
    const normalizedStatus = normalizeLeaveStatus(status);

    const db = getDatabase();
    db.run(`
      INSERT INTO leave_records (
        id, worker_id, worker_name, leave_type, start_date, end_date, days,
        reason, status, department_id, department_name, remarks,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, worker_id || null, worker_name || null, normalizedType, start_date || null, end_date || null, days || 0,
      reason || '', normalizedStatus, department_id || null, department_name || null, remarks || '',
      now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建请假记录失败:', error);
    res.status(500).json({ success: false, error: '创建请假记录失败', detail: String(error) });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 对 type 和 status 字段进行标准化转换
    if (updates.leave_type) {
      updates.leave_type = normalizeLeaveType(updates.leave_type);
    }
    if (updates.status) {
      updates.status = normalizeLeaveStatus(updates.status);
    }

    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE leave_records SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新请假记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM leave_records WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除请假记录失败' });
  }
});

// ============================================
// 请假额度管理
// ============================================

/**
 * 获取员工请假额度列表
 * GET /api/leave/quotas?worker_id=xxx&year=2026
 */
router.get('/quotas/list', (req: Request, res: Response) => {
  try {
    const { worker_id, year } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM leave_quotas WHERE 1=1';
    const params: any[] = [];

    if (worker_id) {
      sql += ' AND worker_id = ?';
      params.push(worker_id);
    }

    if (year) {
      sql += ' AND year = ?';
      params.push(Number(year));
    }

    sql += ' ORDER BY worker_id, year, leave_category';

    const items = queryToObjects(db, sql, params);

    // 转换类型标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      leaveTypeLabel: getLeaveTypeLabel(item.leave_category || 'annual'),
    }));

    res.json({ success: true, data: itemsWithLabels });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取请假额度失败' });
  }
});

/**
 * 获取员工指定年份的请假额度汇总
 * GET /api/leave/quotas/summary?worker_id=xxx&year=2026
 */
router.get('/quotas/summary', (req: Request, res: Response) => {
  try {
    const { worker_id, year } = req.query;
    const db = getDatabase();

    if (!worker_id || !year) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const sql = 'SELECT * FROM leave_quotas WHERE worker_id = ? AND year = ?';
    const items = queryToObjects(db, sql, [worker_id, Number(year)]);

    // 按类型汇总
    const summary: Record<string, any> = {};
    for (const item of items) {
      const category = item.leave_category || 'annual';
      summary[category] = {
        total: item.total_days || 0,
        used: item.used_days || 0,
        frozen: item.frozen_days || 0,
        remaining: item.remaining_days || 0,
      };
    }

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取请假额度汇总失败' });
  }
});

/**
 * 创建或更新员工请假额度
 * POST /api/leave/quotas
 */
router.post('/quotas', (req: Request, res: Response) => {
  try {
    const {
      id, worker_id, worker_name, year, leave_category, total_days,
      department_id, department_name, remarks
    } = req.body;

    if (!worker_id || !year || !leave_category) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const now = new Date().toISOString();
    const normalizedCategory = normalizeLeaveType(leave_category);

    // 计算剩余天数
    const remaining_days = (total_days || 0) - (req.body.used_days || 0) - (req.body.frozen_days || 0);

    const db = getDatabase();

    // 检查是否已存在
    const checkStmt = db.prepare(
      'SELECT id FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?'
    );
    checkStmt.bind([worker_id, Number(year), normalizedCategory]);

    if (checkStmt.step()) {
      // 更新现有记录
      checkStmt.free();
      db.run(`
        UPDATE leave_quotas SET
          worker_name = ?, total_days = ?, remaining_days = ?,
          department_id = ?, department_name = ?, remarks = ?, update_time = ?
        WHERE worker_id = ? AND year = ? AND leave_category = ?
      `, [
        worker_name, total_days || 0, remaining_days,
        department_id, department_name, remarks || '', now,
        worker_id, Number(year), normalizedCategory
      ]);
    } else {
      // 创建新记录
      checkStmt.free();
      const newId = id || `LQ${Date.now()}`;
      db.run(`
        INSERT INTO leave_quotas (
          id, worker_id, worker_name, year, leave_category, total_days, used_days, frozen_days, remaining_days,
          department_id, department_name, remarks, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId, worker_id, worker_name, Number(year), normalizedCategory,
        total_days || 0, 0, 0, remaining_days,
        department_id, department_name, remarks || '', now, now
      ]);
    }

    saveDatabase();
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('保存请假额度失败:', error);
    res.status(500).json({ success: false, error: '保存请假额度失败' });
  }
});

/**
 * 冻结请假额度（申请请假时调用）
 * POST /api/leave/quotas/freeze
 */
router.post('/quotas/freeze', (req: Request, res: Response) => {
  try {
    const { worker_id, leave_type, days, year } = req.body;

    if (!worker_id || !leave_type || days === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const now = new Date().toISOString();
    const normalizedCategory = normalizeLeaveType(leave_type);
    const targetYear = year || new Date().getFullYear();

    const db = getDatabase();

    // 检查并更新额度
    const checkStmt = db.prepare(
      'SELECT * FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?'
    );
    checkStmt.bind([worker_id, targetYear, normalizedCategory]);

    if (checkStmt.step()) {
      const quota = checkStmt.getAsObject();
      checkStmt.free();

      const frozenDays = Number(quota.frozen_days || 0);
      const totalDays = Number(quota.total_days || 0);
      const usedDays = Number(quota.used_days || 0);
      const newFrozenDays = frozenDays + Number(days);
      const newRemainingDays = totalDays - usedDays - newFrozenDays;

      if (newRemainingDays < 0) {
        return res.status(400).json({ success: false, error: '请假额度不足' });
      }

      db.run(`
        UPDATE leave_quotas SET frozen_days = ?, remaining_days = ?, update_time = ?
        WHERE worker_id = ? AND year = ? AND leave_category = ?
      `, [newFrozenDays, newRemainingDays, now, worker_id, targetYear, normalizedCategory]);

      saveDatabase();
      res.json({ success: true, message: '额度冻结成功' });
    } else {
      checkStmt.free();
      res.status(404).json({ success: false, error: '请假额度记录不存在' });
    }
  } catch (error) {
    console.error('冻结请假额度失败:', error);
    res.status(500).json({ success: false, error: '冻结请假额度失败' });
  }
});

/**
 * 释放冻结的请假额度（审批拒绝或撤回时调用）
 * POST /api/leave/quotas/release
 */
router.post('/quotas/release', (req: Request, res: Response) => {
  try {
    const { worker_id, leave_type, days, year } = req.body;

    if (!worker_id || !leave_type || days === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const now = new Date().toISOString();
    const normalizedCategory = normalizeLeaveType(leave_type);
    const targetYear = year || new Date().getFullYear();

    const db = getDatabase();

    const checkStmt = db.prepare(
      'SELECT * FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?'
    );
    checkStmt.bind([worker_id, targetYear, normalizedCategory]);

    if (checkStmt.step()) {
      const quota = checkStmt.getAsObject();
      checkStmt.free();

      const frozenDays = Number(quota.frozen_days || 0);
      const totalDays = Number(quota.total_days || 0);
      const usedDays = Number(quota.used_days || 0);
      const newFrozenDays = Math.max(0, frozenDays - Number(days));
      const newRemainingDays = totalDays - usedDays - newFrozenDays;

      db.run(`
        UPDATE leave_quotas SET frozen_days = ?, remaining_days = ?, update_time = ?
        WHERE worker_id = ? AND year = ? AND leave_category = ?
      `, [newFrozenDays, newRemainingDays, now, worker_id, targetYear, normalizedCategory]);

      saveDatabase();
      res.json({ success: true, message: '额度释放成功' });
    } else {
      checkStmt.free();
      res.status(404).json({ success: false, error: '请假额度记录不存在' });
    }
  } catch (error) {
    console.error('释放请假额度失败:', error);
    res.status(500).json({ success: false, error: '释放请假额度失败' });
  }
});

/**
 * 扣减请假额度（审批通过时调用）
 * POST /api/leave/quotas/deduct
 */
router.post('/quotas/deduct', (req: Request, res: Response) => {
  try {
    const { worker_id, leave_type, days, year } = req.body;

    if (!worker_id || !leave_type || days === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const now = new Date().toISOString();
    const normalizedCategory = normalizeLeaveType(leave_type);
    const targetYear = year || new Date().getFullYear();

    const db = getDatabase();

    const checkStmt = db.prepare(
      'SELECT * FROM leave_quotas WHERE worker_id = ? AND year = ? AND leave_category = ?'
    );
    checkStmt.bind([worker_id, targetYear, normalizedCategory]);

    if (checkStmt.step()) {
      const quota = checkStmt.getAsObject();
      checkStmt.free();

      const frozenDays = Number(quota.frozen_days || 0);
      const totalDays = Number(quota.total_days || 0);
      const usedDays = Number(quota.used_days || 0);
      const newUsedDays = usedDays + Number(days);
      const newFrozenDays = Math.max(0, frozenDays - Number(days));
      const newRemainingDays = totalDays - newUsedDays - newFrozenDays;

      if (newRemainingDays < 0) {
        return res.status(400).json({ success: false, error: '请假额度不足' });
      }

      db.run(`
        UPDATE leave_quotas SET used_days = ?, frozen_days = ?, remaining_days = ?, update_time = ?
        WHERE worker_id = ? AND year = ? AND leave_category = ?
      `, [newUsedDays, newFrozenDays, newRemainingDays, now, worker_id, targetYear, normalizedCategory]);

      saveDatabase();
      res.json({ success: true, message: '额度扣减成功' });
    } else {
      checkStmt.free();
      res.status(404).json({ success: false, error: '请假额度记录不存在' });
    }
  } catch (error) {
    console.error('扣减请假额度失败:', error);
    res.status(500).json({ success: false, error: '扣减请假额度失败' });
  }
});

export default router;
