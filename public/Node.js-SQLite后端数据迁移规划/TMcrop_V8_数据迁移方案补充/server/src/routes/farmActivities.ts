/**
 * 农事活动 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { activity_type, batch_id, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM farm_activities WHERE 1=1';
    const params: any[] = [];
    if (activity_type) { sql += ' AND activity_type = ?'; params.push(activity_type); }
    if (batch_id) { sql += ' AND batch_id = ?'; params.push(batch_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY plan_date DESC';
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
  } catch (error) { res.status(500).json({ success: false, error: '获取农事活动失败' }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM farm_activities WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '活动不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取活动详情失败' }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `FA${Date.now()}`;
    const now = new Date().toISOString();
    const { activity_code, activity_type, activity_name, batch_id, batch_code, crop_name, greenhouse_id, greenhouse_name, area_name, executor_id, executor_name, plan_date, actual_date, duration, materials_used, result, status, remarks } = req.body;
    db.run('INSERT INTO farm_activities (id, activity_code, activity_type, activity_name, batch_id, batch_code, crop_name, greenhouse_id, greenhouse_name, area_name, executor_id, executor_name, plan_date, actual_date, duration, materials_used, result, status, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, activity_code || id, activity_type, activity_name, batch_id, batch_code, crop_name, greenhouse_id, greenhouse_name, area_name, executor_id, executor_name, plan_date, actual_date, duration || 0, materials_used, result, status || 'planned', remarks, now, now]);
    saveDatabase();
    res.json({ success: true, message: '农事活动创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建农事活动失败' }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE farm_activities SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '农事活动更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新农事活动失败' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM farm_activities WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '农事活动已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除农事活动失败' }); }
});

export default router;
