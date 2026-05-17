/**
 * 临时任务 API 路由
 * 提供临时任务的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 生成临时任务编码
 */
function generateTempTaskCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `TT${year}${month}${day}${seq}`;
}

/**
 * 获取临时任务列表
 * GET /api/temp-tasks
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { task_type, status, assignee_name, greenhouse_name, priority, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM temp_tasks WHERE 1=1';
    const params: (string | number)[] = [];

    if (task_type) {
      sql += ' AND task_type LIKE ?';
      params.push(`%${task_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (assignee_name) {
      sql += ' AND assignee_name LIKE ?';
      params.push(`%${assignee_name}%`);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority as string);
    }

    const countSql = sql;
    sql += ' ORDER BY request_date DESC, request_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取临时任务列表失败:', error);
    res.status(500).json({ success: false, error: '获取临时任务列表失败' });
  }
});

/**
 * 获取单个临时任务详情
 * GET /api/temp-tasks/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取临时任务详情失败:', error);
    res.status(500).json({ success: false, error: '获取临时任务详情失败' });
  }
});

/**
 * 创建临时任务
 * POST /api/temp-tasks
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, task_code, task_title, task_type, task_content,
      requester_id, requester_name, assignee_id, assignee_name,
      greenhouse_id, greenhouse_name, area_name,
      request_date, request_time, priority, status,
      completion_date, completion_note, remarks, create_by,
      // 新增字段
      due_date, urgency, estimated_hours, estimated_days,
      worker_count, actual_hours, progress, reject_count,
      reject_reason, acceptance_remarks, title, location,
    } = req.body;

    const newId = id || `TT${Date.now()}`;
    const now = new Date().toISOString();
    const taskCode = task_code || generateTempTaskCode();

    const db = getDatabase();
    db.run(`
      INSERT INTO temp_tasks (
        id, task_code, task_title, task_type, task_content,
        requester_id, requester_name, assignee_id, assignee_name,
        greenhouse_id, greenhouse_name, area_name,
        request_date, request_time, priority, status,
        completion_date, completion_note, remarks, create_by,
        create_time, update_time, due_date, urgency,
        estimated_hours, estimated_days, worker_count,
        actual_hours, progress, reject_count, reject_reason,
        acceptance_remarks, title, location
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, taskCode, task_title, task_type, task_content,
      requester_id, requester_name, assignee_id, assignee_name,
      greenhouse_id, greenhouse_name, area_name,
      request_date || now.substring(0, 10),
      request_time || now.substring(11, 19),
      priority || 'medium', status || 'pending',
      completion_date, completion_note, remarks, create_by,
      now, now,
      due_date, urgency || 'normal',
      estimated_hours ?? 0, estimated_days ?? 0, worker_count ?? 1,
      actual_hours ?? 0, progress ?? 0, reject_count ?? 0,
      reject_reason, acceptance_remarks,
      title || task_title, location || area_name,
    ]);

    saveDatabase();

    // 读取完整记录返回
    const created = queryToObjects(db, `SELECT * FROM temp_tasks WHERE id = ?`, [newId]);
    const data = created.length > 0 ? created[0] : { id: newId, task_code: taskCode };
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('创建临时任务失败:', error);
    res.status(500).json({ success: false, error: '创建临时任务失败' });
  }
});

/**
 * 更新临时任务
 * PUT /api/temp-tasks/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 过滤掉 id 和自动生成的字段
    const excludeFields = ['id', 'task_code', 'create_time'];
    const fields = Object.keys(updates)
      .filter(k => !excludeFields.includes(k))
      .map(k => `${k} = ?`)
      .join(', ');

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates)
      .filter(k => !excludeFields.includes(k))
      .map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE temp_tasks SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新临时任务失败:', error);
    res.status(500).json({ success: false, error: '更新临时任务失败' });
  }
});

/**
 * 删除临时任务
 * DELETE /api/temp-tasks/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查任务是否存在
    const stmt = db.prepare('SELECT status FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: Record<string, unknown> | null = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    db.run('DELETE FROM temp_tasks WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除临时任务失败:', error);
    res.status(500).json({ success: false, error: '删除临时任务失败' });
  }
});

export default router;
