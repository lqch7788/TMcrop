/**
 * 考勤 API 路由
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
const router = Router();
router.get('/', (req: Request, res: Response) => {
  try {
    const { staff_id, attendance_date, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM attendance_records WHERE 1=1';
    const params: any[] = [];
    if (staff_id) { sql += ' AND staff_id = ?'; params.push(staff_id); }
    if (attendance_date) { sql += ' AND attendance_date = ?'; params.push(attendance_date); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY attendance_date DESC';
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
  } catch (error) { res.status(500).json({ success: false, error: '获取考勤记录失败' }); }
});
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM attendance_records WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) return res.status(404).json({ success: false, error: '考勤记录不存在' });
    const { columns, values } = results[0];
    const item: any = {}; columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) { res.status(500).json({ success: false, error: '获取考勤详情失败' }); }
});
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `AT${Date.now()}`;
    const now = new Date().toISOString();
    const { record_code, staff_id, staff_name, department_id, department_name, attendance_date, check_in_time, check_out_time, work_hours, overtime_hours, status, leave_type, remarks } = req.body;
    db.run('INSERT INTO attendance_records (id, record_code, staff_id, staff_name, department_id, department_name, attendance_date, check_in_time, check_out_time, work_hours, overtime_hours, status, leave_type, remarks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, record_code || id, staff_id, staff_name, department_id, department_name, attendance_date, check_in_time, check_out_time, work_hours || 0, overtime_hours || 0, status || 'normal', leave_type, remarks, now, now]);
    saveDatabase();
    res.json({ success: true, message: '考勤记录创建成功', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: '创建考勤记录失败' }); }
});
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) return res.status(400).json({ success: false, error: '无更新字段' });
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    db.run(`UPDATE attendance_records SET ${setClause}, updated_at = ? WHERE id = ?`, [...fields.map(f => req.body[f]), now, req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '考勤记录更新成功' });
  } catch (error) { res.status(500).json({ success: false, error: '更新考勤记录失败' }); }
});
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM attendance_records WHERE id = ?', [req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '考勤记录已删除' });
  } catch (error) { res.status(500).json({ success: false, error: '删除考勤记录失败' }); }
});
export default router;
