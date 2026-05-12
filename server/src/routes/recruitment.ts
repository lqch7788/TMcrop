/**
 * 招聘记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 状态和优先级标签映射
const STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待审批',
  'approved': '已通过',
  'rejected': '已拒绝',
  'cancelled': '已取消',
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  'low': '低',
  'normal': '普通',
  'high': '高',
  'urgent': '紧急',
};

/**
 * 获取招聘记录列表
 * GET /api/recruitment
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { recruitment_code, dept_id, position, status, priority, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM recruitment_records WHERE 1=1';
    const params: any[] = [];

    if (recruitment_code) {
      sql += ' AND recruitment_code LIKE ?';
      params.push(`%${recruitment_code}%`);
    }

    if (dept_id) {
      sql += ' AND dept_id = ?';
      params.push(dept_id);
    }

    if (position) {
      sql += ' AND position LIKE ?';
      params.push(`%${position}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority);
    }

    const countSql = sql;
    const total = execCount(db, countSql, params);

    sql += ' ORDER BY create_time DESC';

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);

    // 添加标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: STATUS_LABEL_MAP[item.status] || item.status,
      priorityLabel: PRIORITY_LABEL_MAP[item.priority] || item.priority,
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取招聘记录失败' });
  }
});

/**
 * 获取单个招聘记录
 * GET /api/recruitment/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM recruitment_records WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '招聘记录不存在' });
    }

    item.statusLabel = STATUS_LABEL_MAP[item.status] || item.status;
    item.priorityLabel = PRIORITY_LABEL_MAP[item.priority] || item.priority;

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取招聘记录详情失败' });
  }
});

/**
 * 创建招聘记录
 * POST /api/recruitment
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, recruitment_code, dept_id, dept_name, position_id, position,
      headcount, employment_type, salary_min, salary_max, priority,
      reason, remarks, applicant_id, applicant_name, apply_date
    } = req.body;

    const newId = id || `REC${Date.now()}`;
    const code = recruitment_code || `ZP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO recruitment_records (
        id, recruitment_code, dept_id, dept_name, position_id, position,
        headcount, employment_type, salary_min, salary_max, priority, priority_label,
        status, status_label, reason, remarks, applicant_id, applicant_name,
        apply_date, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, code, dept_id, dept_name, position_id, position,
      headcount || 1, employment_type || '正式工', salary_min || 0, salary_max || 0,
      priority || 'normal', PRIORITY_LABEL_MAP[priority] || '普通',
      'pending', '待审批', reason || '', remarks || '',
      applicant_id || '', applicant_name || '',
      apply_date || now.slice(0, 10), now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, recruitment_code: code } });
  } catch (error) {
    console.error('创建招聘记录失败:', error);
    res.status(500).json({ success: false, error: '创建招聘记录失败' });
  }
});

/**
 * 更新招聘记录
 * PUT /api/recruitment/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    const allowedFields = [
      'dept_id', 'dept_name', 'position_id', 'position',
      'headcount', 'employment_type', 'salary_min', 'salary_max',
      'priority', 'reason', 'remarks', 'status'
    ];

    const fields: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'status') {
          fields.push('status_label = ?');
          values.push(STATUS_LABEL_MAP[updates[field]] || updates[field]);
        } else if (field === 'priority') {
          fields.push('priority_label = ?');
          values.push(PRIORITY_LABEL_MAP[updates[field]] || updates[field]);
        }
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    fields.push('update_time = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE recruitment_records SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新招聘记录失败' });
  }
});

/**
 * 删除招聘记录
 * DELETE /api/recruitment/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM recruitment_records WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除招聘记录失败' });
  }
});

export default router;
