/**
 * 公司分组 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM company_groups WHERE 1=1';
    const params: any[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY sort_order ASC';
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
  } catch (error) { res.status(500).json({ success: false, error: '获取公司分组失败' }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM company_groups WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '分组不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取分组详情失败' }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `CG${Date.now()}`;
    const now = new Date().toISOString();
    const { group_code, group_name, parent_id, sort_order, status } = req.body;
    db.run('INSERT INTO company_groups (id, group_code, group_name, parent_id, sort_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, group_code || id, group_name, parent_id, sort_order || 0, status || 'active', now, now]);
    saveDatabase();
    res.json({ success: true, message: '公司分组创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建公司分组失败' }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE company_groups SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '公司分组更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新公司分组失败' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('UPDATE company_groups SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '公司分组已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除公司分组失败' }); }
});

export default router;
