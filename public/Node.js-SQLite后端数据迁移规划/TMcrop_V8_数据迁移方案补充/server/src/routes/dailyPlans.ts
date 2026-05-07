/**
 * 日计划 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { plan_date, department_id, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM daily_plans WHERE 1=1';
    const params: any[] = [];
    if (plan_date) { sql += ' AND plan_date = ?'; params.push(plan_date); }
    if (department_id) { sql += ' AND department_id = ?'; params.push(department_id); }
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
  } catch (error) { res.status(500).json({ success: false, error: '获取日计划失败' }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM daily_plans WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '日计划不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取日计划详情失败' }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `DP${Date.now()}`;
    const now = new Date().toISOString();
    const { plan_code, plan_date, department_id, department_name, batch_id, batch_code, crop_name, greenhouse_id, greenhouse_name, planned_tasks, completed_tasks, task_count, completion_rate, status, remarks } = req.body;
    db.run('INSERT INTO daily_plans (id, plan_code, plan_date, department_id, department_name, batch_id, batch_code, crop_name, greenhouse_id, greenhouse_name, planned_tasks, completed_tasks, task_count, completion_rate, status, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, plan_code || id, plan_date, department_id, department_name, batch_id, batch_code, crop_name, greenhouse_id, greenhouse_name, planned_tasks, completed_tasks, task_count || 0, completion_rate || 0, status || 'draft', remarks, now, now]);
    saveDatabase();
    res.json({ success: true, message: '日计划创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建日计划失败' }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE daily_plans SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '日计划更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新日计划失败' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM daily_plans WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '日计划已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除日计划失败' }); }
});

export default router;
