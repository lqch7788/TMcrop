/**
 * 临时任务 API 路由
 * 提供临时任务的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 生成临时任务编码
 * 格式: TT + YYYYMMDD + - + 3位流水号 (如 TT20260418-001)
 * 流水号按当日自增（查询当日 MAX+1）
 */
function generateTempTaskCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 查询当日最大序号: TT + 8位日期 + - + 3位序号 = 14 字符
  const db = getDatabase();
  const pattern = `TT${dateStr}-___`;
  const stmt = db.prepare(`
    SELECT task_code FROM temp_tasks
    WHERE task_code LIKE ? AND LENGTH(task_code) = 14
    ORDER BY task_code DESC LIMIT 1
  `);
  stmt.bind([pattern]);
  let maxSerial = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { task_code: string };
    maxSerial = parseInt(row.task_code.slice(-3), 10) || 0;
  }
  stmt.free();

  const seq = String(maxSerial + 1).padStart(3, '0');
  return `TT${dateStr}-${seq}`;
}

/**
 * 获取临时任务列表
 * GET /api/temp-tasks
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { task_type, status, assignee_name, greenhouse_name, priority, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM temp_tasks WHERE 1=1';
    const params: (string | number)[] = [];

    if (task_type) {
      sql += ' AND task_type LIKE ?';
      params.push(`%${task_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (assignee_name) {
      sql += ' AND assignee_name LIKE ?';
      params.push(`%${assignee_name}%`);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority as string);
    }

    const countSql = sql;
    sql += ' ORDER BY request_date DESC, request_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取临时任务列表失败:', error);
    res.status(500).json({ success: false, error: '获取临时任务列表失败' });
  }
});

/**
 * 获取单个临时任务详情
 * GET /api/temp-tasks/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取临时任务详情失败:', error);
    res.status(500).json({ success: false, error: '获取临时任务详情失败' });
  }
});

/**
 * 创建临时任务
 * POST /api/temp-tasks
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, task_code, task_title, task_type, task_content,
      requester_id, requester_name, assignee_id, assignee_name,
      greenhouse_id, greenhouse_name, area_name,
      request_date, request_time, priority, status,
      completion_date, completion_note, remarks, create_by, description,
      // 新增字段
      due_date, urgency, estimated_hours, estimated_days,
      worker_count, actual_hours, progress, reject_count,
      reject_reason, acceptance_remarks, title, location,
      // 状态流转字段（与农事任务一致）
      start_time, accepted_at, completed_at, version,
      assigner_id, assigner_name, source_type, dispatch_mode,
      // 必填反馈
      required_feedback,
    } = req.body;

    const newId = id || `TT${Date.now()}`;
    const now = new Date().toISOString();
    const taskCode = task_code || generateTempTaskCode();

    const db = getDatabase();
    db.run(`
      INSERT INTO temp_tasks (
        id, task_code, task_title, task_type, task_content,
        requester_id, requester_name, assignee_id, assignee_name,
        greenhouse_id, greenhouse_name, area_name,
        request_date, request_time, priority, status,
        completion_date, completion_note, remarks, create_by,
        create_time, update_time, due_date, urgency,
        estimated_hours, estimated_days, worker_count,
        actual_hours, progress, reject_count, reject_reason,
        acceptance_remarks, title, location,
        start_time, accepted_at, completed_at, version,
        assigner_id, assigner_name, source_type, dispatch_mode,
        required_feedback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, taskCode, task_title || title, task_type, task_content || description,
      requester_id, requester_name, assignee_id, assignee_name,
      greenhouse_id, greenhouse_name, area_name,
      request_date || now.substring(0, 10),
      request_time || now.substring(11, 19),
      priority || 'medium', status || 'pending',
      completion_date, completion_note, remarks, create_by,
      now, now,
      due_date, urgency || 'normal',
      estimated_hours ?? 0, estimated_days ?? 0, worker_count ?? 1,
      actual_hours ?? 0, progress ?? 0, reject_count ?? 0,
      reject_reason, acceptance_remarks,
      title || task_title, location || area_name,
      start_time || null, accepted_at || null,
      completed_at || null, version || 1,
      assigner_id || requester_id, assigner_name || requester_name,
      source_type || 'tempTask', dispatch_mode || 'tempTask',
      // 如果前端已序列化为 JSON 字符串则直接使用，否则序列化数组
      typeof required_feedback === 'string' ? required_feedback : JSON.stringify(required_feedback || []),
    ]);

    // 记录创建/分派操作
    recordTempTaskOperation(db, newId, taskCode, task_title || title || '',
      assigner_id || requester_id || '', assigner_name || requester_name || '',
      'create', '创建任务', undefined, status || 'pending');

    saveDatabase();

    // 读取完整记录返回
    const created = queryToObjects(db, `SELECT * FROM temp_tasks WHERE id = ?`, [newId]);
    const data = created.length > 0 ? created[0] : { id: newId, task_code: taskCode };
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('创建临时任务失败:', error);
    res.status(500).json({ success: false, error: '创建临时任务失败' });
  }
});

/**
 * 记录临时任务操作流水
 */
function recordTempTaskOperation(
  db: any,
  taskId: string,
  taskCode: string,
  taskTitle: string,
  operatorId: string,
  operatorName: string,
  action: string,
  actionName: string,
  fromStatus: string | undefined,
  toStatus: string,
  progress?: number,
  comment?: string,
  reason?: string,
  feedback?: string
) {
  const id = `TTO${Date.now()}`;
  const now = new Date().toISOString();

  console.log('[recordTempTaskOperation] 插入记录:', {
    id, taskId, operatorId, operatorName, action, actionName,
    fromStatus, toStatus, progress, comment, feedback
  });

  db.run(`
    INSERT INTO task_operation_records (id, task_id, task_code, task_title, operator_id, operator_name,
      action, action_name, from_status, to_status, progress, comment, reason, feedback, action_time, create_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, taskId, taskCode, taskTitle, operatorId, operatorName, action, actionName,
      fromStatus !== undefined ? fromStatus : null, toStatus,
      progress !== undefined ? progress : null,
      comment !== undefined ? comment : null,
      reason !== undefined ? reason : null,
      feedback !== undefined ? feedback : null, now, now]);
}

/**
 * 获取临时任务操作记录
 * GET /api/temp-tasks/:id/records
 */
router.get('/:id/records', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[GET /temp-tasks/:id/records] id =', id);
    const db = getDatabase();

    // 先检查 task_operation_records 表中有什么记录
    const allRecords = queryToObjects(db, 'SELECT id, task_id, action, action_time FROM task_operation_records LIMIT 5');
    console.log('[GET /temp-tasks/:id/records] 表中前5条记录:', allRecords);

    const items = queryToObjects(db,
      'SELECT * FROM task_operation_records WHERE task_id = ? ORDER BY action_time DESC',
      [id]);
    console.log('[GET /temp-tasks/:id/records] 查询结果, id=', id, '记录数:', items.length);

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('[GET /temp-tasks/:id/records] 错误:', error);
    res.status(500).json({ success: false, error: '获取任务操作记录失败' });
  }
});

/**
 * 接受临时任务
 * POST /api/temp-tasks/:id/accept
 */
router.post('/:id/accept', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name } = req.body;

    console.log('[accept] 接收到的参数:', { id, operator_id, operator_name });

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    db.run(`UPDATE temp_tasks SET status = 'accepted', accepted_at = ?, update_time = ? WHERE id = ?`,
      [now, now, id]);

    recordTempTaskOperation(db, id, task.task_code, task.task_title || task.title,
      operator_id || '', operator_name || '', 'accept', '接受任务',
      fromStatus, 'accepted', undefined, '已接受任务');

    saveDatabase();
    res.json({ success: true, data: { id, status: 'accepted' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '接受任务失败' });
  }
});

/**
 * 提交进度
 * POST /api/temp-tasks/:id/submit-progress
 */
router.post('/:id/submit-progress', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { progress, operator_id, operator_name, comment, feedback } = req.body;

    console.log('[submit-progress] 接收到的参数:', {
      id,
      progress,
      progressType: typeof progress,
      operator_id,
      operator_name,
      comment,
      feedback,
    });

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();
    const currentProgress = task.progress || 0;
    const progressNum = Number(progress);

    // 更新进度
    db.run(`UPDATE temp_tasks SET progress = ?, update_time = ? WHERE id = ?`,
      [progressNum, now, id]);

    // 根据进度决定状态变更
    let toStatus = fromStatus;
    if (progressNum >= 100) {
      // 进度100%：状态改为待验收
      toStatus = 'waiting_acceptance';
      db.run(`UPDATE temp_tasks SET status = 'waiting_acceptance', update_time = ? WHERE id = ?`,
        [now, id]);
    } else if (progressNum === 0 && fromStatus === 'accepted') {
      // 开始执行（0%）：状态从已接受改为进行中
      toStatus = 'in_progress';
      db.run(`UPDATE temp_tasks SET status = 'in_progress', update_time = ? WHERE id = ?`,
        [now, id]);
    }

    // 将 feedback 对象转为 JSON 字符串存储
    const feedbackStr = feedback ? JSON.stringify(feedback) : undefined;
    // 根据进度决定操作名称
    let actionName = '进度更新';
    if (progressNum === 0) {
      actionName = '开始执行';
    } else if (progressNum >= 100) {
      actionName = '提交验收';
    }
    console.log('[submit-progress] 即将记录操作:', {
      progress,
      progressNum,
      actionName,
      fromStatus,
      toStatus,
    });
    recordTempTaskOperation(db, id, task.task_code, task.task_title || task.title,
      operator_id || '', operator_name || '', 'submit_progress', actionName,
      fromStatus, toStatus,
      progress, comment || (progressNum >= 100 ? '处理完成，提交验收' : (progressNum === 0 ? '开始执行任务' : '进度更新')), undefined, feedbackStr);

    saveDatabase();
    res.json({ success: true, data: { id, progress: progress || currentProgress } });
  } catch (error) {
    res.status(500).json({ success: false, error: '提交进度失败' });
  }
});

/**
 * 验收通过（完成）
 * POST /api/temp-tasks/:id/complete
 */
router.post('/:id/complete', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name, acceptance_remarks } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    db.run(`UPDATE temp_tasks SET status = 'completed', completed_at = ?, update_time = ? WHERE id = ?`,
      [now, now, id]);

    recordTempTaskOperation(db, id, task.task_code, task.task_title || task.title,
      operator_id || '', operator_name || '', 'complete', '验收通过',
      fromStatus, 'completed', 100, acceptance_remarks || '验收通过');

    saveDatabase();
    res.json({ success: true, data: { id, status: 'completed' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '验收失败' });
  }
});

/**
 * 验收返工
 * POST /api/temp-tasks/:id/reject
 */
router.post('/:id/reject', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name, reject_reason } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    db.run(`UPDATE temp_tasks SET status = 'rejected', update_time = ? WHERE id = ?`,
      [now, id]);

    recordTempTaskOperation(db, id, task.task_code, task.task_title || task.title,
      operator_id || '', operator_name || '', 'reject', '验收驳回',
      fromStatus, 'rejected', undefined,
      reject_reason ? `返工原因：${reject_reason}` : '验收不通过，需要返工');

    saveDatabase();
    res.json({ success: true, data: { id, status: 'rejected' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '返工操作失败' });
  }
});

/**
 * 更新临时任务
 * PUT /api/temp-tasks/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 查询当前任务状态
    const stmt = db.prepare('SELECT * FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    // 有效数据库列名（与 temp_tasks 表结构一致）
    const validDbColumns = new Set([
      'id', 'task_code', 'task_title', 'task_type', 'task_content',
      'requester_id', 'requester_name', 'assignee_id', 'assignee_name',
      'greenhouse_id', 'greenhouse_name', 'area_name',
      'request_date', 'request_time', 'priority', 'status',
      'due_date', 'completion_date', 'completion_note', 'remarks',
      'create_by', 'create_time', 'update_time',
      'estimated_hours', 'worker_count', 'actual_hours', 'progress',
      'reject_count', 'urgency', 'estimated_days',
      'reject_reason', 'acceptance_remarks', 'operation_records',
      'title', 'location',
      // 状态流转列
      'start_time', 'accepted_at', 'completed_at', 'version',
      'assigner_id', 'assigner_name', 'source_type', 'dispatch_mode',
      'required_feedback',
    ]);
    // camelCase → snake_case 简单转换
    const toSnakeCase = (str: string): string =>
      str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const toDbColumnName = (k: string): string => {
      // 如果已经是 snake_case 且存在于有效列中，直接返回
      if (validDbColumns.has(k)) return k;
      // 尝试 camelCase → snake_case 转换
      const snake = toSnakeCase(k);
      if (validDbColumns.has(snake)) return snake;
      return k;
    };

    const validKeys = Object.keys(updates).filter(k => {
      if (k === 'id' || updates[k] === undefined) return false;
      return validDbColumns.has(toDbColumnName(k));
    });

    if (validKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const setClauses = validKeys.map(k => `${toDbColumnName(k)} = ?`).join(', ');
    const values = validKeys.map(k => {
      const dbKey = toDbColumnName(k);
      // required_feedback 存储为 JSON 字符串
      if (dbKey === 'required_feedback' && Array.isArray(updates[k])) {
        return JSON.stringify(updates[k]);
      }
      return updates[k];
    });
    values.push(now, id);

    db.run(`UPDATE temp_tasks SET ${setClauses}, update_time = ? WHERE id = ?`, values);

    // 检测状态变更并记录
    const oldStatus = task.status;
    const newStatus = updates.status || oldStatus;
    const oldAssigneeId = task.assignee_id;
    const newAssigneeId = updates.assignee_id || oldAssigneeId;
    const oldAssigneeName = task.assignee_name;
    const newAssigneeName = updates.assignee_name || oldAssigneeName;

    // 状态变更记录
    if (oldStatus !== newStatus) {
      let actionName = '状态更新';
      if (newStatus === 'pending') actionName = '撤回任务';
      else if (newStatus === 'accepted') actionName = '接受任务';
      else if (newStatus === 'in_progress') actionName = '开始执行';
      else if (newStatus === 'waiting_acceptance') actionName = '提交验收';
      else if (newStatus === 'completed') actionName = '验收通过';
      else if (newStatus === 'rejected') actionName = '验收返工';
      else if (newStatus === 'cancelled') actionName = '取消任务';
      // 如果 operator_id 为空，使用任务的 assignee 信息
      const operatorId = updates.operator_id || task.assignee_id || task.assigner_id || '';
      const operatorName = updates.operator_name || task.assignee_name || task.assigner_name || '';
      recordTempTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operatorId, operatorName,
        'status_change', actionName, oldStatus, newStatus);
    }

    // 重新分派记录
    if (oldAssigneeId !== newAssigneeId && updates.reassign === true) {
      // 如果 operator_id 为空，使用任务的 assignee 信息
      const operatorId = updates.operator_id || task.assignee_id || task.assigner_id || '';
      const operatorName = updates.operator_name || task.assignee_name || task.assigner_name || '';
      recordTempTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operatorId, operatorName,
        'reassign', '重新分派', oldStatus, newStatus, undefined,
        `重新分派给 ${newAssigneeName} 处理`);
    }

    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新临时任务失败:', error);
    res.status(500).json({ success: false, error: '更新临时任务失败' });
  }
});

/**
 * 删除临时任务
 * DELETE /api/temp-tasks/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查任务是否存在
    const stmt = db.prepare('SELECT status FROM temp_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: Record<string, unknown> | null = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task) {
      return res.status(404).json({ success: false, error: '临时任务不存在' });
    }

    db.run('DELETE FROM temp_tasks WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除临时任务失败:', error);
    res.status(500).json({ success: false, error: '删除临时任务失败' });
  }
});

export default router;
