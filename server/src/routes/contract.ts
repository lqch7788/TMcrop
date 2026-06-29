/**
 * 合同 API 路由
 * 提供合同的 CRUD 操作
 * 2026-06-27 P0：替代前端 mock Store，保证数据进后端
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

/** 生成合同 ID：HT_时间戳_随机 */
function generateId(): string {
  return `HT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** 字段白名单（防 SQL 注入 + 防前端传未知字段） */
const ALLOWED_FIELDS = [
  'contract_code', 'staff_id', 'staff_name', 'id_card', 'contract_type',
  'start_date', 'end_date', 'status', 'monthly_salary', 'daily_wage',
  'hourly_wage', 'signing_date', 'attachments', 'remarks',
];

/**
 * GET /api/contracts
 * Query: status, contractType, keyword, page, limit
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { status, contractType, keyword, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let sql = "SELECT * FROM contracts WHERE (deleted_at IS NULL OR deleted_at = '')";
    const params: (string | number)[] = [];

    if (status) { sql += ' AND status = ?'; params.push(status as string); }
    if (contractType) { sql += ' AND contract_type = ?'; params.push(contractType as string); }
    if (keyword) {
      sql += ' AND (staff_name LIKE ? OR contract_code LIKE ? OR id_card LIKE ?)';
      const k = `%${keyword}%`;
      params.push(k, k, k);
    }

    // 统计总数
    const countSql = sql.replace(/SELECT \* FROM/, 'SELECT COUNT(*) AS total FROM');
    const totalRes = db.exec(countSql, params);
    const total = Number(totalRes[0]?.values[0]?.[0] || 0);

    sql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    const res2 = db.exec(sql, params);
    const rows = res2[0] ? res2[0].values.map((v) => Object.fromEntries(res2[0].columns.map((c, i) => [c, v[i]]))) : [];

    res.json({ success: true, data: rows, total, page: pageNum, limit: limitNum });
  } catch (e) {
    console.error('[contracts GET /] error:', e);
    res.status(500).json({ success: false, error: '查询合同失败' });
  }
});

/** GET /api/contracts/:id */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const r = db.exec('SELECT * FROM contracts WHERE id = ? AND (deleted_at IS NULL OR deleted_at = "")', [req.params.id]);
    if (!r[0] || r[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }
    const row = Object.fromEntries(r[0].columns.map((c, i) => [c, r[0].values[0][i]]));
    res.json({ success: true, data: row });
  } catch (e) {
    console.error('[contracts GET /:id] error:', e);
    res.status(500).json({ success: false, error: '查询合同失败' });
  }
});

/**
 * POST /api/contracts
 * Body: { contract_code, staff_id, staff_name, id_card?, contract_type, start_date, end_date, ... }
 * 必填：staff_id, staff_name, contract_type, start_date, end_date
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    // 必填校验
    const required = ['staff_id', 'staff_name', 'contract_type', 'start_date', 'end_date'];
    for (const f of required) {
      if (!body[f]) return res.status(400).json({ success: false, error: `缺少必填字段: ${f}` });
    }
    const db = getDatabase();
    const id = body.id || generateId();
    const now = new Date().toISOString();
    // 自动生成合同编号（如未提供）
    const code = body.contract_code || `HT-${now.replace(/[-:T.Z]/g, '').slice(0, 14)}-${id.slice(-4).toUpperCase()}`;

    // 收集白名单字段
    const cols = ['id', 'contract_code', ...ALLOWED_FIELDS, 'create_time', 'update_time'];
    const vals: (string | number | null)[] = [id, code];
    for (const f of ALLOWED_FIELDS) {
      const v = body[f];
      vals.push(v === undefined ? null : (typeof v === 'object' ? JSON.stringify(v) : v));
    }
    vals.push(now, now);

    // 长度强校验（防止占位符与值数量不匹配）
    if (cols.length !== vals.length) {
      return res.status(500).json({ success: false, error: `INSERT 列数(${cols.length})与值数(${vals.length})不一致` });
    }
    const placeholders = cols.map(() => '?').join(', ');
    db.run(`INSERT INTO contracts (${cols.join(', ')}) VALUES (${placeholders})`, vals as any);
    saveDatabase();

    // 返回完整记录
    const r = db.exec('SELECT * FROM contracts WHERE id = ?', [id]);
    const row = r[0] ? Object.fromEntries(r[0].columns.map((c, i) => [c, r[0].values[0][i]])) : null;
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error('[contracts POST /] error:', e);
    res.status(500).json({ success: false, error: '新建合同失败' });
  }
});

/** PUT /api/contracts/:id */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const db = getDatabase();
    // 检查存在
    const exist = db.exec('SELECT id FROM contracts WHERE id = ? AND (deleted_at IS NULL OR deleted_at = "")', [req.params.id]);
    if (!exist[0] || exist[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }
    // 收集白名单字段
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const f of ALLOWED_FIELDS) {
      if (body[f] !== undefined) {
        sets.push(`${f} = ?`);
        const v = body[f];
        vals.push(typeof v === 'object' ? JSON.stringify(v) : v);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: '无可更新字段' });
    }
    sets.push('update_time = ?');
    vals.push(new Date().toISOString());
    vals.push(req.params.id);

    db.run(`UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`, vals as any);
    saveDatabase();

    // 返回完整记录
    const r = db.exec('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    const row = r[0] ? Object.fromEntries(r[0].columns.map((c, i) => [c, r[0].values[0][i]])) : null;
    res.json({ success: true, data: row });
  } catch (e) {
    console.error('[contracts PUT /:id] error:', e);
    res.status(500).json({ success: false, error: '更新合同失败' });
  }
});

/** DELETE /api/contracts/:id — 软删 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const r = db.run('UPDATE contracts SET deleted_at = ?, update_time = ? WHERE id = ?', [now, now, req.params.id]);
    if ((r as any).changes === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }
    saveDatabase();
    res.json({ success: true, message: '已删除' });
  } catch (e) {
    console.error('[contracts DELETE /:id] error:', e);
    res.status(500).json({ success: false, error: '删除合同失败' });
  }
});

export default router;