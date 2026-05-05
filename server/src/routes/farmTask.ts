/**
 * 农事任务 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 任务状态值标准化映射（中文 -> 英文）
const TASK_STATUS_MAP: Record<string, string> = {
  '待处理': 'pending',
  '处理中': 'in_progress',
  '已完成': 'completed',
  'pending': 'pending',
  'in_progress': 'in_progress',
  'completed': 'completed',
};

// 英文状态值到中文的映射
const TASK_STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待处理',
  'in_progress': '进行中',
  'completed': '已完成',
};

/**
 * 标准化任务状态值（将中文转换为英文）
 */
function normalizeTaskStatus(status?: string): string {
  if (!status) return 'pending';
  return TASK_STATUS_MAP[status] || status;
}

/**
 * 获取状态显示标签
 */
function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABEL_MAP[status] || status;
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { task_type, status, assignee_name, greenhouse_name, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM farm_tasks WHERE 1=1';
    const params: any[] = [];

    if (task_type) {
      sql += ' AND task_type LIKE ?';
      params.push(`%${task_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (assignee_name) {
      sql += ' AND assignee_name LIKE ?';
      params.push(`%${assignee_name}%`);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // 保存原始SQL用于count查询
    const countSql = sql;

    sql += ' ORDER BY plan_date DESC, plan_time DESC';

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
      statusLabel: getTaskStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取农事任务失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    // 添加状态标签
    item.statusLabel = getTaskStatusLabel(item.status || 'pending');

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取农事任务详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, task_code, task_title, task_type, task_content, assignee_id, assignee_name,
            greenhouse_id, greenhouse_name, area_name, plan_date, plan_time, priority, status, create_by } = req.body;

    const newId = id || `TK${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO farm_tasks (id, task_code, task_title, task_type, task_content, assignee_id, assignee_name,
        greenhouse_id, greenhouse_name, area_name, plan_date, plan_time, priority, status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, task_code, task_title, task_type, task_content, assignee_id, assignee_name,
        greenhouse_id, greenhouse_name, area_name, plan_date, plan_time, priority || 'medium', normalizeTaskStatus(status), create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建农事任务失败:', error);
    res.status(500).json({ success: false, error: '创建农事任务失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 对 status 字段进行标准化转换
    if (updates.status) {
      updates.status = normalizeTaskStatus(updates.status);
    }

    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE farm_tasks SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新农事任务失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM farm_tasks WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除农事任务失败' });
  }
});

export default router;
