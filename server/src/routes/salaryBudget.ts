/**
 * 工资预算记录 API 路由
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
 * 获取工资预算记录列表
 * GET /api/salary-budget
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { dept_id, budget_month, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM salary_budget_records WHERE 1=1';
    const params: any[] = [];

    if (dept_id) {
      sql += ' AND dept_id = ?';
      params.push(dept_id);
    }

    if (budget_month) {
      sql += ' AND budget_month LIKE ?';
      params.push(`%${budget_month}%`);
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
    res.status(500).json({ success: false, error: '获取工资预算记录失败' });
  }
});

/**
 * 获取单个工资预算记录
 * GET /api/salary-budget/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM salary_budget_records WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '工资预算记录不存在' });
    }

    item.statusLabel = STATUS_LABEL_MAP[item.status] || item.status;

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取工资预算记录详情失败' });
  }
});

/**
 * 创建工资预算记录
 * POST /api/salary-budget
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, budget_code, dept_id, dept_name, budget_month,
      total_base_salary, total_overtime_pay, total_bonus, remark,
      applicant_id, applicant_name
    } = req.body;

    const newId = id || `SB${Date.now()}`;
    const code = budget_code || `SB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const now = new Date().toISOString();

    const baseSalary = total_base_salary || 0;
    const overtimePay = total_overtime_pay || 0;
    const bonus = total_bonus || 0;
    const grandTotal = baseSalary + overtimePay + bonus;

    const db = getDatabase();
    db.run(`
      INSERT INTO salary_budget_records (
        id, budget_code, dept_id, dept_name, budget_month,
        total_base_salary, total_overtime_pay, total_bonus, grand_total,
        status, status_label, applicant_id, applicant_name, apply_date,
        remark, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, code, dept_id, dept_name, budget_month || now.slice(0, 7),
      baseSalary, overtimePay, bonus, grandTotal,
      'pending', '待审批', applicant_id || '', applicant_name || '',
      now.slice(0, 10), remark || '', now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, budget_code: code } });
  } catch (error) {
    console.error('创建工资预算记录失败:', error);
    res.status(500).json({ success: false, error: '创建工资预算记录失败' });
  }
});

/**
 * 更新工资预算记录
 * PUT /api/salary-budget/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    const allowedFields = [
      'dept_id', 'dept_name', 'budget_month',
      'total_base_salary', 'total_overtime_pay', 'total_bonus', 'remark', 'status'
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

    // 重新计算总计
    if (updates.total_base_salary !== undefined || updates.total_overtime_pay !== undefined || updates.total_bonus !== undefined) {
      fields.push('grand_total = ?');
      const baseSalary = updates.total_base_salary || 0;
      const overtimePay = updates.total_overtime_pay || 0;
      const bonus = updates.total_bonus || 0;
      values.push(baseSalary + overtimePay + bonus);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    fields.push('update_time = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE salary_budget_records SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新工资预算记录失败' });
  }
});

/**
 * 删除工资预算记录
 * DELETE /api/salary-budget/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM salary_budget_records WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除工资预算记录失败' });
  }
});

export default router;
