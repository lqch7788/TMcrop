/**
 * 成本核算 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { batch_id, cost_type, cost_category, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM cost_accounting WHERE 1=1';
    const params: any[] = [];
    if (batch_id) { sql += ' AND batch_id = ?'; params.push(batch_id); }
    if (cost_type) { sql += ' AND cost_type = ?'; params.push(cost_type); }
    if (cost_category) { sql += ' AND cost_category = ?'; params.push(cost_category); }
    sql += ' ORDER BY created_at DESC';
    const countResult = db.exec(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const total = countResult.length > 0 && countResult[0].values.length > 0 ? countResult[0].values[0][0] as number : 0;
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;
    const results = db.exec(sql, params);
    let items: any[] = [];
    if (results.length > 0) {
      const { columns, values } = results[0];
      items = values.map((row: any[]) => { const obj: any = {}; columns.forEach((col: string, i: number) => { obj[col] = row[i]; }); return obj; });
    }
    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) { res.status(500).json({ success: false, error: '获取成本核算失败' }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM cost_accounting WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '成本核算不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取成本核算详情失败' }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `CA${Date.now()}`;
    const now = new Date().toISOString();
    const { accounting_code, batch_id, batch_code, crop_name, cost_type, cost_category, amount, unit, record_date, department_id, department_name, status, remarks } = req.body;
    db.run('INSERT INTO cost_accounting (id, accounting_code, batch_id, batch_code, crop_name, cost_type, cost_category, amount, unit, record_date, department_id, department_name, status, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, accounting_code || id, batch_id, batch_code, crop_name, cost_type, cost_category, amount || 0, unit, record_date, department_id, department_name, status || 'active', remarks, now, now]);
    saveDatabase();
    res.json({ success: true, message: '成本核算创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建成本核算失败' }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE cost_accounting SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '成本核算更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新成本核算失败' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM cost_accounting WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '成本核算已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除成本核算失败' }); }
});

export default router;
