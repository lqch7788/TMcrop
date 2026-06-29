/**
 * 风险预警 API 路由
 * 2026-06-27 P0：替代前端 mock Store，保证数据进后端
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

function generateId(): string {
  return `RISK_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const ALLOWED_FIELDS = [
  'alert_type', 'alert_type_name', 'level', 'title', 'content',
  'staff_id', 'staff_name', 'department', 'status',
  'handle_time', 'handler', 'remarks',
];

/** GET /api/risks — 列表 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { status, level, alertType, department, keyword, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let sql = "SELECT * FROM risk_alerts WHERE (deleted_at IS NULL OR deleted_at = '')";
    const params: (string | number)[] = [];

    if (status) { sql += ' AND status = ?'; params.push(status as string); }
    if (level) { sql += ' AND level = ?'; params.push(level as string); }
    if (alertType) { sql += ' AND alert_type = ?'; params.push(alertType as string); }
    if (department) { sql += ' AND department = ?'; params.push(department as string); }
    if (keyword) {
      sql += ' AND (title LIKE ? OR content LIKE ? OR staff_name LIKE ?)';
      const k = `%${keyword}%`;
      params.push(k, k, k);
    }

    const countSql = sql.replace(/SELECT \* FROM/, 'SELECT COUNT(*) AS total FROM');
    const totalRes = db.exec(countSql, params);
    const total = Number(totalRes[0]?.values[0]?.[0] || 0);

    sql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    const res2 = db.exec(sql, params);
    const rows = res2[0] ? res2[0].values.map((v) => Object.fromEntries(res2[0].columns.map((c, i) => [c, v[i]]))) : [];

    res.json({ success: true, data: rows, total, page: pageNum, limit: limitNum });
  } catch (e) {
    console.error('[risks GET /] error:', e);
    res.status(500).json({ success: false, error: '查询风险预警失败' });
  }
});

/** GET /api/risks/:id */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const r = db.exec('SELECT * FROM risk_alerts WHERE id = ? AND (deleted_at IS NULL OR deleted_at = "")', [req.params.id]);
    if (!r[0] || r[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '风险预警不存在' });
    }
    const row = Object.fromEntries(r[0].columns.map((c, i) => [c, r[0].values[0][i]]));
    res.json({ success: true, data: row });
  } catch (e) {
    console.error('[risks GET /:id] error:', e);
    res.status(500).json({ success: false, error: '查询风险预警失败' });
  }
});

/** POST /api/risks — 必填：alert_type, title */
router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const required = ['alert_type', 'title'];
    for (const f of required) {
      if (!body[f]) return res.status(400).json({ success: false, error: `缺少必填字段: ${f}` });
    }
    const db = getDatabase();
    const id = body.id || generateId();
    const now = new Date().toISOString();

    const cols = ['id', ...ALLOWED_FIELDS, 'create_time', 'update_time'];
    const vals: (string | number | null)[] = [id];
    for (const f of ALLOWED_FIELDS) {
      const v = body[f];
      vals.push(v === undefined ? null : v);
    }
    vals.push(now, now);

    if (cols.length !== vals.length) {
      return res.status(500).json({ success: false, error: `INSERT 列数(${cols.length})与值数(${vals.length})不一致` });
    }
    const placeholders = cols.map(() => '?').join(', ');
    db.run(`INSERT INTO risk_alerts (${cols.join(', ')}) VALUES (${placeholders})`, vals as any);
    saveDatabase();

    const r = db.exec('SELECT * FROM risk_alerts WHERE id = ?', [id]);
    const row = r[0] ? Object.fromEntries(r[0].columns.map((c, i) => [c, r[0].values[0][i]])) : null;
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    console.error('[risks POST /] error:', e);
    res.status(500).json({ success: false, error: '新建风险预警失败' });
  }
});

/** PUT /api/risks/:id */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const db = getDatabase();
    const exist = db.exec('SELECT id FROM risk_alerts WHERE id = ? AND (deleted_at IS NULL OR deleted_at = "")', [req.params.id]);
    if (!exist[0] || exist[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '风险预警不存在' });
    }
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const f of ALLOWED_FIELDS) {
      if (body[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(body[f]);
      }
    }
    if (sets.length === 0) return res.status(400).json({ success: false, error: '无可更新字段' });
    sets.push('update_time = ?');
    vals.push(new Date().toISOString());
    vals.push(req.params.id);
    db.run(`UPDATE risk_alerts SET ${sets.join(', ')} WHERE id = ?`, vals as any);
    saveDatabase();

    const r = db.exec('SELECT * FROM risk_alerts WHERE id = ?', [req.params.id]);
    const row = r[0] ? Object.fromEntries(r[0].columns.map((c, i) => [c, r[0].values[0][i]])) : null;
    res.json({ success: true, data: row });
  } catch (e) {
    console.error('[risks PUT /:id] error:', e);
    res.status(500).json({ success: false, error: '更新风险预警失败' });
  }
});

/** DELETE /api/risks/:id — 软删 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const r = db.run('UPDATE risk_alerts SET deleted_at = ?, update_time = ? WHERE id = ?', [now, now, req.params.id]);
    if ((r as any).changes === 0) return res.status(404).json({ success: false, error: '风险预警不存在' });
    saveDatabase();
    res.json({ success: true, message: '已删除' });
  } catch (e) {
    console.error('[risks DELETE /:id] error:', e);
    res.status(500).json({ success: false, error: '删除风险预警失败' });
  }
});

export default router;