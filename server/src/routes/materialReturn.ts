/**
 * 生产退料 API 路由
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// GET /api/material-returns - 获取退料列表
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, applicant, department, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM material_returns WHERE 1=1';
    const params: (string | number)[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status as string); }
    if (applicant) { sql += ' AND applicant LIKE ?'; params.push(`%${applicant}%`); }
    if (department) { sql += ' AND department LIKE ?'; params.push(`%${department}%`); }
    const countSql = sql;
    sql += ' ORDER BY create_time DESC';
    const total = execCount(db, countSql, params);
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    const items = queryToObjects(db, sql, params);
    // 解析materials JSON字段
    const result = items.map((item: Record<string, unknown>) => ({
      ...item,
      materials: item.materials ? JSON.parse(item.materials as string) : [],
    }));
    res.json({ success: true, data: result, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取退料列表失败:', error);
    res.status(500).json({ success: false, error: '获取退料列表失败' });
  }
});

// GET /api/material-returns/:id - 获取单条退料详情
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM material_returns WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) item = stmt.getAsObject();
    stmt.free();
    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '退料记录不存在' });
    }
    item.materials = item.materials ? JSON.parse(item.materials as string) : [];
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取退料详情失败' });
  }
});

// POST /api/material-returns - 创建退料记录
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, code, date, type, applicant, department, warehouseLocation, status, statusClass,
      remark, operator, reviewer, reviewDate, rejectReason, materials, create_by } = req.body;
    const newId = id || `TL${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();
    db.run(`
      INSERT INTO material_returns (
        id, code, date, type, applicant, department, warehouseLocation, status, statusClass,
        remark, operator, reviewer, reviewDate, rejectReason, materials, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, code, date || null, type || null, applicant || null, department || null,
      warehouseLocation || null, status || '待审批', statusClass || 'pending',
      remark || null, operator || null, reviewer || null, reviewDate || null,
      rejectReason || null, JSON.stringify(materials || []), create_by || null, now, now,
    ]);
    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, code } });
  } catch (error) {
    console.error('创建退料失败:', error);
    res.status(500).json({ success: false, error: '创建退料失败' });
  }
});

// PUT /api/material-returns/:id - 更新退料记录
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();
    const excludeFields = ['id', 'create_time'];
    const fields = Object.keys(updates)
      .filter(k => !excludeFields.includes(k))
      .map(k => {
        if (k === 'materials') return 'materials = ?';
        return `${k} = ?`;
      })
      .join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }
    const values = Object.keys(updates)
      .filter(k => !excludeFields.includes(k))
      .map(k => k === 'materials' ? JSON.stringify(updates[k] || []) : updates[k]);
    values.push(now, id);
    db.run(`UPDATE material_returns SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新退料失败:', error);
    res.status(500).json({ success: false, error: '更新退料失败' });
  }
});

// DELETE /api/material-returns/:id - 删除退料记录
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM material_returns WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除退料失败' });
  }
});

export default router;
