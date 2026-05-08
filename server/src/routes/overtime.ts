/**
 * 加班记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 加班类型值标准化映射（中文 -> 英文）
const OVERTIME_TYPE_MAP: Record<string, string> = {
  '工作日加班': 'workday',
  '休息日加班': 'weekend',
  '节假日加班': 'holiday',
  'workday': 'workday',
  'weekend': 'weekend',
  'holiday': 'holiday',
};

// 英文类型值到中文的映射
const OVERTIME_TYPE_LABEL_MAP: Record<string, string> = {
  'workday': '工作日加班',
  'weekend': '休息日加班',
  'holiday': '节假日加班',
};

// 加班状态值标准化映射（中文 -> 英文）
const OVERTIME_STATUS_MAP: Record<string, string> = {
  '待审批': 'pending',
  '已通过': 'approved',
  '已拒绝': 'rejected',
  '已取消': 'cancelled',
  'pending': 'pending',
  'approved': 'approved',
  'rejected': 'rejected',
  'cancelled': 'cancelled',
};

// 英文状态值到中文的映射
const OVERTIME_STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待审批',
  'approved': '已通过',
  'rejected': '已拒绝',
  'cancelled': '已取消',
};

/**
 * 标准化加班类型值（将中文转换为英文）
 */
function normalizeOvertimeType(overtimeType?: string): string {
  if (!overtimeType) return 'workday';
  return OVERTIME_TYPE_MAP[overtimeType] || overtimeType;
}

/**
 * 标准化加班状态值（将中文转换为英文）
 */
function normalizeOvertimeStatus(status?: string): string {
  if (!status) return 'pending';
  return OVERTIME_STATUS_MAP[status] || status;
}

/**
 * 获取加班类型显示标签
 */
function getOvertimeTypeLabel(overtimeType: string): string {
  return OVERTIME_TYPE_LABEL_MAP[overtimeType] || overtimeType;
}

/**
 * 获取加班状态显示标签
 */
function getOvertimeStatusLabel(status: string): string {
  return OVERTIME_STATUS_LABEL_MAP[status] || status;
}

/**
 * 计算加班费
 * @param baseSalary 基本工资
 * @param hours 加班小时数
 * @param overtimeType 加班类型
 * @returns 加班费
 */
function calculateOvertimePay(baseSalary: number, hours: number, overtimeType: string): number {
  const hourlyRate = baseSalary / 22 / 8; // 默认月计薪天数22天，每天8小时
  let rate = 1.5; // 默认工作日加班1.5倍
  if (overtimeType === 'weekend') rate = 2.0;
  if (overtimeType === 'holiday') rate = 3.0;
  return Math.round(hourlyRate * hours * rate * 100) / 100;
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { worker_name, overtime_type, status, start_date, end_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM overtime_records WHERE 1=1';
    const params: any[] = [];

    if (worker_name) {
      sql += ' AND worker_name LIKE ?';
      params.push(`%${worker_name}%`);
    }

    if (overtime_type) {
      sql += ' AND overtime_type = ?';
      params.push(normalizeOvertimeType(overtime_type as string));
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(normalizeOvertimeStatus(status as string));
    }

    if (start_date) {
      sql += ' AND work_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND work_date <= ?';
      params.push(end_date);
    }

    // 保存原始SQL用于count查询
    const countSql = sql;

    sql += ' ORDER BY work_date DESC, create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    // 为每个item添加状态标签和类型标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      overtimeTypeLabel: getOvertimeTypeLabel(item.overtime_type || 'workday'),
      statusLabel: getOvertimeStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取加班记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM overtime_records WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '加班记录不存在' });
    }

    // 添加标签
    item.overtimeTypeLabel = getOvertimeTypeLabel(item.overtime_type || 'workday');
    item.statusLabel = getOvertimeStatusLabel(item.status || 'pending');

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取加班记录详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, worker_id, worker_name, overtime_type, work_date, start_time, end_time,
      hours, base_salary, reason, status, department_id, department_name,
      greenhouse_id, greenhouse_name, remarks
    } = req.body;

    const newId = id || `OT${Date.now()}`;
    const now = new Date().toISOString();
    const normalizedType = normalizeOvertimeType(overtime_type);
    const normalizedStatus = normalizeOvertimeStatus(status);

    // 计算时薪和加班费
    const hourlyRate = base_salary ? base_salary / 22 / 8 : 0;
    const overtimePay = base_salary ? calculateOvertimePay(base_salary, hours || 0, normalizedType) : 0;

    const db = getDatabase();
    db.run(`
      INSERT INTO overtime_records (
        id, worker_id, worker_name, overtime_type, work_date, start_time, end_time,
        hours, base_salary, hourly_rate, overtime_pay, reason, status,
        department_id, department_name, greenhouse_id, greenhouse_name, remarks,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, worker_id, worker_name, normalizedType, work_date, start_time, end_time,
      hours || 0, base_salary || 0, Math.round(hourlyRate * 100) / 100, overtimePay, reason || '',
      normalizedStatus, department_id, department_name, greenhouse_id, greenhouse_name, remarks || '',
      now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建加班记录失败:', error);
    res.status(500).json({ success: false, error: '创建加班记录失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 对 type 和 status 字段进行标准化转换
    if (updates.overtime_type) {
      updates.overtime_type = normalizeOvertimeType(updates.overtime_type);
    }
    if (updates.status) {
      updates.status = normalizeOvertimeStatus(updates.status);
    }

    // 如果更新了基本工资或加班时长，重新计算加班费
    if (updates.base_salary || updates.hours || updates.overtime_type) {
      const db = getDatabase();
      const stmt = db.prepare('SELECT * FROM overtime_records WHERE id = ?');
      stmt.bind([id]);
      let existing: any = null;
      if (stmt.step()) {
        existing = stmt.getAsObject();
      }
      stmt.free();

      if (existing) {
        const baseSalary = updates.base_salary || existing.base_salary || 0;
        const hours = updates.hours || existing.hours || 0;
        const overtimeType = updates.overtime_type || existing.overtime_type || 'workday';
        const hourlyRate = baseSalary / 22 / 8;
        updates.hourly_rate = Math.round(hourlyRate * 100) / 100;
        updates.overtime_pay = calculateOvertimePay(baseSalary, hours, overtimeType);
      }
    }

    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE overtime_records SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新加班记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM overtime_records WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除加班记录失败' });
  }
});

export default router;
