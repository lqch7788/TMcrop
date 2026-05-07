/**
 * 生产记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { batch_id, record_type, record_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM production_records WHERE 1=1';
    const params: any[] = [];
    if (batch_id) { sql += ' AND batch_id = ?'; params.push(batch_id); }
    if (record_type) { sql += ' AND record_type = ?'; params.push(record_type); }
    if (record_date) { sql += ' AND record_date = ?'; params.push(record_date); }
    sql += ' ORDER BY record_date DESC';
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
  } catch (error) { res.status(500).json({ success: false, error: '获取生产记录失败' }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM production_records WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '生产记录不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取生产记录详情失败' }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `PR${Date.now()}`;
    const now = new Date().toISOString();
    const { record_code, batch_id, batch_code, crop_name, variety, greenhouse_id, greenhouse_name, record_date, record_type, quantity, unit, quality_grade, worker_id, worker_name, status, remarks } = req.body;
    db.run('INSERT INTO production_records (id, record_code, batch_id, batch_code, crop_name, variety, greenhouse_id, greenhouse_name, record_date, record_type, quantity, unit, quality_grade, worker_id, worker_name, status, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, record_code || id, batch_id, batch_code, crop_name, variety, greenhouse_id, greenhouse_name, record_date, record_type, quantity || 0, unit, quality_grade, worker_id, worker_name, status || 'active', remarks, now, now]);
    saveDatabase();
    res.json({ success: true, message: '生产记录创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建生产记录失败' }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE production_records SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '生产记录更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新生产记录失败' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM production_records WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '生产记录已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除生产记录失败' }); }
});

export default router;
