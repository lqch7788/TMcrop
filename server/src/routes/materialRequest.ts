/**
 * 物料申请 API 路由
 * 提供物料申请的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 生成物料申请编码
 */
function generateMaterialRequestCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `MR${year}${month}${day}${seq}`;
}

/**
 * 获取物料申请列表
 * GET /api/material-requests
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { request_type, status, approval_status, department_name, applicant_name, warehouse_name, priority, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM material_requests WHERE 1=1';
    const params: (string | number)[] = [];

    if (request_type) {
      sql += ' AND request_type LIKE ?';
      params.push(`%${request_type}%`);
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

    if (warehouse_name) {
      sql += ' AND warehouse_name LIKE ?';
      params.push(`%${warehouse_name}%`);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority as string);
    }

    const countSql = sql;
    sql += ' ORDER BY apply_date DESC, create_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);

    // 解析 attachments 和 materials JSON 字段
    const result = items.map((item: Record<string, unknown>) => ({
      ...item,
      attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
      materials: item.materials ? JSON.parse(item.materials as string) : [],
    }));

    res.json({ success: true, data: result, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取物料申请列表失败:', error);
    res.status(500).json({ success: false, error: '获取物料申请列表失败' });
  }
});

/**
 * 获取单个物料申请详情
 * GET /api/material-requests/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM material_requests WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '物料申请不存在' });
    }

    // 解析 attachments 和 materials JSON 字段
    const result = {
      ...item,
      attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
      materials: item.materials ? JSON.parse(item.materials as string) : [],
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取物料申请详情失败:', error);
    res.status(500).json({ success: false, error: '获取物料申请详情失败' });
  }
});

/**
 * 创建物料申请
 * POST /api/material-requests
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id,
      request_code,
      request_title,
      request_type,
      department_id,
      department_name,
      applicant_id,
      applicant_name,
      apply_date,
      expected_date,
      warehouse_id,
      warehouse_name,
      plant_area,
      production_batch_code,
      total_amount,
      priority,
      status,
      approval_status,
      remarks,
      attachments,
      materials,
      create_by,
    } = req.body;

    const newId = id || `MR${Date.now()}`;
    const now = new Date().toISOString();
    const requestCode = request_code || generateMaterialRequestCode();

    console.log('【DEBUG】准备创建物料申请:', { newId, requestCode, request_title, request_type });

    const db = getDatabase();

    // 检查表是否存在
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='material_requests'");
      if (!tableCheck.step()) {
        console.error('【DEBUG】material_requests 表不存在!');
        tableCheck.free();
        res.status(500).json({ success: false, error: '数据库表不存在' });
        return;
      }
      tableCheck.free();
      console.log('【DEBUG】material_requests 表存在');
    } catch (e) {
      console.error('【DEBUG】检查表失败:', e);
    }

    try {
      db.run(`
        INSERT INTO material_requests (
          id, request_code, request_title, request_type,
          department_id, department_name,
          applicant_id, applicant_name,
          apply_date, expected_date,
          warehouse_id, warehouse_name,
          plant_area, production_batch_code,
          total_amount, priority, status, approval_status,
          remarks, attachments, materials, create_by,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        requestCode,
        request_title || null,
        request_type || null,
        department_id || null,
        department_name || null,
        applicant_id || null,
        applicant_name || null,
        apply_date || now.substring(0, 10),
        expected_date || null,
        warehouse_id || null,
        warehouse_name || null,
        plant_area || null,
        production_batch_code || null,
        total_amount || 0,
        priority || 'medium',
        status || 'draft',
        approval_status || 'pending',
        remarks || null,
        JSON.stringify(attachments || []),
        JSON.stringify(materials || []),
        create_by || null,
        now,
        now,
      ]);

      saveDatabase();
      res.status(201).json({ success: true, data: { id: newId, request_code: requestCode } });
    } catch (dbError) {
      console.error('【DEBUG】数据库INSERT失败:', dbError);
      res.status(500).json({ success: false, error: '创建物料申请失败: ' + (dbError instanceof Error ? dbError.message : String(dbError)) });
    }
  } catch (error) {
    console.error('【DEBUG】创建物料申请失败:', error);
    res.status(500).json({ success: false, error: '创建物料申请失败' });
  }
});

/**
 * 更新物料申请
 * PUT /api/material-requests/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 检查物料申请是否存在
    const stmt = db.prepare('SELECT status, approval_status FROM material_requests WHERE id = ?');
    stmt.bind([id]);
    let request: Record<string, unknown> | null = null;
    if (stmt.step()) {
      request = stmt.getAsObject();
    }
    stmt.free();

    if (!request) {
      return res.status(404).json({ success: false, error: '物料申请不存在' });
    }

    // 不允许更新已审批通过的申请
    if (request.status === 'approved' || request.approval_status === 'approved') {
      return res.status(400).json({ success: false, error: '已审批通过的物料申请不允许修改' });
    }

    // 过滤掉 id 和自动生成的字段
    const excludeFields = ['id', 'request_code', 'create_time'];
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

    db.run(`UPDATE material_requests SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新物料申请失败:', error);
    res.status(500).json({ success: false, error: '更新物料申请失败' });
  }
});

/**
 * 删除物料申请
 * DELETE /api/material-requests/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查物料申请是否存在
    const stmt = db.prepare('SELECT status, approval_status FROM material_requests WHERE id = ?');
    stmt.bind([id]);
    let request: Record<string, unknown> | null = null;
    if (stmt.step()) {
      request = stmt.getAsObject();
    }
    stmt.free();

    if (!request) {
      return res.status(404).json({ success: false, error: '物料申请不存在' });
    }

    // 直接删除，不做状态限制
    db.run('DELETE FROM material_requests WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除物料申请失败:', error);
    res.status(500).json({ success: false, error: '删除物料申请失败' });
  }
});

export default router;
