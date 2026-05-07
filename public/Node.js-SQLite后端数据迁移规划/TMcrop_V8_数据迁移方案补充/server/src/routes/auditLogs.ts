/**
 * 审计日志 API 路由
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
const router = Router();
router.get('/', (req: Request, res: Response) => {
  try {
    const { user_id, module, action, start_date, end_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    if (user_id) { sql += ' AND user_id = ?'; params.push(user_id); }
    if (module) { sql += ' AND module = ?'; params.push(module); }
    if (action) { sql += ' AND action = ?'; params.push(action); }
    if (start_date) { sql += ' AND created_at >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND created_at <= ?'; params.push(end_date); }
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
  } catch (error) { res.status(500).json({ success: false, error: '获取审计日志失败' }); }
});
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM audit_logs WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '审计日志不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取审计日志详情失败' }); }
});
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `AL${Date.now()}`;
    const now = new Date().toISOString();
    const { log_code, user_id, username, action, module, resource_type, resource_id, description, old_value, new_value, ip_address, user_agent, status, error_message } = req.body;
    db.run('INSERT INTO audit_logs (id, log_code, user_id, username, action, module, resource_type, resource_id, description, old_value, new_value, ip_address, user_agent, status, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, log_code || id, user_id, username, action, module, resource_type, resource_id, description, old_value, new_value, ip_address, user_agent, status || 'success', error_message, now]);
    res.json({ success: true, message: '审计日志创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建审计日志失败' }); }
});
export default router;
