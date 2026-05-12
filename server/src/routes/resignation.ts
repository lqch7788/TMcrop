/**
 * 离职记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 状态值映射
const STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待审批',
  'approved': '已通过',
  'rejected': '已拒绝',
  'cancelled': '已取消',
};

/**
 * 获取离职记录列表
 * GET /api/resignation
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { worker_name, resignation_type, status, start_date, end_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM resignation_records WHERE 1=1';
    const params: any[] = [];

    if (worker_name) {
      sql += ' AND worker_name LIKE ?';
      params.push(`%${worker_name}%`);
    }

    if (resignation_type) {
      sql += ' AND resignation_type = ?';
      params.push(resignation_type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (start_date) {
      sql += ' AND create_time >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND create_time <= ?';
      params.push(end_date);
    }

    const countSql = sql;
    const total = execCount(db, countSql, params);

    sql += ' ORDER BY create_time DESC';

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);

    // 添加状态标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: STATUS_LABEL_MAP[item.status] || item.status,
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取离职记录失败' });
  }
});

/**
 * 获取单个离职记录
 * GET /api/resignation/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM resignation_records WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '离职记录不存在' });
    }

    item.statusLabel = STATUS_LABEL_MAP[item.status] || item.status;

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取离职记录详情失败' });
  }
});

/**
 * 创建离职记录
 * POST /api/resignation
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, resignation_code, worker_id, worker_name, department, position,
      resignation_type, reason, expected_last_day, handover_user_id,
      handover_user_name, handover_note, remarks
    } = req.body;

    const newId = id || `RSG${Date.now()}`;
    const code = resignation_code || `LZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO resignation_records (
        id, resignation_code, worker_id, worker_name, department, position,
        resignation_type, reason, expected_last_day, handover_user_id,
        handover_user_name, handover_note, status, status_label, remarks,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, code, worker_id, worker_name, department, position,
      resignation_type || '主动离职', reason || '', expected_last_day || '',
      handover_user_id || '', handover_user_name || '', handover_note || '',
      'pending', '待审批', remarks || '',
      now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, resignation_code: code } });
  } catch (error) {
    console.error('创建离职记录失败:', error);
    res.status(500).json({ success: false, error: '创建离职记录失败' });
  }
});

/**
 * 更新离职记录
 * PUT /api/resignation/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    // 构建更新字段
    const allowedFields = [
      'resignation_type', 'reason', 'expected_last_day', 'actual_last_day',
      'handover_user_id', 'handover_user_name', 'handover_note',
      'status', 'status_label', 'approver', 'approve_time', 'remarks'
    ];

    const fields: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        // 状态更新时同步标签
        if (field === 'status' && updates[field]) {
          fields.push('status_label = ?');
          values.push(STATUS_LABEL_MAP[updates[field]] || updates[field]);
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

    db.run(`UPDATE resignation_records SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新离职记录失败' });
  }
});

/**
 * 删除离职记录
 * DELETE /api/resignation/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM resignation_records WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除离职记录失败' });
  }
});

/**
 * 离职操作（标记员工离职）
 * POST /api/resignation/:id/leave
 */
router.post('/:id/leave', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actual_last_day, remarks } = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    // 更新离职记录状态
    db.run(`
      UPDATE resignation_records
      SET status = 'approved', status_label = '已通过',
          actual_last_day = ?, remarks = ?, update_time = ?
      WHERE id = ?
    `, [actual_last_day || '', remarks || '', now, id]);

    // TODO: 同时更新员工状态为离职
    // 这里可以添加调用 labor/workers 接口标记员工离职

    saveDatabase();
    res.json({ success: true, message: '离职操作成功' });
  } catch (error) {
    console.error('离职操作失败:', error);
    res.status(500).json({ success: false, error: '离职操作失败' });
  }
});

export default router;
