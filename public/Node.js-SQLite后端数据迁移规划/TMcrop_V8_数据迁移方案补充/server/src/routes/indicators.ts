/**
 * 管理指标 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { category, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM indicators WHERE 1=1';
    const params: any[] = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
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
  } catch (error) { res.status(500).json({ success: false, error: '获取管理指标失败' }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM indicators WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '管理指标不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取管理指标详情失败' }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `IND${Date.now()}`;
    const now = new Date().toISOString();
    const { indicator_code, indicator_name, category, unit, target_value, actual_value, warning_threshold, critical_threshold, frequency, status } = req.body;
    db.run('INSERT INTO indicators (id, indicator_code, indicator_name, category, unit, target_value, actual_value, warning_threshold, critical_threshold, frequency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, indicator_code || id, indicator_name, category, unit, target_value || 0, actual_value || 0, warning_threshold, critical_threshold, frequency || 'monthly', status || 'active', now, now]);
    saveDatabase();
    res.json({ success: true, message: '管理指标创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建管理指标失败' }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE indicators SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '管理指标更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新管理指标失败' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('UPDATE indicators SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '管理指标已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除管理指标失败' }); }
});

export default router;
