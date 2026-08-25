/**
 * 农事任务 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 事务包裹助手（修复 P0-1：状态变更无事务导致脏数据）
 * - sql.js 支持 BEGIN IMMEDIATE（立即获取写锁，防止并发写竞争）
 * - 参考 cropOrder.ts:309 既有事务写法
 * - 失败自动 ROLLBACK，成功 COMMIT 后统一 saveDatabase()
 */
function runInTransaction(db: any, work: () => void): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    work();
    db.exec('COMMIT');
    saveDatabase();
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* ROLLBACK 失败不掩盖原异常 */ }
    throw err;
  }
}

// 任务状态值标准化映射（中文 -> 英文）
const TASK_STATUS_MAP: Record<string, string> = {
  '待处理': 'pending',
  '处理中': 'in_progress',
  '已完成': 'completed',
  '草稿': 'draft',
  '待接受': 'pending',
  '已接受': 'accepted',
  '进行中': 'in_progress',
  '待验收': 'waiting_acceptance',
  '返工中': 'rejected',
  '任务失败': 'failed',
  '已取消': 'cancelled',
  '已放弃': 'abandoned',
  'draft': 'draft',
  'pending': 'pending',
  'accepted': 'accepted',
  'in_progress': 'in_progress',
  'waiting_acceptance': 'waiting_acceptance',
  'completed': 'completed',
  'rejected': 'rejected',
  'failed': 'failed',
  'cancelled': 'cancelled',
  'abandoned': 'abandoned',
};

// 英文状态值到中文的映射
const TASK_STATUS_LABEL_MAP: Record<string, string> = {
  'draft': '草稿',
  'pending': '待接受',
  'accepted': '已接受',
  'in_progress': '进行中',
  'waiting_acceptance': '待验收',
  'completed': '已完成',
  'rejected': '返工中',
  'failed': '任务失败',
  'cancelled': '已取消',
  'abandoned': '已放弃',
};

/**
 * 标准化任务状态值（将中文转换为英文）
 */
function normalizeTaskStatus(status?: string): string {
  if (!status) return 'pending';
  return TASK_STATUS_MAP[status] || status;
}

/**
 * 获取状态显示标签
 */
function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABEL_MAP[status] || status;
}

/**
 * 转换数据库字段名为前端期望的字段名
 * queryToObjects 已将下划线字段转为驼峰格式，这里做补充映射
 */
function transformTaskFields(item: any): any {
  return {
    ...item,
    // 基础字段映射
    id: item.id || '',
    taskCode: item.taskCode || item.id || '',
    title: item.taskTitle || item.title || '',
    type: item.taskType || '',
    typeName: item.typeName || item.taskType || '',
    description: item.description || item.taskContent || '',
    // 状态
    status: item.status || 'pending',
    statusLabel: getTaskStatusLabel(item.status || 'pending'),
    priority: item.priority || 'normal',
    progress: item.progress || 0,
    // 执行人
    assigneeId: item.assigneeId || '',
    assigneeName: item.assigneeName || '',
    assignerId: item.assignerId || '',
    assignerName: item.assignerName || '',
    // 地块与作物
    greenhouseId: item.greenhouseId || '',
    greenhouseName: item.greenhouseName || '',
    field: item.greenhouseName || '',
    crop: item.crop || '',
    cropName: item.crop || '',
    areaName: item.areaName || '',
    // 计划时间
    planDate: item.planDate || '',
    planTime: item.planTime || '',
    planStart: item.planDate && item.planTime ? `${item.planDate} ${item.planTime}` : '',
    planEnd: item.planDate || '',
    dueDate: item.dueDate || item.planDate || '',
    // 任务工时
    estimatedHours: item.estimatedHours || 0,
    estimatedDays: item.estimatedDays || 0,
    // 批次
    batchId: item.batchId || '',
    batchCode: item.batchCode || '',
    // 来源
    sourceType: item.sourceType || 'dispatch',
    dispatchMode: item.dispatchMode || 'farm',
    sourceId: item.sourceId || '',
    sourceCode: item.sourceCode || '',
    sourceProblemId: item.sourceProblemId || '',
    sourceInspectionId: item.sourceInspectionId || '',
    // 反馈要求
    feedbackRequirements: parseJsonField(item.feedbackRequirements, []),
    requiredFeedback: parseJsonField(item.feedbackRequirements, []),
    // 返工
    reworkCount: item.reworkCount || 0,
    reworkHistory: parseJsonField(item.reworkHistory, []),
    // 延期
    deadlineExtensions: parseJsonField(item.deadlineExtensions, []),
    // 类型配置
    typeConfig: parseJsonField(item.typeConfig, {}),
    // SOP内容
    sopContent: item.sopContent || '',
    // 版本
    version: item.version || 1,
    // 时间戳
    createdAt: item.createTime || item.createdAt || '',
    updatedAt: item.updateTime || item.updatedAt || '',
    acceptedAt: item.acceptedAt || '',
    completedAt: item.completedAt || '',
    // 备注
    remarks: item.remarks || '',
    toolsRemarks: item.toolsRemarks || item.tools_remarks || '',
    // 班组
    teamId: item.teamId || item.team_id || '',
    teamName: item.teamName || item.team_name || '',
    // 物资工具（JSON字段）
    materials: parseJsonField(item.materials, []),
    tools: parseJsonField(item.tools, []),
    // 创建者
    createdBy: item.createBy || '',
  };
}

/** 安全解析JSON字段 */
function parseJsonField(value: any, defaultValue: any): any {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

/** P2-2：统一 JSON 序列化工具（消除 5 处重复的 Array.isArray/typeof===object 判断） */
function toDbJson(value: any, fallback: string = '[]'): string {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string') {
    // 已经是字符串，验证为合法 JSON 或返回原值
    if (value.startsWith('[') || value.startsWith('{')) {
      try { JSON.parse(value); return value; } catch { return fallback; }
    }
    return value;
  }
  return String(value);
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { task_type, status, assignee_name, greenhouse_name, keyword, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM farm_tasks WHERE 1=1';
    const params: any[] = [];

    if (task_type) {
      sql += ' AND task_type LIKE ?';
      params.push(`%${task_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (assignee_name) {
      sql += ' AND assignee_name LIKE ?';
      params.push(`%${assignee_name}%`);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // P1-6：keyword 全局搜索（任务编号 + 标题 + 执行人）
    if (keyword) {
      sql += ' AND (task_code LIKE ? OR task_title LIKE ? OR assignee_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    // 保存原始SQL用于count查询
    const countSql = sql;

    // 2026-08-25 fix：按状态优先级排序（待派工任务排最前，避免空 plan_date 排到最后被 LIMIT 漏掉）
    // CASE WHEN 优先级：waiting_acceptance=1（待接受）/ pending=2（待派工）/ 其他=3
    sql += ` ORDER BY
      CASE status
        WHEN 'waiting_acceptance' THEN 1
        WHEN 'pending' THEN 2
        ELSE 3
      END ASC,
      plan_date DESC,
      plan_time DESC`;

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    // 转换数据库字段名为前端期望的字段名
    const itemsWithLabels = items.map((item: any) => transformTaskFields(item));

    res.json({ success: true, data: itemsWithLabels, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取农事任务失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    // 转换字段并添加状态标签
    const transformedItem = transformTaskFields(item);

    res.json({ success: true, data: transformedItem });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取农事任务详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    // 支持前端发送的驼峰命名和后端的下划线命名（完整字段映射，确保数据不丢失）
    const {
      id,
      task_code, taskCode,
      task_title, taskTitle, title,
      task_type, taskType, type,
      task_content, taskContent,
      assignee_id, assigneeId,
      assignee_name, assigneeName,
      assigner_id, assignerId,
      assigner_name, assignerName,
      greenhouse_id, greenhouseId,
      greenhouse_name, greenhouseName,
      area_name, areaName,
      plan_date, planDate,
      plan_time, planTime,
      priority,
      status,
      create_by, createBy,
      due_date, dueDate,
      progress,
      crop, cropName,
      estimated_hours, estimatedHours,
      estimated_days, estimatedDays,
      remarks,
      materials,
      tools,
      batch_id, batchId,
      batch_code, batchCode,
      // 前端直接发送的字段名（createTask/useTasks.ts apiTaskData）
      planStart,
      planEnd,
      field,
      assignee,
      // 数据改造新增字段（落库保存）
      type_name, typeName,
      source_type, sourceType,
      dispatch_mode, dispatchMode,
      feedback_requirements, feedbackRequirements, requiredFeedback,
      rework_history, reworkHistory,
      deadline_extensions, deadlineExtensions,
      type_config, typeConfig,
      sop_content, sopContent,
      description,
      // 班组与工具备注
      team_id, teamId,
      team_name, teamName,
      tools_remarks, toolsRemarks,
      // 问题分派/巡查关联字段
      source_problem_id, sourceProblemId,
      source_inspection_id, sourceInspectionId,
      source_id, sourceId,
      source_code, sourceCode,
    } = req.body;

    // planStart/planEnd 是组合格式 "yyyy-MM-dd HH:mm"，拆分为 date 和 time
    const planStartVal = planStart || '';
    const planEndVal = planEnd || '';
    const finalPlanDate = plan_date || planDate || (planStartVal ? planStartVal.split(' ')[0] : '');
    const finalPlanTime = plan_time || planTime || (planStartVal ? planStartVal.split(' ')[1] || '' : '');

    const newId = id || task_code || taskCode || `NS${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now() % 1000).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO farm_tasks (
        id, task_code, task_title, task_type, task_content,
        assignee_id, assignee_name, assigner_id, assigner_name,
        greenhouse_id, greenhouse_name, area_name,
        plan_date, plan_time, priority, status, create_by, create_time, update_time,
        due_date, progress, crop, estimated_hours, estimated_days, remarks,
        materials, tools,
        batch_id, batch_code,
        type_name, source_type, dispatch_mode,
        feedback_requirements,
        rework_history, deadline_extensions,
        type_config, sop_content, description,
        team_id, team_name, tools_remarks,
        source_problem_id, source_inspection_id, source_id, source_code
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      task_code || taskCode || newId,
      task_title || taskTitle || title || '',
      task_type || taskType || type || '',
      task_content || taskContent || description || '',
      assignee_id || assigneeId || '',
      assignee_name || assigneeName || assignee || '',
      assigner_id || assignerId || '',
      assigner_name || assignerName || '',
      greenhouse_id || greenhouseId || '',
      greenhouse_name || greenhouseName || field || '',
      area_name || areaName || '',
      finalPlanDate,
      finalPlanTime,
      priority || 'normal',
      normalizeTaskStatus(status),
      create_by || createBy || 'system',
      now, now,
      due_date || dueDate || (planEndVal ? planEndVal.split(' ')[0] : null),
      progress || 0,
      crop || cropName || '',
      estimated_hours || estimatedHours || 0,
      estimated_days || estimatedDays || 0,
      remarks || '',
      // P2-2：统一 toDbJson() 序列化
      toDbJson(materials),
      toDbJson(tools),
      batch_id || batchId || newId,
      batch_code || batchCode || `PC-${newId}`,
      // 数据改造新增字段
      type_name || typeName || '',
      source_type || sourceType || 'dispatch',
      dispatch_mode || dispatchMode || 'farm',
      toDbJson(feedback_requirements || feedbackRequirements || requiredFeedback),
      toDbJson(rework_history || reworkHistory),
      toDbJson(deadline_extensions || deadlineExtensions),
      toDbJson(type_config || typeConfig, '{}'),
      sop_content || sopContent || '',
      description || '',
      team_id || teamId || "",
      team_name || teamName || "",
      tools_remarks || toolsRemarks || "",
      // 问题分派/巡查关联字段
      source_problem_id || sourceProblemId || null,
      source_inspection_id || sourceInspectionId || null,
      source_id || sourceId || null,
      source_code || sourceCode || null,
    ]);

    saveDatabase();

    // 查询刚创建的完整记录，返回给前端（避免Store乐观更新被空数据覆盖）
    // 使用 queryToObjects 自动将 snake_case 列名转为驼峰命名，确保 transformTaskFields 正确读取
    const createdItems = queryToObjects(db, 'SELECT * FROM farm_tasks WHERE id = ?', [newId]);
    if (createdItems && createdItems.length > 0) {
      const transformed = transformTaskFields(createdItems[0]);
      res.status(201).json({ success: true, data: transformed });
    } else {
      res.status(201).json({ success: true, data: { id: newId } });
    }
  } catch (error) {
    console.error('创建农事任务失败:', error);
    res.status(500).json({ success: false, error: '创建农事任务失败' });
  }
});

// 前端驼峰字段名 → 数据库下划线列名映射
const FIELD_NAME_MAP: Record<string, string> = {
  taskCode: 'task_code',
  taskTitle: 'task_title',
  taskType: 'task_type',
  taskContent: 'task_content',
  assigneeId: 'assignee_id',
  assigneeName: 'assignee_name',
  assignerId: 'assigner_id',
  assignerName: 'assigner_name',
  greenhouseId: 'greenhouse_id',
  greenhouseName: 'greenhouse_name',
  areaName: 'area_name',
  planDate: 'plan_date',
  planTime: 'plan_time',
  createBy: 'create_by',
  dueDate: 'due_date',
  estimatedHours: 'estimated_hours',
  estimatedDays: 'estimated_days',
  batchId: 'batch_id',
  batchCode: 'batch_code',
  sourceType: 'source_type',
  sourceId: 'source_id',
  acceptedAt: 'accepted_at',
  completedAt: 'completed_at',
  reworkCount: 'rework_count',
  reworkHistory: 'rework_history',
  deadlineExtensions: 'deadline_extensions',
  dispatchMode: 'dispatch_mode',
  feedbackRequirements: 'feedback_requirements',
  requiredFeedback: 'feedback_requirements',
  typeConfig: 'type_config',
  typeName: 'type_name',
  sopContent: 'sop_content',
  description: 'description',
  materials: 'materials',
  tools: 'tools',
  createTime: 'create_time',
  updateTime: 'update_time',
  crop: 'crop',
  cropName: 'crop',
  title: 'task_title',
  planStart: 'plan_date',
  planEnd: 'plan_date',
  teamId: 'team_id',
  teamName: 'team_name',
  team_id: 'team_id',
  team_name: 'team_name',
  toolsRemarks: 'tools_remarks',
  tools_remarks: 'tools_remarks',
  sourceProblemId: 'source_problem_id',
  source_problem_id: 'source_problem_id',
  sourceInspectionId: 'source_inspection_id',
  source_inspection_id: 'source_inspection_id',
  sourceCode: 'source_code',
  source_code: 'source_code',
};

/**
 * 将前端字段名转换为数据库列名
 */
function toDbColumnName(fieldName: string): string {
  return FIELD_NAME_MAP[fieldName] || fieldName;
}

/**
 * 将对象中的值转为可存储的格式（数组/对象 → JSON字符串）
 */
function toDbValue(value: any): any {
  if (value === undefined || value === null) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 对 status 字段进行标准化转换
    if (updates.status) {
      updates.status = normalizeTaskStatus(updates.status);
    }

    const db = getDatabase();

    // 过滤有效字段并转换为数据库列名
    // 过滤有效字段并转换为数据库列名（跳过不存在于 DB 的字段，避免 SQL 错误）
    const validDbColumns = new Set([
      'id', 'task_code', 'task_title', 'task_type', 'task_content',
      'assignee_id', 'assignee_name', 'assigner_id', 'assigner_name',
      'greenhouse_id', 'greenhouse_name', 'area_name',
      'plan_date', 'plan_time', 'priority', 'status',
      'completion_date', 'completion_note',
      'batch_id', 'batch_code', 'create_by',
      'version', 'create_time', 'update_time',
      'due_date', 'progress', 'crop', 'estimated_hours', 'estimated_days',
      'remarks', 'materials', 'tools',
      'type_name', 'source_type', 'dispatch_mode',
      'feedback_requirements', 'rework_history', 'deadline_extensions',
      'type_config', 'sop_content', 'description',
      'team_id', 'team_name', 'tools_remarks',
      'source_problem_id', 'source_inspection_id', 'source_id', 'source_code',
    ]);
    const validKeys = Object.keys(updates).filter(k => {
      if (k === 'id' || updates[k] === undefined) return false;
      const dbCol = toDbColumnName(k);
      return validDbColumns.has(dbCol);
    });

    if (validKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const setClauses = validKeys.map(k => `${toDbColumnName(k)} = ?`).join(', ');
    const values = validKeys.map(k => toDbValue(updates[k]));
    values.push(now, id);

    db.run(`UPDATE farm_tasks SET ${setClauses}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新农事任务失败:', error);
    res.status(500).json({ success: false, error: '更新农事任务失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM farm_tasks WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除农事任务失败' });
  }
});

/**
 * 根据任务编码获取任务
 */
router.get('/code/:taskCode', (req: Request, res: Response) => {
  try {
    const { taskCode } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE task_code = ?');
    stmt.bind([taskCode]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    item.statusLabel = getTaskStatusLabel(item.status || 'pending');
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取农事任务详情失败' });
  }
});

/**
 * 获取任务统计
 * P2-9：6 条独立 COUNT → 1 条 GROUP BY + 1 条 overdue（不同 WHERE 无法合并）
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // 一条查询搞定所有状态计数（替代 5 条独立 COUNT）
    const statusRows = queryToObjects(db,
      "SELECT status, COUNT(*) as cnt FROM farm_tasks GROUP BY status",
      []);
    const statusMap: Record<string, number> = {};
    let total = 0;
    for (const row of statusRows) {
      statusMap[row.status] = Number(row.cnt) || 0;
      total += Number(row.cnt) || 0;
    }

    // 逾期任务：已过期且未完成（不同 WHERE，单独查询）
    const today = new Date().toISOString().split('T')[0];
    const overdue = execCount(db,
      "SELECT COUNT(*) as count FROM farm_tasks WHERE plan_date < ? AND status NOT IN ('completed', 'cancelled', 'abandoned')",
      [today]);

    res.json({
      success: true,
      data: {
        total,
        pending: statusMap['pending'] || 0,
        inProgress: statusMap['in_progress'] || 0,
        waitingAcceptance: statusMap['waiting_acceptance'] || 0,
        completed: statusMap['completed'] || 0,
        overdue,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取任务统计失败' });
  }
});

/**
 * 按状态获取任务数量
 */
router.get('/count', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const db = getDatabase();

    if (status) {
      const count = execCount(db, 'SELECT COUNT(*) as count FROM farm_tasks WHERE status = ?', [status]);
      return res.json({ success: true, data: count });
    }

    const total = execCount(db, 'SELECT COUNT(*) as count FROM farm_tasks', []);
    res.json({ success: true, data: total });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取任务数量失败' });
  }
});

/**
 * 获取逾期任务列表
 */
router.get('/overdue', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const items = queryToObjects(db,
      "SELECT * FROM farm_tasks WHERE plan_date < ? AND status NOT IN ('completed', 'cancelled', 'abandoned') ORDER BY plan_date DESC",
      [today]);

    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: getTaskStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取逾期任务失败' });
  }
});

/**
 * 获取待接受的任务列表
 */
router.get('/pending', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db,
      "SELECT * FROM farm_tasks WHERE status = 'pending' ORDER BY plan_date DESC, plan_time DESC",
      []);

    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: getTaskStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取待接受任务失败' });
  }
});

/**
 * 获取进行中的任务列表
 */
router.get('/in-progress', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db,
      "SELECT * FROM farm_tasks WHERE status = 'in_progress' ORDER BY plan_date DESC, plan_time DESC",
      []);

    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: getTaskStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取进行中任务失败' });
  }
});

/**
 * 获取待验收的任务列表
 */
router.get('/waiting-acceptance', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db,
      "SELECT * FROM farm_tasks WHERE status = 'waiting_acceptance' ORDER BY plan_date DESC, plan_time DESC",
      []);

    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: getTaskStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取待验收任务失败' });
  }
});

// 批量操作路由必须在 /:id 之前定义，否则 /batch 会被当作 :id 参数

/**
 * 批量获取农事任务
 * GET /api/farm-tasks/batch?ids=id1,id2,id3
 */
router.get('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 ids 参数' });
    }

    const idArray = ids.split(',').filter(id => id.trim() !== '');
    if (idArray.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const db = getDatabase();
    const placeholders = idArray.map(() => '?').join(',');
    const sql = `SELECT * FROM farm_tasks WHERE id IN (${placeholders})`;
    const items = queryToObjects(db, sql, idArray);

    // 为每个item添加状态标签
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      statusLabel: getTaskStatusLabel(item.status || 'pending'),
    }));

    res.json({ success: true, data: itemsWithLabels });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量获取农事任务失败' });
  }
});

/**
 * 批量更新农事任务
 * PUT /api/farm-tasks/batch
 * P1-8：增加 toDbColumnName() 映射 + validDbColumns 过滤，与单条 PUT 保持一致
 */
router.put('/batch', (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 ids 参数或 ids 不是有效数组' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: '缺少 updates 参数或 updates 不是有效对象' });
    }

    const now = new Date().toISOString();
    const db = getDatabase();

    // 处理状态值标准化
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.status) {
      normalizedUpdates.status = normalizeTaskStatus(normalizedUpdates.status);
    }

    // P1-8：过滤有效字段 + 转 DB 列名（与单条 PUT 保持一致）
    const validDbColumns = new Set([
      'id', 'task_code', 'task_title', 'task_type', 'task_content',
      'assignee_id', 'assignee_name', 'assigner_id', 'assigner_name',
      'greenhouse_id', 'greenhouse_name', 'area_name',
      'plan_date', 'plan_time', 'priority', 'status',
      'completion_date', 'completion_note',
      'batch_id', 'batch_code', 'create_by',
      'version', 'create_time', 'update_time',
      'due_date', 'progress', 'crop', 'estimated_hours', 'estimated_days',
      'remarks', 'materials', 'tools',
      'type_name', 'source_type', 'dispatch_mode',
      'feedback_requirements', 'rework_history', 'deadline_extensions',
      'type_config', 'sop_content', 'description',
      'team_id', 'team_name', 'tools_remarks',
      'source_problem_id', 'source_inspection_id', 'source_id', 'source_code',
      'cancelled_at', 'cancelled_by', 'cancelled_reason',
      'abandoned_at', 'abandoned_by', 'abandoned_reason',
      'rejected_at', 'rejected_by', 'rejected_reason',
      'executor_reject_count', 'acceptance_record',
    ]);
    const validKeys = Object.keys(normalizedUpdates).filter(k => {
      if (k === 'id' || normalizedUpdates[k] === undefined) return false;
      const dbCol = toDbColumnName(k);
      return validDbColumns.has(dbCol);
    });

    if (validKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const fields = validKeys.map(k => `${toDbColumnName(k)} = ?`).join(', ');
    const values = validKeys.map(k => toDbValue(normalizedUpdates[k]));
    values.push(now);

    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE farm_tasks SET ${fields}, update_time = ? WHERE id IN (${placeholders})`, [...values, ...ids]);

    saveDatabase();
    res.json({ success: true, data: { ids, updated: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量更新农事任务失败' });
  }
});

/**
 * 批量删除任务
 * DELETE /api/farm-tasks/batch
 */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ success: false, error: '缺少ids参数' });
    }

    const idArray = ids.split(',').filter(id => id.trim());
    if (idArray.length === 0) {
      return res.status(400).json({ success: false, error: 'ids参数格式错误' });
    }

    const db = getDatabase();
    const placeholders = idArray.map(() => '?').join(',');
    db.run(`DELETE FROM farm_tasks WHERE id IN (${placeholders})`, idArray);
    saveDatabase();

    res.json({ success: true, data: { deleted: idArray.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除农事任务失败' });
  }
});

/**
 * 获取任务操作记录
 */
router.get('/:id/records', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const items = queryToObjects(db,
      'SELECT * FROM task_operation_records WHERE task_id = ? ORDER BY action_time DESC',
      [id]);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取任务操作记录失败' });
  }
});

/**
 * 导出所有任务操作记录（支持 today=true 获取今日记录）
 */
router.get('/records/export', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { start_date, end_date, action, task_code, today } = req.query;

    let sql = 'SELECT * FROM task_operation_records WHERE 1=1';
    const bindings: (string | number)[] = [];

    // 支持 today=true 参数获取今日记录
    if (today === 'true') {
      const todayStr = new Date().toISOString().slice(0, 10);
      sql += ' AND DATE(action_time) = ?';
      bindings.push(todayStr);
    } else {
      if (start_date) {
        sql += ' AND action_time >= ?';
        bindings.push(start_date as string);
      }

      if (end_date) {
        sql += ' AND action_time <= ?';
        bindings.push(end_date as string);
      }
    }

    if (action && action !== 'all') {
      sql += ' AND action = ?';
      bindings.push(action as string);
    }

    if (task_code) {
      sql += ' AND task_code LIKE ?';
      bindings.push(`%${task_code}%`);
    }

    sql += ' ORDER BY action_time DESC';

    const items: Record<string, unknown>[] = [];
    const stmt = db.prepare(sql);
    if (bindings.length > 0) {
      stmt.bind(bindings);
    }
    while (stmt.step()) {
      items.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('导出任务操作记录失败:', error);
    res.status(500).json({ success: false, error: '导出任务操作记录失败' });
  }
});

/**
 * 记录任务操作
 */
function recordTaskOperation(
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
  const id = `TOR${Date.now()}`;
  const now = new Date().toISOString();

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
 * 发布任务
 */
router.post('/:id/publish', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // P0-1：事务包裹 UPDATE + 操作记录 INSERT，避免脏数据
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'pending', update_time = ? WHERE id = ?`,
        [now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'publish', '发布任务', fromStatus, 'pending');
    });

    res.json({ success: true, data: { id, status: 'pending' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '发布任务失败' });
  }
});

/**
 * 撤回任务
 */
router.post('/:id/withdraw', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'draft', update_time = ? WHERE id = ?`,
        [now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'withdraw', '撤回任务', fromStatus, 'draft');
    });

    res.json({ success: true, data: { id, status: 'draft' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '撤回任务失败' });
  }
});

/**
 * 接受任务
 */
router.post('/:id/accept', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'accepted', accepted_at = ?, update_time = ? WHERE id = ?`,
        [now, now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'accept', '接受任务', fromStatus, 'accepted');
    });

    res.json({ success: true, data: { id, status: 'accepted' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '接受任务失败' });
  }
});

/**
 * 开始执行任务
 */
router.post('/:id/start', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'in_progress', update_time = ? WHERE id = ?`,
        [now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'start', '开始执行', fromStatus, 'in_progress');
    });

    res.json({ success: true, data: { id, status: 'in_progress' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '开始执行任务失败' });
  }
});

/**
 * 提交进度
 * P0-4：新增可选 status 字段，让进度推进时同步后端任务状态
 * （修复后端 status 不更新的 bug：前端状态机切到 in_progress/waiting_acceptance 后，
 *   后端 status 仍是 accepted，导致刷新/重进页面后状态丢失）
 */
router.post('/:id/progress', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { progress, feedback, operator_id, operator_name, comment, status } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const now = new Date().toISOString();
    const currentProgress = task.progress || 0;
    const newProgress = progress || currentProgress;

    // P0-4：如果传了 status 字段，UPDATE 时一并更新（状态机推进）
    // 若未传 status 则保持原 status 不变（向后兼容旧客户端）
    const normalizedStatus = status ? normalizeTaskStatus(status) : undefined;

    // P0-1：事务包裹；P0-4：可选 status
    runInTransaction(db, () => {
      if (normalizedStatus) {
        db.run(`UPDATE farm_tasks SET progress = ?, status = ?, update_time = ? WHERE id = ?`,
          [newProgress, normalizedStatus, now, id]);
      } else {
        db.run(`UPDATE farm_tasks SET progress = ?, update_time = ? WHERE id = ?`,
          [newProgress, now, id]);
      }

      // 将 feedback 对象转为 JSON 字符串存储
      const feedbackStr = feedback ? JSON.stringify(feedback) : undefined;
      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'progress', '提交进度',
        task.status, normalizedStatus || task.status, newProgress, comment, undefined, feedbackStr);
    });

    res.json({ success: true, data: { id, progress: newProgress, status: normalizedStatus || task.status } });
  } catch (error) {
    console.error('提交进度失败:', error);
    res.status(500).json({ success: false, error: '提交进度失败' });
  }
});

/**
 * 申请验收
 */
router.post('/:id/submit-acceptance', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name, comment, feedback } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'waiting_acceptance', progress = 100, update_time = ? WHERE id = ?`,
        [now, id]);

      // 将 feedback 对象转为 JSON 字符串存储
      const feedbackStr = feedback ? JSON.stringify(feedback) : undefined;
      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'submit', '申请验收', fromStatus, 'waiting_acceptance', 100, comment, undefined, feedbackStr);
    });

    res.json({ success: true, data: { id, status: 'waiting_acceptance' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '申请验收失败' });
  }
});

/**
 * 验收通过
 */
router.post('/:id/complete', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comments, operator_id, operator_name, actual_hours } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // 2026-08-22：AI-06 工时预测 — 收集实际工时（AI 训练 target）
    // 同时计算 estimated_vs_actual_ratio 供 AI 特征工程使用
    let actualHoursValue: number | null = null;
    let ratioValue: number | null = null;
    if (actual_hours !== undefined && actual_hours !== null) {
      const ah = Number(actual_hours);
      if (!isNaN(ah) && ah > 0) {
        actualHoursValue = ah;
        const estimated = Number(task.estimated_hours) || 0;
        if (estimated > 0) {
          ratioValue = ah / estimated;
        }
      }
    }

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'completed', completed_at = ?, progress = 100,
                                   actual_hours = ?, actual_hours_recorded_at = ?, actual_hours_recorded_by = ?,
                                   estimated_vs_actual_ratio = ?, update_time = ?
                                   WHERE id = ?`,
        [now, actualHoursValue, actualHoursValue ? now : null, actualHoursValue ? (operator_id || '') : null,
         ratioValue, now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'complete', '验收通过', fromStatus, 'completed', 100, comments);
    });

    res.json({ success: true, data: { id, status: 'completed', actual_hours: actualHoursValue, estimated_vs_actual_ratio: ratioValue } });
  } catch (error) {
    res.status(500).json({ success: false, error: '验收通过失败' });
  }
});

/**
 * 验收驳回（返工）
 */
router.post('/:id/reject', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();
    const reworkCount = (task.rework_count || 0) + 1;

    // 如果返工次数超过2次，则状态为 failed
    const newStatus = reworkCount >= 2 ? 'failed' : 'rejected';

    // P0-1：事务包裹
    // P1-9：驳回原因/操作人写入 rejected_* 审计列
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = ?, rework_count = ?, update_time = ?, rejected_at = ?, rejected_by = ?, rejected_reason = ? WHERE id = ?`,
        [newStatus, reworkCount, now, now, operator_id || '', reason || '', id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'reject', '验收驳回', fromStatus, newStatus, undefined, reason);
    });

    res.json({ success: true, data: { id, status: newStatus, reworkCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: '验收驳回失败' });
  }
});

/**
 * 返工后继续执行 — rejected → in_progress
 * 2026-08-02 补：前端 continueExecution 一直在调用此端点但后端从未注册
 */
router.post('/:id/continue', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) task = stmt.getAsObject();
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'in_progress', update_time = ? WHERE id = ?`, [now, id]);
      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'continue', '继续执行', fromStatus, 'in_progress');
    });

    res.json({ success: true, data: { id, status: 'in_progress' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '继续执行失败' });
  }
});

/**
 * 取消任务
 */
router.post('/:id/cancel', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    // P1-9：取消原因/操作人写入 cancelled_* 审计列
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'cancelled', update_time = ?, cancelled_at = ?, cancelled_by = ?, cancelled_reason = ? WHERE id = ?`,
        [now, now, operator_id || '', reason || '', id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'cancel', '取消任务', fromStatus, 'cancelled', undefined, reason);
    });

    res.json({ success: true, data: { id, status: 'cancelled' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '取消任务失败' });
  }
});

/**
 * 放弃任务
 */
router.post('/:id/abandon', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    // P1-9：放弃原因/操作人写入 abandoned_* 审计列
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'abandoned', update_time = ?, abandoned_at = ?, abandoned_by = ?, abandoned_reason = ? WHERE id = ?`,
        [now, now, operator_id || '', reason || '', id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'abandon', '放弃任务', fromStatus, 'abandoned', undefined, reason);
    });

    res.json({ success: true, data: { id, status: 'abandoned' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '放弃任务失败' });
  }
});

/**
 * 超时继续
 */
router.post('/:id/overtime-continue', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name, newDeadline } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const now = new Date().toISOString();

    let sql = 'UPDATE farm_tasks SET update_time = ?';
    const params: any[] = [now];

    if (newDeadline) {
      sql += ', due_date = ?';
      params.push(newDeadline);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(sql, params);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'overtime_continue', '超时继续', task.status, task.status);
    });

    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '超时继续失败' });
  }
});

/**
 * 超时放弃
 */
router.post('/:id/overtime-abandon', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const fromStatus = task.status;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    // P1-9：超时放弃原因/操作人写入 abandoned_* 审计列
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'abandoned', update_time = ?, abandoned_at = ?, abandoned_by = ?, abandoned_reason = ? WHERE id = ?`,
        [now, now, operator_id || '', reason || '', id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'overtime_abandon', '超时放弃', fromStatus, 'abandoned', undefined, reason);
    });

    res.json({ success: true, data: { id, status: 'abandoned' } });
  } catch (error) {
    res.status(500).json({ success: false, error: '超时放弃失败' });
  }
});

/**
 * 重新派发任务
 */
router.post('/:id/reassign', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assigneeId, assigneeName, operator_id, operator_name, reason } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET assignee_id = ?, assignee_name = ?, status = 'pending', update_time = ? WHERE id = ?`,
        [assigneeId, assigneeName, now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'reassign', '重新派发', task.status, 'pending', undefined, reason);
    });

    res.json({ success: true, data: { id, assigneeId, assigneeName } });
  } catch (error) {
    res.status(500).json({ success: false, error: '重新派发任务失败' });
  }
});

/**
 * 延期任务
 */
router.post('/:id/extend-deadline', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newDeadline, reason, operator_id, operator_name } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET due_date = ?, update_time = ? WHERE id = ?`,
        [newDeadline, now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'extend_deadline', '延期', task.status, task.status, undefined, reason);
    });

    res.json({ success: true, data: { id, dueDate: newDeadline } });
  } catch (error) {
    res.status(500).json({ success: false, error: '延期任务失败' });
  }
});

/**
 * 催办任务
 */
router.post('/:id/remind', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operator_id, operator_name, message } = req.body;

    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let task: any = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
    }
    stmt.free();

    if (!task || Object.keys(task).length === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    // P0-1：事务包裹（只有操作记录写入，但仍包事务保证一致性）
    runInTransaction(db, () => {
      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'remind', '催办', task.status, task.status, undefined, message);
    });

    res.json({ success: true, data: { id, reminded: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: '催办任务失败' });
  }
});

export default router;
