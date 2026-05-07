/**
 * 入职 API 路由
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
const router = Router();
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, staff_id, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM onboardings WHERE 1=1';
    const params: any[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (staff_id) { sql += ' AND staff_id = ?'; params.push(staff_id); }
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
  } catch (error) { res.status(500).json({ success: false, error: '获取入职记录失败' }); }
});
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM onboardings WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '入职记录不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取入职详情失败' }); }
});
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `OB${Date.now()}`;
    const now = new Date().toISOString();
    const { onboarding_code, staff_id, staff_name, department_id, department_name, position_id, position_name, onboarding_date, mentor_id, mentor_name, training_plan, progress, status, remarks } = req.body;
    db.run('INSERT INTO onboardings (id, onboarding_code, staff_id, staff_name, department_id, department_name, position_id, position_name, onboarding_date, mentor_id, mentor_name, training_plan, progress, status, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, onboarding_code || id, staff_id, staff_name, department_id, department_name, position_id, position_name, onboarding_date, mentor_id, mentor_name, training_plan, progress || 0, status || 'in_progress', remarks, now, now]);
    saveDatabase();
    res.json({ success: true, message: '入职记录创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建入职记录失败' }); }
});
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE onboardings SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '入职记录更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新入职记录失败' }); }
});
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM onboardings WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '入职记录已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除入职记录失败' }); }
});
export default router;
