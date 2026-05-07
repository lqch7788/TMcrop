/**
 * 物料退库 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { status, material_id, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM material_returns WHERE 1=1';
    const params: any[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (material_id) { sql += ' AND material_id = ?'; params.push(material_id); }
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
  } catch (error) { res.status(500).json({ success: false, error: '获取退库记录失败' }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM material_returns WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '记录不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取退库详情失败' }); }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `MRT${Date.now()}`;
    const now = new Date().toISOString();
    const { return_code, receiving_record_id, material_id, material_name, return_quantity, unit, returner_id, returner_name, warehouse_id, warehouse_name, return_date, reason, status, remarks } = req.body;
    db.run('INSERT INTO material_returns (id, return_code, receiving_record_id, material_id, material_name, return_quantity, unit, returner_id, returner_name, warehouse_id, warehouse_name, return_date, reason, status, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, return_code || id, receiving_record_id, material_id, material_name, return_quantity || 0, unit, returner_id, returner_name, warehouse_id, warehouse_name, return_date, reason, status || 'pending', remarks, now, now]);
    saveDatabase();
    res.json({ success: true, message: '退库记录创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建退库记录失败' }); }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE material_returns SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '退库记录更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新退库记录失败' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM material_returns WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '退库记录已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除退库记录失败' }); }
});

export default router;
