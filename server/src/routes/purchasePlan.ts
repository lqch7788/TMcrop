/**
 * 采购计划 API 路由
 * 提供采购计划的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 生成采购计划编码
 */
function generatePurchasePlanCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `PP${year}${month}${day}${seq}`;
}

/**
 * 获取采购计划列表
 * GET /api/purchase-plans
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { plan_type, status, approval_status, department_name, applicant_name, priority, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM purchase_plans WHERE 1=1';
    const params: (string | number)[] = [];

    if (plan_type) {
      sql += ' AND plan_type LIKE ?';
      params.push(`%${plan_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (approval_status) {
      sql += ' AND approval_status = ?';
      params.push(approval_status as string);
    }

    if (department_name) {
      sql += ' AND department_name LIKE ?';
      params.push(`%${department_name}%`);
    }

    if (applicant_name) {
      sql += ' AND applicant_name LIKE ?';
      params.push(`%${applicant_name}%`);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority as string);
    }

    const countSql = sql;
    sql += ' ORDER BY apply_date DESC, create_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const items = queryToObjects(db, sql, params);

    // 解析 attachments JSON 字段
    const result = items.map((item: Record<string, unknown>) => ({
      ...item,
      attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
    }));

    res.json({ success: true, data: result, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取采购计划列表失败:', error);
    res.status(500).json({ success: false, error: '获取采购计划列表失败' });
  }
});

/**
 * 获取单个采购计划详情
 * GET /api/purchase-plans/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM purchase_plans WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '采购计划不存在' });
    }

    // 解析 attachments JSON 字段
    const result = {
      ...item,
      attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取采购计划详情失败:', error);
    res.status(500).json({ success: false, error: '获取采购计划详情失败' });
  }
});

/**
 * 创建采购计划
 * POST /api/purchase-plans
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id,
      plan_code,
      plan_title,
      plan_type,
      department_id,
      department_name,
      applicant_id,
      applicant_name,
      apply_date,
      expected_date,
      supplier_id,
      supplier_name,
      total_amount,
      priority,
      status,
      approval_status,
      remarks,
      attachments,
      create_by,
    } = req.body;

    const newId = id || `PP${Date.now()}`;
    const now = new Date().toISOString();
    const planCode = plan_code || generatePurchasePlanCode();

    const db = getDatabase();
    db.run(`
      INSERT INTO purchase_plans (
        id, plan_code, plan_title, plan_type,
        department_id, department_name,
        applicant_id, applicant_name,
        apply_date, expected_date,
        supplier_id, supplier_name, total_amount,
        priority, status, approval_status,
        remarks, attachments, create_by,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      planCode,
      plan_title,
      plan_type,
      department_id,
      department_name,
      applicant_id,
      applicant_name,
      apply_date || now.substring(0, 10),
      expected_date,
      supplier_id,
      supplier_name,
      total_amount || 0,
      priority || 'medium',
      status || 'draft',
      approval_status || 'pending',
      remarks,
      JSON.stringify(attachments || []),
      create_by,
      now,
      now,
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, plan_code: planCode } });
  } catch (error) {
    console.error('创建采购计划失败:', error);
    res.status(500).json({ success: false, error: '创建采购计划失败' });
  }
});

/**
 * 更新采购计划
 * PUT /api/purchase-plans/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 检查采购计划是否存在
    const stmt = db.prepare('SELECT status FROM purchase_plans WHERE id = ?');
    stmt.bind([id]);
    let plan: Record<string, unknown> | null = null;
    if (stmt.step()) {
      plan = stmt.getAsObject();
    }
    stmt.free();

    if (!plan) {
      return res.status(404).json({ success: false, error: '采购计划不存在' });
    }

    // 不允许更新已审批通过的计划
    if (plan.status === 'approved' || plan.approval_status === 'approved') {
      return res.status(400).json({ success: false, error: '已审批通过的采购计划不允许修改' });
    }

    // 过滤掉 id 和自动生成的字段
    const excludeFields = ['id', 'plan_code', 'create_time'];
    const fields = Object.keys(updates)
      .filter(k => !excludeFields.includes(k))
      .map(k => `${k} = ?`)
      .join(', ');

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates)
      .filter(k => !excludeFields.includes(k))
      .map(k => {
        // 处理 attachments 数组序列化
        if (k === 'attachments') {
          return JSON.stringify(updates[k] || []);
        }
        return updates[k];
      });
    values.push(now, id);

    db.run(`UPDATE purchase_plans SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新采购计划失败:', error);
    res.status(500).json({ success: false, error: '更新采购计划失败' });
  }
});

/**
 * 删除采购计划
 * DELETE /api/purchase-plans/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查采购计划是否存在
    const stmt = db.prepare('SELECT status, approval_status FROM purchase_plans WHERE id = ?');
    stmt.bind([id]);
    let plan: Record<string, unknown> | null = null;
    if (stmt.step()) {
      plan = stmt.getAsObject();
    }
    stmt.free();

    if (!plan) {
      return res.status(404).json({ success: false, error: '采购计划不存在' });
    }

    // 只允许删除草稿或已拒绝的计划
    if (plan.status !== 'draft' && plan.approval_status !== 'rejected') {
      return res.status(400).json({ success: false, error: '只允许删除草稿或已拒绝的采购计划' });
    }

    db.run('DELETE FROM purchase_plans WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除采购计划失败:', error);
    res.status(500).json({ success: false, error: '删除采购计划失败' });
  }
});

export default router;
