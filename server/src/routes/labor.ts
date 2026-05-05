/**
 * 人工记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 人工记录状态值标准化映射（中文 -> 英文）
const LABOR_STATUS_MAP: Record<string, string> = {
  '待处理': 'pending',
  '处理中': 'in_progress',
  '已处理': 'completed',
  'pending': 'pending',
  'in_progress': 'in_progress',
  'completed': 'completed',
};

// 英文状态值到中文的映射
const LABOR_STATUS_LABEL_MAP: Record<string, string> = {
  'pending': '待处理',
  'in_progress': '处理中',
  'completed': '已处理',
};

/**
 * 标准化人工记录状态值（将中文转换为英文）
 */
function normalizeLaborStatus(status?: string): string {
  if (!status) return 'pending';
  return LABOR_STATUS_MAP[status] || status;
}

/**
 * 获取状态显示标签
 */
function getLaborStatusLabel(status: string): string {
  return LABOR_STATUS_LABEL_MAP[status] || status;
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { worker_name, work_type, status, greenhouse_name, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM labor_records WHERE 1=1';
    const params: any[] = [];

    if (worker_name) {
      sql += ' AND worker_name LIKE ?';
      params.push(`%${worker_name}%`);
    }

    if (work_type) {
      sql += ' AND work_type LIKE ?';
      params.push(`%${work_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // 保存原始SQL用于count查询
    const countSql = sql;

    sql += ' ORDER BY work_date DESC, create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    // 为每个item添加状态标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: getLaborStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取人工记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM labor_records WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '人工记录不存在' });
    }

    // 添加状态标签
    item.statusLabel = getLaborStatusLabel(item.status || 'pending');

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取人工记录详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, worker_id, worker_name, work_type, work_date, work_hours, hourly_rate,
            total_amount, greenhouse_id, greenhouse_name, task_description, status, remarks } = req.body;

    const newId = id || `LB${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO labor_records (id, worker_id, worker_name, work_type, work_date, work_hours, hourly_rate,
        total_amount, greenhouse_id, greenhouse_name, task_description, status, remarks, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, worker_id, worker_name, work_type, work_date, work_hours, hourly_rate,
        total_amount, greenhouse_id, greenhouse_name, task_description, normalizeLaborStatus(status), remarks, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建人工记录失败:', error);
    res.status(500).json({ success: false, error: '创建人工记录失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 对 status 字段进行标准化转换
    if (updates.status) {
      updates.status = normalizeLaborStatus(updates.status);
    }

    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE labor_records SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新人工记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM labor_records WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除人工记录失败' });
  }
});

// ============================================
// 工人管理 API (兼容前端 /labor/workers/* 路由)
// ============================================

/**
 * 获取所有工人列表
 * GET /api/labor/workers
 */
router.get('/workers', (req: Request, res: Response) => {
  try {
    const { name, position, department, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 工人信息存储在 employees 表
    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params: any[] = [];

    if (name) {
      sql += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }

    if (position) {
      sql += ' AND position_id = ?';
      params.push(position);
    }

    if (department) {
      sql += ' AND department_id = ?';
      params.push(department);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    const countSql = sql;
    sql += ' ORDER BY create_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const items = queryToObjects(db, sql, params);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取工人列表失败' });
  }
});

/**
 * 获取单个工人
 * GET /api/labor/workers/:id
 */
router.get('/workers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM employees WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '工人不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取工人详情失败' });
  }
});

/**
 * 创建工人
 * POST /api/labor/workers
 */
router.post('/workers', (req: Request, res: Response) => {
  try {
    const {
      id, employee_code, name, gender, phone, id_card,
      position_id, position_name, department_id, department_name,
      employee_type, hire_date, status, skills, remarks, create_by
    } = req.body;

    const newId = id || `EMP${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO employees (id, employee_code, name, gender, phone, id_card,
        position_id, position_name, department_id, department_name,
        employee_type, hire_date, status, skills, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, employee_code, name, gender, phone, id_card,
        position_id, position_name, department_id, department_name,
        employee_type, hire_date, status || 'active', skills ? JSON.stringify(skills) : null, remarks, create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建工人失败:', error);
    res.status(500).json({ success: false, error: '创建工人失败' });
  }
});

/**
 * 更新工人
 * PUT /api/labor/workers/:id
 */
router.put('/workers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 处理 skills 数组序列化
    if (updates.skills && Array.isArray(updates.skills)) {
      updates.skills = JSON.stringify(updates.skills);
    }

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE employees SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新工人失败' });
  }
});

/**
 * 删除工人
 * DELETE /api/labor/workers/:id
 */
router.delete('/workers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM employees WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除工人失败' });
  }
});

/**
 * 批量删除工人
 * DELETE /api/labor/workers/batch
 */
router.delete('/workers/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 ids 参数或 ids 不是数组' });
    }
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM employees WHERE id IN (${placeholders})`, ids);
    saveDatabase();
    res.json({ success: true, data: { deletedCount: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除工人失败' });
  }
});

/**
 * 搜索工人
 * GET /api/labor/workers/search?keyword=xxx
 */
router.get('/workers/search', (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ success: false, error: '缺少 keyword 参数' });
    }
    const db = getDatabase();
    const sql = `SELECT * FROM employees WHERE name LIKE ? OR employee_code LIKE ? OR phone LIKE ? ORDER BY create_time DESC`;
    const items = queryToObjects(db, sql, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '搜索工人失败' });
  }
});

/**
 * 按部门获取工人
 * GET /api/labor/workers/department/:deptId
 */
router.get('/workers/department/:deptId', (req: Request, res: Response) => {
  try {
    const { deptId } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE department_id = ? ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, [deptId]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取部门工人失败' });
  }
});

/**
 * 按岗位获取工人
 * GET /api/labor/workers/position/:positionId
 */
router.get('/workers/position/:positionId', (req: Request, res: Response) => {
  try {
    const { positionId } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE position_id = ? ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, [positionId]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取岗位工人失败' });
  }
});

/**
 * 按类型获取工人
 * GET /api/labor/workers/type/:employeeType
 */
router.get('/workers/type/:employeeType', (req: Request, res: Response) => {
  try {
    const { employeeType } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE employee_type = ? ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, [employeeType]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取类型工人失败' });
  }
});

/**
 * 按状态获取工人
 * GET /api/labor/workers/status/:status
 */
router.get('/workers/status/:status', (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE status = ? ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, [status]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取状态工人失败' });
  }
});

/**
 * 获取在职工人
 * GET /api/labor/workers/active
 */
router.get('/workers/active', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const sql = "SELECT * FROM employees WHERE status = 'active' ORDER BY create_time DESC";
    const items = queryToObjects(db, sql, []);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取在职工人失败' });
  }
});

/**
 * 获取离职工人
 * GET /api/labor/workers/left
 */
router.get('/workers/left', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const sql = "SELECT * FROM employees WHERE status = 'left' ORDER BY create_time DESC";
    const items = queryToObjects(db, sql, []);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取离职工人失败' });
  }
});

/**
 * 工人离职
 * POST /api/labor/workers/:id/leave
 */
router.post('/workers/:id/leave', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { leave_date, leave_reason } = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`UPDATE employees SET status = 'left', leave_date = ?, leave_reason = ?, update_time = ? WHERE id = ?`,
      [leave_date, leave_reason, now, id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '工人离职失败' });
  }
});

/**
 * 工人复职
 * POST /api/labor/workers/:id/rejoin
 */
router.post('/workers/:id/rejoin', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejoin_date } = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`UPDATE employees SET status = 'active', leave_date = NULL, leave_reason = NULL, update_time = ? WHERE id = ?`,
      [now, id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '工人复职失败' });
  }
});

/**
 * 获取工人统计
 * GET /api/labor/workers/stats
 */
router.get('/workers/stats', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const totalSql = 'SELECT COUNT(*) as total FROM employees';
    const activeSql = "SELECT COUNT(*) as active FROM employees WHERE status = 'active'";
    const leftSql = "SELECT COUNT(*) as left_count FROM employees WHERE status = 'left'";

    const totalResult = queryToObjects(db, totalSql, []);
    const activeResult = queryToObjects(db, activeSql, []);
    const leftResult = queryToObjects(db, leftSql, []);

    // 按类型统计
    const typeSql = 'SELECT employee_type, COUNT(*) as count FROM employees GROUP BY employee_type';
    const typeResult = queryToObjects(db, typeSql, []);

    // 按部门统计
    const deptSql = 'SELECT department_name, COUNT(*) as count FROM employees GROUP BY department_name';
    const deptResult = queryToObjects(db, deptSql, []);

    const byType: Record<string, number> = {};
    typeResult.forEach((item: any) => {
      byType[item.employee_type || 'unknown'] = item.count;
    });

    const byDepartment: Record<string, number> = {};
    deptResult.forEach((item: any) => {
      byDepartment[item.department_name || 'unknown'] = item.count;
    });

    res.json({
      success: true,
      data: {
        total: totalResult[0]?.total || 0,
        active: activeResult[0]?.active || 0,
        left: leftResult[0]?.left_count || 0,
        byType,
        byDepartment
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取工人统计失败' });
  }
});

/**
 * 获取工人技能标签列表
 * GET /api/labor/workers/skill-tags
 */
router.get('/workers/skill-tags', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const sql = 'SELECT DISTINCT skills FROM employees WHERE skills IS NOT NULL AND skills != ""';
    const items = queryToObjects(db, sql, []);

    const tagsSet = new Set<string>();
    items.forEach((item: any) => {
      if (item.skills) {
        try {
          const tags = JSON.parse(item.skills);
          if (Array.isArray(tags)) {
            tags.forEach((tag: string) => tagsSet.add(tag));
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    });

    res.json({ success: true, data: Array.from(tagsSet) });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取技能标签失败' });
  }
});

/**
 * 按技能标签获取工人
 * GET /api/labor/workers/skill-tag/:skillTag
 */
router.get('/workers/skill-tag/:skillTag', (req: Request, res: Response) => {
  try {
    const { skillTag } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM employees WHERE skills LIKE ? ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, [`%${skillTag}%`]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取技能工人失败' });
  }
});

/**
 * 获取工人培训记录
 * GET /api/labor/workers/:workerId/training-records
 */
router.get('/workers/:workerId/training-records', (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM training_records WHERE employee_id = ? ORDER BY training_date DESC';
    const items = queryToObjects(db, sql, [workerId]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取培训记录失败' });
  }
});

/**
 * 添加培训记录
 * POST /api/labor/workers/:workerId/training-records
 */
router.post('/workers/:workerId/training-records', (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const { id, training_date, training_type, training_content, result, score, remarks, create_by } = req.body;

    const newId = id || `TR${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO training_records (id, employee_id, training_date, training_type, training_content, result, score, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, workerId, training_date, training_type, training_content, result, score, remarks, create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    res.status(500).json({ success: false, error: '添加培训记录失败' });
  }
});

/**
 * 获取工人考核记录
 * GET /api/labor/workers/:workerId/assessment-records
 */
router.get('/workers/:workerId/assessment-records', (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM assessment_records WHERE employee_id = ? ORDER BY assessment_date DESC';
    const items = queryToObjects(db, sql, [workerId]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取考核记录失败' });
  }
});

/**
 * 添加考核记录
 * POST /api/labor/workers/:workerId/assessment-records
 */
router.post('/workers/:workerId/assessment-records', (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const { id, assessment_date, assessment_type, score, result, remarks, create_by } = req.body;

    const newId = id || `AR${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO assessment_records (id, employee_id, assessment_date, assessment_type, score, result, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, workerId, assessment_date, assessment_type, score, result, remarks, create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    res.status(500).json({ success: false, error: '添加考核记录失败' });
  }
});

/**
 * 获取工人工作经验
 * GET /api/labor/workers/:workerId/work-experiences
 */
router.get('/workers/:workerId/work-experiences', (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM work_experiences WHERE employee_id = ? ORDER BY start_date DESC';
    const items = queryToObjects(db, sql, [workerId]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取工作经验失败' });
  }
});

/**
 * 添加工作经验
 * POST /api/labor/workers/:workerId/work-experiences
 */
router.post('/workers/:workerId/work-experiences', (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const { id, company_name, position, start_date, end_date, job_description, remarks, create_by } = req.body;

    const newId = id || `WE${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO work_experiences (id, employee_id, company_name, position, start_date, end_date, job_description, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, workerId, company_name, position, start_date, end_date, job_description, remarks, create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    res.status(500).json({ success: false, error: '添加工作经验失败' });
  }
});

/**
 * 生成员工工号
 * GET /api/labor/workers/generate-id
 */
router.get('/workers/generate-id', (req: Request, res: Response) => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const code = `EMP${year}${month}${random}`;
    res.json({ success: true, data: code });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成工号失败' });
  }
});

/**
 * 批量导入员工
 * POST /api/labor/workers/import
 */
router.post('/workers/import', (req: Request, res: Response) => {
  try {
    const { workers } = req.body;
    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 workers 参数或 workers 不是有效数组' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    let successCount = 0;
    let failedCount = 0;

    for (const worker of workers) {
      try {
        const newId = worker.id || `EMP${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        db.run(`
          INSERT INTO employees (id, employee_code, name, gender, phone, id_card,
            position_id, position_name, department_id, department_name,
            employee_type, hire_date, status, skills, remarks, create_by, create_time, update_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newId,
          worker.employee_code,
          worker.name,
          worker.gender,
          worker.phone,
          worker.id_card,
          worker.position_id,
          worker.position_name,
          worker.department_id,
          worker.department_name,
          worker.employee_type,
          worker.hire_date,
          worker.status || 'active',
          worker.skills ? JSON.stringify(worker.skills) : null,
          worker.remarks,
          worker.create_by,
          now,
          now
        ]);
        successCount++;
      } catch (e) {
        failedCount++;
      }
    }

    saveDatabase();
    res.json({ success: true, data: { success: successCount, failed: failedCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量导入员工失败' });
  }
});

/**
 * 导出员工数据
 * GET /api/labor/workers/export
 */
router.get('/workers/export', (req: Request, res: Response) => {
  try {
    const { status, department, position } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM employees WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (department) {
      sql += ' AND department_id = ?';
      params.push(department);
    }
    if (position) {
      sql += ' AND position_id = ?';
      params.push(position);
    }

    sql += ' ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, params);

    // 生成 CSV
    if (items.length === 0) {
      return res.status(404).json({ success: false, error: '没有可导出的数据' });
    }

    const headers = ['工号', '姓名', '性别', '电话', '身份证', '岗位', '部门', '类型', '入职日期', '状态', '备注'];
    const fields = ['employee_code', 'name', 'gender', 'phone', 'id_card', 'position_name', 'department_name', 'employee_type', 'hire_date', 'status', 'remarks'];

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    for (const item of items) {
      const row = fields.map(field => {
        let value = item[field];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      });
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const filename = `employees_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, error: '导出员工数据失败' });
  }
});

export default router;
