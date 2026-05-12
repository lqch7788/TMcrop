/**
 * 合同续签记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 状态标签映射
const STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待审批',
  'approved': '已通过',
  'rejected': '已拒绝',
  'cancelled': '已取消',
};

/**
 * 获取合同续签记录列表
 * GET /api/contract-renewal
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { employee_name, department, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM contract_renewal_records WHERE 1=1';
    const params: any[] = [];

    if (employee_name) {
      sql += ' AND employee_name LIKE ?';
      params.push(`%${employee_name}%`);
    }

    if (department) {
      sql += ' AND department LIKE ?';
      params.push(`%${department}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const countSql = sql;
    const total = execCount(db, countSql, params);

    sql += ' ORDER BY create_time DESC';

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);

    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: STATUS_LABEL_MAP[item.status] || item.status,
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取合同续签记录失败' });
  }
});

/**
 * 获取单个合同续签记录
 * GET /api/contract-renewal/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM contract_renewal_records WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '合同续签记录不存在' });
    }

    item.statusLabel = STATUS_LABEL_MAP[item.status] || item.status;

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取合同续签记录详情失败' });
  }
});

/**
 * 创建合同续签记录
 * POST /api/contract-renewal
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, employee_id, employee_name, department, position,
      current_contract_end, new_contract_start, new_contract_end,
      renewal_period, new_salary, terms_change, remarks
    } = req.body;

    const newId = id || `CR${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO contract_renewal_records (
        id, employee_id, employee_name, department, position,
        current_contract_end, new_contract_start, new_contract_end,
        renewal_period, new_salary, terms_change, status, status_label,
        remarks, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, employee_id, employee_name, department, position,
      current_contract_end || '', new_contract_start || '', new_contract_end || '',
      renewal_period || 12, new_salary || 0, terms_change || '',
      'pending', '待审批', remarks || '', now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建合同续签记录失败:', error);
    res.status(500).json({ success: false, error: '创建合同续签记录失败' });
  }
});

/**
 * 更新合同续签记录
 * PUT /api/contract-renewal/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    const allowedFields = [
      'new_contract_start', 'new_contract_end', 'renewal_period',
      'new_salary', 'terms_change', 'status', 'remarks'
    ];

    const fields: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'status') {
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

    values.push(id);

    db.run(`UPDATE contract_renewal_records SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新合同续签记录失败' });
  }
});

/**
 * 删除合同续签记录
 * DELETE /api/contract-renewal/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM contract_renewal_records WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除合同续签记录失败' });
  }
});

export default router;
