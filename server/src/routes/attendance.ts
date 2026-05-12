/**
 * 考勤管理路由
 *
 * Phase 2: 考勤管理模块
 *
 * 提供考勤数据的CRUD API
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

/**
 * 获取考勤列表
 * GET /api/attendance
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { start_date, end_date, dept, keyword, page = '1', limit = '100' } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM attendance_records WHERE 1=1';
    const params: any[] = [];

    if (start_date) {
      sql += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND date <= ?';
      params.push(end_date);
    }

    if (dept && dept !== '全部') {
      sql += ' AND dept = ?';
      params.push(dept);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR worker_id LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY date DESC, worker_id';

    // 分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const result = db.exec(sql, params);
    const records = result.length > 0 ? result[0].values.map((row: any) => {
      const columns = result[0].columns;
      return columns.reduce((obj: any, col: string, idx: number) => {
        obj[col] = row[idx];
        return obj;
      }, {});
    }) : [];

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM attendance_records WHERE 1=1';
    const countParams: any[] = [];
    if (start_date) { countSql += ' AND date >= ?'; countParams.push(start_date); }
    if (end_date) { countSql += ' AND date <= ?'; countParams.push(end_date); }
    if (dept && dept !== '全部') { countSql += ' AND dept = ?'; countParams.push(dept); }
    if (keyword) { countSql += ' AND (name LIKE ? OR worker_id LIKE ?)'; countParams.push(`%${keyword}%`, `%${keyword}%`); }

    const countResult = db.exec(countSql, countParams);
    const total = countResult.length > 0 && countResult[0].values[0][0] ? Number(countResult[0].values[0][0]) || 0 : 0;

    res.json({
      success: true,
      data: records,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('获取考勤列表失败:', error);
    res.status(500).json({ success: false, error: '获取考勤列表失败' });
  }
});

/**
 * 获取单个考勤记录
 * GET /api/attendance/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = db.exec('SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ success: false, error: '考勤记录不存在' });
      return;
    }

    const columns = result[0].columns;
    const record = columns.reduce((obj: any, col: string, idx: number) => {
      obj[col] = result[0].values[0][idx];
      return obj;
    }, {});

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取考勤详情失败:', error);
    res.status(500).json({ success: false, error: '获取考勤详情失败' });
  }
});

/**
 * 批量创建考勤记录
 * POST /api/attendance/batch
 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ success: false, error: '请提供考勤数据数组' });
      return;
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const insertedIds: string[] = [];

    for (const record of records) {
      const newId = record.id || `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      db.run(`
        INSERT INTO attendance_records (id, worker_id, name, dept, date, check_in, check_out, hours, status, status_class, task_id, batch_id, remarks, version, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        record.worker_id,
        record.name,
        record.dept || null,
        record.date,
        record.check_in || null,
        record.check_out || null,
        record.hours || 0,
        record.status || '正常',
        record.status_class || 'normal',
        record.task_id || null,
        record.batch_id || null,
        record.remarks || null,
        1,
        now,
        now,
      ]);
      insertedIds.push(newId);
    }

    saveDatabase();

    res.status(201).json({
      success: true,
      data: { inserted: insertedIds, count: insertedIds.length },
    });
  } catch (error) {
    console.error('批量创建考勤记录失败:', error);
    res.status(500).json({ success: false, error: '批量创建考勤记录失败' });
  }
});

/**
 * 更新考勤记录
 * PUT /api/attendance/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    // 先检查记录是否存在
    const checkResult = db.exec('SELECT * FROM attendance_records WHERE id = ?', [id]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      res.status(404).json({ success: false, error: '考勤记录不存在' });
      return;
    }

    // 构建更新SQL
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.worker_id !== undefined) { fields.push('worker_id = ?'); values.push(updates.worker_id); }
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.dept !== undefined) { fields.push('dept = ?'); values.push(updates.dept); }
    if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date); }
    if (updates.check_in !== undefined) { fields.push('check_in = ?'); values.push(updates.check_in); }
    if (updates.check_out !== undefined) { fields.push('check_out = ?'); values.push(updates.check_out); }
    if (updates.hours !== undefined) { fields.push('hours = ?'); values.push(updates.hours); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.status_class !== undefined) { fields.push('status_class = ?'); values.push(updates.status_class); }
    if (updates.task_id !== undefined) { fields.push('task_id = ?'); values.push(updates.task_id); }
    if (updates.batch_id !== undefined) { fields.push('batch_id = ?'); values.push(updates.batch_id); }
    if (updates.remarks !== undefined) { fields.push('remarks = ?'); values.push(updates.remarks); }

    // 版本号递增（乐观锁）
    fields.push('version = version + 1');
    fields.push('update_time = ?');
    values.push(now);
    values.push(id);

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }

    db.run(`UPDATE attendance_records SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    // 返回更新后的记录
    const result = db.exec('SELECT * FROM attendance_records WHERE id = ?', [id]);
    const columns = result[0].columns;
    const record = columns.reduce((obj: any, col: string, idx: number) => {
      obj[col] = result[0].values[0][idx];
      return obj;
    }, {});

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新考勤记录失败:', error);
    res.status(500).json({ success: false, error: '更新考勤记录失败' });
  }
});

/**
 * 批量删除考勤记录
 * DELETE /api/attendance/batch
 */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: '请提供要删除的ID数组' });
      return;
    }

    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM attendance_records WHERE id IN (${placeholders})`, ids);
    saveDatabase();

    res.json({ success: true, data: { deleted: ids, count: ids.length } });
  } catch (error) {
    console.error('批量删除考勤记录失败:', error);
    res.status(500).json({ success: false, error: '批量删除考勤记录失败' });
  }
});

export default router;
