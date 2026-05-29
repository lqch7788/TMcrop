/**
 * 工作日志 API 路由
 * V6.0 Phase 1: 从 LocalStorage 迁移到 SQLite
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

// 生成唯一ID
function generateId(): string {
  return `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 字段映射表 (snake_case DB -> camelCase JS)
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  code: 'code',
  date: 'date',
  worker: 'worker',
  weather: 'weather',
  temperature: 'temperature',
  crop: 'crop',
  greenhouse: 'greenhouse',
  growth_status: 'growthStatus',
  tasks: 'tasks',
  problems: 'problems',
  solutions: 'solutions',
  task_id: 'taskId',
  batch_id: 'batchId',
  batch_code: 'batchCode',
  task_code: 'taskCode',
  task_type: 'taskType',
  task_type_name: 'taskTypeName',
  progress: 'progress',
  workload_hours: 'workloadHours',
  workload_days: 'workloadDays',
  workers: 'workers',
  submit_time: 'submitTime',
  feedback_text: 'feedbackText',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

// 规范化数据库记录 -> 前端格式
function normalize(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dbKey, jsKey] of Object.entries(FIELD_MAP)) {
    if (dbKey !== jsKey) {
      result[jsKey] = row[dbKey] ?? null;
    } else {
      result[jsKey] = row[dbKey];
    }
  }
  return result;
}

// 反规范化前端数据 -> 数据库格式
function denormalize(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (data[jsKey] !== undefined) {
      result[dbKey] = data[jsKey];
    }
  }
  return result;
}

// 获取所有工作日志（支持分页、筛选）
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { date, worker, greenhouse, search, page = '1', limit = '50' } = req.query;

    let sql = 'SELECT * FROM work_logs WHERE 1=1';
    const bindings: (string | number)[] = [];

    if (date) {
      sql += ' AND date = ?';
      bindings.push(date as string);
    }

    if (worker) {
      sql += ' AND worker LIKE ?';
      bindings.push(`%${worker}%`);
    }

    if (greenhouse && greenhouse !== '全部') {
      sql += ' AND greenhouse = ?';
      bindings.push(greenhouse as string);
    }

    if (search) {
      sql += ' AND (code LIKE ? OR tasks LIKE ? OR problems LIKE ?)';
      bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY date DESC, created_at DESC';

    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM work_logs WHERE 1=1`;
    if (date) countSql += ' AND date = ?';
    if (worker) countSql += ' AND worker LIKE ?';
    if (greenhouse && greenhouse !== '全部') countSql += ' AND greenhouse = ?';
    if (search) countSql += ' AND (code LIKE ? OR tasks LIKE ? OR problems LIKE ?)';

    const countBindings: (string | number)[] = [];
    if (date) countBindings.push(date as string);
    if (worker) countBindings.push(`%${worker}%`);
    if (greenhouse && greenhouse !== '全部') countBindings.push(greenhouse as string);
    if (search) countBindings.push(`%${search}%`, `%${search}%`, `%${search}%`);

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
      logs.push(normalize(stmt.getAsObject()));
    }
    stmt.free();

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
    console.error('获取工作日志失败:', error);
    res.status(500).json({ success: false, error: '获取工作日志失败' });
  }
});

// 获取单个工作日志详情
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const stmt = db.prepare('SELECT * FROM work_logs WHERE id = ?');
    stmt.bind([id]);
    let log = null;
    if (stmt.step()) {
      log = normalize(stmt.getAsObject());
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

// 创建工作日志
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const data = req.body;

    // 生成新ID
    const id = generateId();
    const created_at = new Date().toISOString();

    // 提取字段并设置默认值
    const record = denormalize({
      id,
      code: data.code || `WL${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-3)}`,
      date: data.date || new Date().toISOString().split('T')[0],
      worker: data.worker || '',
      weather: data.weather || '晴',
      temperature: data.temperature || '25°C',
      crop: data.crop || '',
      greenhouse: data.greenhouse || '',
      growthStatus: data.growthStatus || '良好',
      tasks: data.tasks || '',
      problems: data.problems || '无',
      solutions: data.solutions || '-',
      taskId: data.taskId || null,
      batchId: data.batchId || null,
      batchCode: data.batchCode || null,
      taskCode: data.taskCode || null,
      taskType: data.taskType || null,
      taskTypeName: data.taskTypeName || null,
      progress: data.progress || null,
      workloadHours: data.workloadHours || null,
      workloadDays: data.workloadDays || null,
      workers: data.workers || null,
      submitTime: data.submitTime || null,
      feedbackText: data.feedbackText || null,
      createdAt: created_at,
      updatedAt: created_at,
    });

    const columns = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    const values = Object.values(record) as (string | number | null | undefined)[];

    db.run(`INSERT INTO work_logs (${columns}) VALUES (${placeholders})`, values as (string | number | null)[]);

    // 查询刚插入的记录并返回
    const stmt = db.prepare('SELECT * FROM work_logs WHERE id = ?');
    stmt.bind([id]);
    let newLog = null;
    if (stmt.step()) {
      newLog = normalize(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: newLog });
  } catch (error) {
    console.error('创建工作日志失败:', error);
    res.status(500).json({ success: false, error: '创建工作日志失败' });
  }
});

// 更新工作日志
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const data = req.body;

    // 先查询是否存在
    const checkStmt = db.prepare('SELECT id FROM work_logs WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (!exists) {
      return res.status(404).json({ success: false, error: '日志不存在' });
    }

    const record = denormalize({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    // 移除 id 和 created_at（不允许修改）
    delete record.id;
    delete record.created_at;

    const updates = Object.keys(record)
      .filter(key => record[key] !== undefined)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.keys(record)
      .filter(key => record[key] !== undefined)
      .map(key => record[key]) as (string | number | null | undefined)[];

    if (updates) {
      db.run(`UPDATE work_logs SET ${updates} WHERE id = ?`, [...values, id] as (string | number | null)[]);
    }

    // 查询更新后的记录并返回
    const stmt = db.prepare('SELECT * FROM work_logs WHERE id = ?');
    stmt.bind([id]);
    let updatedLog = null;
    if (stmt.step()) {
      updatedLog = normalize(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: updatedLog });
  } catch (error) {
    console.error('更新工作日志失败:', error);
    res.status(500).json({ success: false, error: '更新工作日志失败' });
  }
});

// 删除工作日志
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 先查询是否存在
    const checkStmt = db.prepare('SELECT id FROM work_logs WHERE id = ?');
    checkStmt.bind([id]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (!exists) {
      return res.status(404).json({ success: false, error: '日志不存在' });
    }

    db.run('DELETE FROM work_logs WHERE id = ?', [id]);

    res.json({ success: true, message: '日志已删除' });
  } catch (error) {
    console.error('删除工作日志失败:', error);
    res.status(500).json({ success: false, error: '删除工作日志失败' });
  }
});

export default router;
