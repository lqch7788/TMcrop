/**
 * 合同 API 路由
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
const router = Router();
router.get('/', (req: Request, res: Response) => {
  try {
    const { contract_type, status, staff_id, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM contracts WHERE 1=1';
    const params: any[] = [];
    if (contract_type) { sql += ' AND contract_type = ?'; params.push(contract_type); }
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
  } catch (error) { res.status(500).json({ success: false, error: '获取合同失败' }); }
});
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '合同不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取合同详情失败' }); }
});
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `CT${Date.now()}`;
    const now = new Date().toISOString();
    const { contract_code, contract_type, party_a, party_b, staff_id, staff_name, sign_date, start_date, end_date, contract_value, payment_terms, status, remarks } = req.body;
    db.run('INSERT INTO contracts (id, contract_code, contract_type, party_a, party_b, staff_id, staff_name, sign_date, start_date, end_date, contract_value, payment_terms, status, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, contract_code || id, contract_type, party_a, party_b, staff_id, staff_name, sign_date, start_date, end_date, contract_value || 0, payment_terms, status || 'active', remarks, now, now]);
    saveDatabase();
    res.json({ success: true, message: '合同创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建合同失败' }); }
});
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE contracts SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '合同更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新合同失败' }); }
});
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('UPDATE contracts SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '合同已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除合同失败' }); }
});
export default router;
