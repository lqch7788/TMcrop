/**
 * 催办记录 API 路由
 * 2026-06-04 新增：V2.1 铁律改造（useReminder 从 localStorage 迁到后端）
 *
 * 数据流：客户端 useReminderStore → enhancedApiClient → /api/reminders → SQLite
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

// 字段映射
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  taskId: 'task_id',
  taskCode: 'task_code',
  taskTitle: 'task_title',
  operatorId: 'operator_id',
  operatorName: 'operator_name',
  reminderType: 'reminder_type',
  urgency: 'urgency',
  message: 'message',
  status: 'status',
  createTime: 'create_time',
  completeTime: 'complete_time',
};

function normalize(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
    result[jsKey] = row[dbKey] ?? null;
  }
  return result;
}

function denormalize(data: Record<string, unknown>): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {};
  for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (data[jsKey] === undefined) continue;
    const v = data[jsKey];
    if (v === null) result[dbKey] = null;
    else result[dbKey] = v as string | number;
  }
  return result;
}

// 列表
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { status, taskId } = req.query;
    let sql = 'SELECT * FROM reminders WHERE 1=1';
    const bindings: (string | number)[] = [];
    if (status) { sql += ' AND status = ?'; bindings.push(status as string); }
    if (taskId) { sql += ' AND task_id = ?'; bindings.push(taskId as string); }
    sql += ' ORDER BY create_time DESC';
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const rows: unknown[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ success: true, data: rows.map(r => normalize(r as Record<string, unknown>)) });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 创建
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const data = denormalize(req.body);
    const id = data.id || `rem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO reminders (id, task_id, task_code, task_title, operator_id, operator_name,
         reminder_type, urgency, message, status, create_time, complete_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.task_id, data.task_code, data.task_title, data.operator_id, data.operator_name,
        data.reminder_type || 'urge', data.urgency || 'normal', data.message || '',
        data.status || 'pending', now, null,
      ],
    );
    const stmt = db.prepare('SELECT * FROM reminders WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const created = normalize(stmt.getAsObject());
      stmt.free();
      return res.status(201).json({ success: true, data: created });
    }
    stmt.free();
    res.status(500).json({ success: false, error: '创建后查询失败' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 更新
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const data = denormalize(req.body);
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
      if (data[jsKey] !== undefined && dbKey !== 'id') {
        fields.push(`${dbKey} = ?`);
        values.push(data[jsKey]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    values.push(req.params.id);
    db.run(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`, values);
    const stmt = db.prepare('SELECT * FROM reminders WHERE id = ?');
    stmt.bind([req.params.id]);
    if (stmt.step()) {
      const updated = normalize(stmt.getAsObject());
      stmt.free();
      return res.json({ success: true, data: updated });
    }
    stmt.free();
    res.status(404).json({ success: false, error: '记录不存在' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 删除
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM reminders WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
