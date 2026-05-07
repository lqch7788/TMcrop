/**
 * 员工 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

function execQuery(db: any, sql: string, params?: any[]) {
  const stmt = db.prepare(sql);
  const result = stmt.getAsObject(params);
  stmt.free();
  return result;
}

function execAll(db: any, sql: string, params?: any[]) {
  const stmt = db.prepare(sql);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * 获取所有员工
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, department_oid, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM staff WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (department_oid) {
      sql += ' AND department_oid = ?';
      params.push(department_oid);
    }

    sql += ' ORDER BY created_at DESC';

    const countResult = db.exec(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const total = countResult.length > 0 && countResult[0].values.length > 0
      ? countResult[0].values[0][0] as number
      : 0;

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const results = db.exec(sql, params);
    let items: any[] = [];
    if (results.length > 0) {
      const { columns, values } = results[0];
      items = values.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
        return obj;
      });
    }

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取员工失败:', error);
    res.status(500).json({ success: false, error: '获取员工失败' });
  }
});

/**
 * 获取单个员工
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM staff WHERE id = ?', [req.params.id]);
    if (results.length === 0 || results[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '员工不存在' });
    }
    const { columns, values } = results[0];
    const item: any = {};
    columns.forEach((col: string, i: number) => { item[col] = values[0][i]; });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取员工详情失败' });
  }
});

/**
 * 创建员工
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = `ST${Date.now()}`;
    const now = new Date().toISOString();
    const {
      staff_code, name, gender, phone, email, department_oid, department_name,
      position_oid, position_name, team_oid, team_name, entry_date, status,
      id_card, address, emergency_contact, emergency_phone
    } = req.body;

    db.run(
      `INSERT INTO staff (id, staff_code, name, gender, phone, email, department_oid, department_name,
       position_oid, position_name, team_oid, team_name, entry_date, status, id_card, address,
       emergency_contact, emergency_phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, staff_code || id, name, gender, phone, email, department_oid, department_name,
       position_oid, position_name, team_oid, team_name, entry_date, status || 'active', id_card,
       address, emergency_contact, emergency_phone, now, now]
    );
    saveDatabase();
    res.json({ success: true, message: '员工创建成功', data: { id } });
  } catch (error) {
    console.error('创建员工失败:', error);
    res.status(500).json({ success: false, error: '创建员工失败' });
  }
});

/**
 * 更新员工
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields = Object.keys(req.body).filter(k => k !== 'id');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '无更新字段' });
    }
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => req.body[f]), now, req.params.id];
    db.run(`UPDATE staff SET ${setClause}, updated_at = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, message: '员工更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新员工失败' });
  }
});

/**
 * 删除员工
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('UPDATE staff SET status = ? WHERE id = ?', ['inactive', req.params.id]);
    saveDatabase();
    res.json({ success: true, message: '员工已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除员工失败' });
  }
});

export default router;
