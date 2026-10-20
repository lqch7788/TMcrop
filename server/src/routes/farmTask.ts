/**
 * 农事任务 API 路由
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
// v0.3 前置 3 + 前置 5：租户上下文 + RBAC 权限守卫
import { tenantContext } from '../middleware/tenantContext';
import { permissionGuard } from '../middleware/permissionGuard';
// 2026-10-12 P2 (IS-NEW-159) 修复：拒绝/撤回原因长度仅前端校验，绕过即 500；后端补 zod min(6)
import { z } from 'zod';
// 2026-10-20 P0-10：后端权威状态转移守卫（此前转移表只在前端，后端 17 个流转端点零守卫）
import { assertTaskTransition } from '../constants';

const router = Router();

// v0.3 阶段 4：注入租户上下文（仅追加 req.tenantId，不改现有行为）
// 注意：现有 handler 不依赖 req.tenantId，所以不破坏任何现有功能
router.use(tenantContext);

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

/**
 * 2026-10-20：静态单段路由名白名单。
 *
 * Express 按注册顺序匹配，`/:id` 会把 `/batch`、`/stats` 等**单段静态路径**当成 id 吃掉
 * （实测：PUT /farm-tasks/batch 落到 PUT /:id，返回"没有需要更新的字段"；
 *   DELETE /farm-tasks/batch 返回"农事任务不存在"）。
 * 由于这些静态路由定义在 `/:id` 之后，本文件在三个参数路由入口统一做一次"让行"：
 * 命中白名单就 next()，交给后面真正的静态路由处理。
 */
const STATIC_ROUTE_SEGMENTS = new Set([
  'batch',
  'stats',
  'count',
  'overdue',
  'pending',
  'in-progress',
  'waiting-acceptance',
]);

/**
 * 2026-10-20 P0-10：状态转移守卫
 * 非法转移返回 409，并说明允许的目标状态（此前后端零守卫，直调 API 可把 completed 改回 pending）
 */
function guardTransition(res: Response, from: string, to: string): boolean {
  try {
    assertTaskTransition(from, to);
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[farmTask] 拦截非法状态转移:', message);
    res.status(409).json({ success: false, error: message });
    return false;
  }
}

// 2026-10-12 P2 (IS-NEW-159) 修复：withdraw reason 长度校验 schema（min 6 字符）
const ReasonSchema = z.object({
  reason: z.string().min(6, '原因至少 6 个字符').max(500),
});

/**
 * 2026-10-20：驳回原因**取消最小字数限制**（用户要求）。
 *   只保留 500 字上限，防止异常超长文本；空内容仍由前端按钮禁用兜底。
 *   与 ReasonSchema 分开，避免影响撤回（撤回仍要求 >= 6 字）。
 */
const RejectReasonSchema = z.object({
  reason: z.string().max(500),
});

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
    // 2026-08-29：AI 训练样本标记（synthesize_historical_tasks.py 生成的 synthetic=1 数据）
    //   前端 useFarmHub 用此字段过滤，避免 AI 样本污染"农事任务中心"列表
    synthetic: item.synthetic ?? 0,
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
    const { task_type, status, assignee_name, greenhouse_name, keyword, page = 1, limit = 200 } = req.query;
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
    // 2026-08-30 fix：第二排序键由 plan_date DESC 改为 update_time DESC
    //   原 plan_date DESC 让"刚发布的任务（plan_date=今天）"排到最后，因为 plan_date 是历史默认值
    //   改 update_time DESC 后，新创建/状态变化/刚完成的任务排最前，不再被 limit=50 截断
    //   例：NS20260829-001 plan_date='2026-08-01' 但 update_time='2026-08-29' → 排到前部
    sql += ` ORDER BY
      CASE status
        WHEN 'waiting_acceptance' THEN 1
        WHEN 'pending' THEN 2
        ELSE 3
      END ASC,
      update_time DESC`;

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

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  // 静态路由让行（/batch /stats /count …），否则会被当成 id
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const { id } = req.params;
    const db = getDatabase();
    // 2026-09-22 修复：与 List 路由保持一致，用 queryToObjects 自动 mapToCamelCase，
    //   否则 transformTaskFields 读驼峰字段名会全部丢空（assigneeId/Name/assigner/.../reworkCount）
    const items = queryToObjects(db, 'SELECT * FROM farm_tasks WHERE id = ?', [id]);
    const item = items[0] || null;

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
      // P0-5：种植实例 / 生产计划关联
      planting_id, plantingId,
      production_plan_id, productionPlanId,
      production_plan_code, productionPlanCode,
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
        planting_id, production_plan_id, production_plan_code,
        type_name, source_type, dispatch_mode,
        feedback_requirements,
        rework_history, deadline_extensions,
        type_config, sop_content, description,
        team_id, team_name, tools_remarks,
        source_problem_id, source_inspection_id, source_id, source_code
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      // P0-5：不再编造批次（旧逻辑 batch_id 默认=自身 id、batch_code 默认='PC-'+自身 id，
      //   导致 22 条任务的批次字段全为无意义自引用）
      batch_id || batchId || null,
      batch_code || batchCode || null,
      planting_id || plantingId || null,
      production_plan_id || productionPlanId || null,
      production_plan_code || productionPlanCode || null,
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

    // 2026-10-10（审核修复）：任务由问题分派创建时（source_problem_id 有值），把真实任务 id
    //   回写到问题的 source_task_id —— 前端 createTask 同步返回的是乐观 TEMP- id（真实 id
    //   由本端点生成），此前持久化的乐观 id 让"关联任务"全部悬空（28/28 实测），读取侧只能
    //   靠 findTaskByProblem 兜底。此处以服务端回写为唯一写入者（无竞态）
    const linkedProblemId = source_problem_id || sourceProblemId;
    if (linkedProblemId) {
      db.run('UPDATE problems SET source_task_id = ?, update_time = ? WHERE id = ?', [newId, now, linkedProblemId]);
    }

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
  // 2026-10-10（审核修复）：补两个缺失的 camelCase 映射 —— 此前前端乐观更新携带的
  //   executorRejectCount / rejectReason 因无映射被 PUT 静默丢弃（console.warn 噪音），
  //   导致"拒绝 2 次必须换人"的计数永远写不进 DB、执行人拒绝原因丢失（实测确认）
  executorRejectCount: 'executor_reject_count',
  rejectReason: 'rejected_reason',
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
 * farm_tasks 允许写入的列白名单（2026-09-21 重建，单条 PUT 与批量 PUT 共用）
 *
 * 背景：此前单条 PUT（:540）与批量 PUT（:853）各维护了一份白名单，且都已严重过时——
 *   单条缺 30 列、批量缺 19 列，导致 completed_at / accepted_at / cancelled_* /
 *   abandoned_* / rejected_* / executor_reject_count / acceptance_record 等
 *   状态流转字段在写库时被静默丢弃。表现包括：
 *     · 验收通过后完成时间不落库 → completed_at 为 NULL → "今日完成"统计恒为 0
 *     · 撤回原因、放弃原因、驳回原因写入后被丢弃 → 事后无法追溯
 *     · executor_reject_count 恒为 undefined → "拒绝 2 次必须换人"规则永不触发
 *
 * 现按表实际 78 列重建，仅排除两个不应由前端写入的列：
 *   tenant_id —— 多租户隔离字段
 *   synthetic —— AI 训练样本标记（由离线脚本写入）
 *
 * 白名单的职责是「列名校验，防 SQL 注入」，业务约束应在各自 handler 内单独判断。
 */
const FARM_TASK_DB_COLUMNS = new Set<string>([
  'id', 'task_code', 'task_title', 'title', 'task_type', 'task_content', 'description',
  'assignee_id', 'assignee_name', 'assigner_id', 'assigner_name', 'create_by', 'create_by_id',
  'greenhouse_id', 'greenhouse_name', 'area_name', 'crop',
  'plan_date', 'plan_time', 'due_date', 'priority', 'status', 'progress', 'progress_pct',
  'batch_id', 'batch_code', 'team_id', 'team_name',
  'completion_date', 'completion_note', 'completed_at', 'accepted_at',
  'cancelled_at', 'cancelled_by', 'cancelled_reason',
  'abandoned_at', 'abandoned_by', 'abandoned_reason',
  'rejected_at', 'rejected_by', 'rejected_reason',
  'rework_count', 'rework_history', 'executor_reject_count', 'acceptance_record',
  'paused_at', 'resumed_at', 'current_pause_reason', 'total_pause_seconds',
  'actual_start_at', 'actual_end_at', 'actual_hours', 'actual_hours_recorded_at',
  'actual_hours_recorded_by', 'estimated_hours', 'estimated_days', 'estimated_vs_actual_ratio',
  // P0-8：实际作业面积（亩）→ 亩均成本
  'actual_area',
  // P0-5：种植实例 / 生产计划关联
  'planting_id', 'production_plan_id', 'production_plan_code',
  'dispatch_mode', 'source_type', 'source_id', 'source_code',
  'source_problem_id', 'source_inspection_id',
  'feedback_requirements', 'deadline_extensions', 'type_config', 'type_name', 'sop_content',
  'materials', 'tools', 'tools_remarks', 'remarks', 'outsource_cost',
  'version', 'create_time', 'update_time',
]);

/**
 * 将对象中的值转为可存储的格式（数组/对象 → JSON字符串）
 */
function toDbValue(value: any): any {
  if (value === undefined || value === null) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  // 静态路由让行（/batch），否则批量更新会被当成 id='batch'
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 对 status 字段进行标准化转换
    if (updates.status) {
      updates.status = normalizeTaskStatus(updates.status);
    }

    const db = getDatabase();

    // 2026-10-20 修复（CRITICAL）：状态变更必须过状态机守卫。
    //   此前本端点对 status 完全不校验 —— 任何登录用户可 PUT {"status":"pending"}
    //   把已完成任务改回去（实测 completed → pending 返回 200），
    //   同时它也是前端乐观更新的落库通道，绕过了 /accept /complete /reject 等
    //   专用端点上的全部守卫与审计。
    //   现在：状态确实发生变化时才校验；同值写入（幂等更新）仍放行。
    if (updates.status) {
      const curStmt = db.prepare('SELECT status FROM farm_tasks WHERE id = ?');
      curStmt.bind([id]);
      let curStatus = '';
      if (curStmt.step()) {
        curStatus = String((curStmt.getAsObject() as { status?: string }).status || '');
      }
      curStmt.free();
      if (curStatus && curStatus !== updates.status) {
        if (!guardTransition(res, curStatus, String(updates.status))) return;
      }
    }

    // 过滤有效字段并转换为数据库列名（跳过不存在于 DB 的字段，避免 SQL 错误）
    // 2026-09-21：改用共用白名单 FARM_TASK_DB_COLUMNS，并在丢弃字段时打日志（Fail Loud）
    const validKeys = Object.keys(updates).filter(k => {
      if (k === 'id' || updates[k] === undefined) return false;
      const dbCol = toDbColumnName(k);
      const allowed = FARM_TASK_DB_COLUMNS.has(dbCol);
      if (!allowed) {
        console.warn(`[farm-tasks PUT] 忽略非白名单字段: ${k} → ${dbCol}`);
      }
      return allowed;
    });

    if (validKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const setClauses = validKeys.map(k => `${toDbColumnName(k)} = ?`).join(', ');
    const values = validKeys.map(k => toDbValue(updates[k]));
    values.push(now, id);

    db.run(`UPDATE farm_tasks SET ${setClauses}, update_time = ? WHERE id = ?`, values);
    // 2026-10-10：0 行更新 → 404（Fail Loud）。此前对不存在的 id 更新返回 200"幽灵成功"
    //   （如巡查记录误发给本端点），前端乐观更新不回滚、刷新后数据回退且无任何提示
    if (db.getRowsModified() === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新农事任务失败:', error);
    res.status(500).json({ success: false, error: '更新农事任务失败' });
  }
});

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  // 静态路由让行（/batch），否则批量删除会被当成 id='batch'
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 2026-08-29：兼容 task_code 删除（AI 训练样本的 id 是 NULL，SQL WHERE id = NULL 匹配不到任何行）
    //   先按 id 查；查不到再按 task_code 查；查不到才返回 404
    let stmt = db.prepare('SELECT id FROM farm_tasks WHERE id = ?');
    stmt.bind([id]);
    let targetId: string | null = null;
    if (stmt.step()) {
      const row: any = stmt.getAsObject();
      targetId = row.id;
    }
    stmt.free();

    if (!targetId) {
      // 兜底：按 task_code 查（处理 NULL id 的 AI 样本）
      stmt = db.prepare('SELECT id FROM farm_tasks WHERE task_code = ?');
      stmt.bind([id]);
      if (stmt.step()) {
        const row: any = stmt.getAsObject();
        targetId = row.id;
      }
      stmt.free();
    }

    if (!targetId) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    db.run('DELETE FROM farm_tasks WHERE id = ?', [targetId]);
    saveDatabase();
    res.json({ success: true, data: { id: targetId } });
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
    // 2026-09-21：改用共用白名单 FARM_TASK_DB_COLUMNS，并在丢弃字段时打日志（Fail Loud）
    const validKeys = Object.keys(normalizedUpdates).filter(k => {
      if (k === 'id' || normalizedUpdates[k] === undefined) return false;
      const dbCol = toDbColumnName(k);
      const allowed = FARM_TASK_DB_COLUMNS.has(dbCol);
      if (!allowed) {
        console.warn(`[farm-tasks PUT /batch] 忽略非白名单字段: ${k} → ${dbCol}`);
      }
      return allowed;
    });

    if (validKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const fields = validKeys.map(k => `${toDbColumnName(k)} = ?`).join(', ');
    const values = validKeys.map(k => toDbValue(normalizedUpdates[k]));
    values.push(now);

    // 2026-10-20：批量改状态同样要过守卫 —— 否则它就是绕过状态机的第二条通道
    if (normalizedUpdates.status) {
      const stmt = db.prepare('SELECT id, status FROM farm_tasks WHERE id IN (' + ids.map(() => '?').join(',') + ')');
      stmt.bind(ids);
      const rows: Array<{ id: string; status: string }> = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as unknown as { id: string; status: string });
      stmt.free();
      for (const r of rows) {
        if (r.status && r.status !== normalizedUpdates.status) {
          if (!guardTransition(res, r.status, String(normalizedUpdates.status))) return;
        }
      }
    }

    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE farm_tasks SET ${fields}, update_time = ? WHERE id IN (${placeholders})`, [...values, ...ids]);

    // 2026-10-20：返回**真实**影响行数（此前恒为 ids.length，不存在的 id 也算成功）
    const affected = db.getRowsModified();

    saveDatabase();
    res.json({ success: true, data: { ids, requested: ids.length, updated: affected } });
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
    // 2026-10-20：返回真实删除行数（此前恒为 idArray.length，不存在的 id 也算"已删除"）
    const deleted = db.getRowsModified();
    saveDatabase();

    res.json({ success: true, data: { requested: idArray.length, deleted } });
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
 * P0-8：解析执行人工时单价
 * - 优先取 employees.hourly_rate
 * - 为空时回退 50（系统既有约定，见 src/components/labor/overtime/hooks/useOvertime.ts）
 */
const DEFAULT_HOURLY_RATE = 50;

function resolveHourlyRate(db: any, workerId: string): number {
  if (!workerId) return DEFAULT_HOURLY_RATE;
  try {
    const rows = db.exec(
      'SELECT hourly_rate FROM employees WHERE id = ? OR oid = ? LIMIT 1',
      [workerId, workerId]
    );
    const raw = rows?.[0]?.values?.[0]?.[0];
    const rate = Number(raw);
    if (Number.isFinite(rate) && rate > 0) return rate;
  } catch {
    // employees 表缺 hourly_rate 列时回退默认值
  }
  return DEFAULT_HOURLY_RATE;
}

/**
 * P0-8：任务验收 → 写人工工时记录（labor_records）
 *
 * - 幂等：同一任务只保留一条（按 task_id 查重，重复验收只更新不新增）
 * - 写入实际工时、单价快照、金额、作业面积
 * - 必须在 runInTransaction 内调用
 */
function syncLaborRecord(
  db: any,
  task: any,
  options: { actualHours: number; actualArea: number }
): void {
  const { actualHours, actualArea } = options;
  if (!actualHours || actualHours <= 0) return;

  const workerId = task.assignee_id || '';
  const workerName = task.assignee_name || '';
  const hourlyRate = resolveHourlyRate(db, workerId);
  const totalAmount = Number((actualHours * hourlyRate).toFixed(2));
  const now = new Date().toISOString();
  const workDate = task.plan_date || now.slice(0, 10);

  // 幂等：查该任务是否已有工时记录
  let existingId: string | null = null;
  try {
    const found = db.exec(
      'SELECT id FROM labor_records WHERE task_id = ? LIMIT 1',
      [task.id]
    );
    existingId = found?.[0]?.values?.[0]?.[0] ?? null;
  } catch {
    existingId = null;
  }

  if (existingId) {
    db.run(
      `UPDATE labor_records
       SET work_hours = ?, hourly_rate = ?, total_amount = ?, area = ?,
           work_date = ?, status = 'completed', update_time = ?
       WHERE id = ?`,
      [actualHours, hourlyRate, totalAmount, actualArea, workDate, now, existingId]
    );
    return;
  }

  // 编号：当日序号递增（禁止 Math.random，业务编码需可复现）
  let seq = 1;
  try {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const last = db.exec(
      `SELECT id FROM labor_records WHERE id LIKE ? ORDER BY id DESC LIMIT 1`,
      [`LB${dateStr}-%`]
    );
    const lastId = last?.[0]?.values?.[0]?.[0];
    if (lastId) {
      const tail = Number(String(lastId).split('-').pop());
      if (Number.isFinite(tail)) seq = tail + 1;
    }
  } catch {
    // 序号查询失败用 1
  }
  const d2 = new Date();
  const dateStr2 = `${d2.getFullYear()}${String(d2.getMonth() + 1).padStart(2, '0')}${String(d2.getDate()).padStart(2, '0')}`;
  const laborId = `LB${dateStr2}-${String(seq).padStart(4, '0')}`;

  db.run(
    `INSERT INTO labor_records (
      id, worker_id, worker_name, work_type, work_date, work_hours, hourly_rate,
      total_amount, greenhouse_id, greenhouse_name, area_name, task_description,
      task_id, task_code, area, batch_id, batch_code, status, remarks,
      create_time, update_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      laborId, workerId, workerName, task.task_type || task.type_name || '农事作业', workDate,
      actualHours, hourlyRate, totalAmount,
      task.greenhouse_id || '', task.greenhouse_name || '', task.area_name || '',
      task.task_title || task.title || task.task_code || '',
      task.id, task.task_code || task.id, actualArea,
      task.batch_id || null, task.batch_code || null,
      'completed', `任务 ${task.task_code || task.id} 验收工时`,
      now, now,
    ]
  );
}

/**
 * P0-2：任务状态变更 → 同步农事操作记录（farm_operation_records）
 *
 * 关联优先级：task_id（本批次起写入） → source_id（客户端早先写入的父记录）
 * 命中则更新状态/进度并回填 task_id；未命中则新建一条父记录。
 * 必须在 runInTransaction 内调用（不在此处 saveDatabase）。
 */
function syncTaskOperationRecord(
  db: any,
  task: any,
  options: {
    status: string;
    progress?: number;
    operatorId?: string;
    operatorName?: string;
    /** P0-8：实际工时（写人工成本快照） */
    actualHours?: number;
  }
): void {
  const { status, progress, operatorId = '', operatorName = '', actualHours } = options;
  const now = new Date().toISOString();

  // P0-8：人工成本快照（单价取自执行人配置，缺失回退系统默认）
  const hourlyRate = resolveHourlyRate(db, task.assignee_id || operatorId);
  const laborCost = actualHours && actualHours > 0
    ? Number((actualHours * hourlyRate).toFixed(2))
    : null;

  let existingId: string | null = null;
  try {
    const found = db.exec(
      `SELECT id FROM farm_operation_records
       WHERE source_type = 'task' AND (task_id = ? OR source_id = ?)
       ORDER BY created_at ASC LIMIT 1`,
      [task.id, task.id]
    );
    existingId = found?.[0]?.values?.[0]?.[0] ?? null;
  } catch {
    // 老库缺 task_id 列时降级为只按 source_id 匹配，不让主流程失败
    const found = db.exec(
      `SELECT id FROM farm_operation_records
       WHERE source_type = 'task' AND source_id = ?
       ORDER BY created_at ASC LIMIT 1`,
      [task.id]
    );
    existingId = found?.[0]?.values?.[0]?.[0] ?? null;
  }

  if (existingId) {
    db.run(
      `UPDATE farm_operation_records
       SET status = ?,
           progress = COALESCE(?, progress),
           task_id = ?,
           operator_id = COALESCE(NULLIF(?, ''), operator_id),
           operator_name = COALESCE(NULLIF(?, ''), operator_name),
           worker_hourly_rate_snapshot = COALESCE(?, worker_hourly_rate_snapshot),
           labor_cost_snapshot = COALESCE(?, labor_cost_snapshot),
           updated_at = ?
       WHERE id = ?`,
      [status, progress ?? null, task.id, operatorId, operatorName, hourlyRate, laborCost, now, existingId]
    );
    return;
  }

  // 当日序号（禁止 Math.random：业务编码必须可复现）
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `OP${dateStr}-`;
  let seq = 1;
  try {
    const last = db.exec(
      `SELECT record_code FROM farm_operation_records
       WHERE record_code LIKE ? ORDER BY record_code DESC LIMIT 1`,
      [`${prefix}%`]
    );
    const lastCode = last?.[0]?.values?.[0]?.[0];
    if (lastCode) {
      const tail = Number(String(lastCode).split('-').pop());
      if (Number.isFinite(tail)) seq = tail + 1;
    }
  } catch {
    // 序号查询失败用 1，不阻塞写入
  }
  const recordCode = `${prefix}${String(seq).padStart(4, '0')}`;
  const id = `OP_${Date.now()}_${String(seq).padStart(4, '0')}`;

  db.run(
    `INSERT INTO farm_operation_records (
      id, record_code, source_type, source_id, source_code, task_id,
      operation_type, operation_type_name, status,
      greenhouse_id, greenhouse_name, crop_name,
      batch_id, batch_code,
      operator_id, operator_name,
      worker_hourly_rate_snapshot, labor_cost_snapshot,
      operation_date, progress, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, recordCode, 'task', task.id, task.task_code, task.id,
      task.task_type || 'other', task.type_name || task.task_title || task.title || '',
      status,
      task.greenhouse_id || '', task.greenhouse_name || '', task.crop || '',
      task.batch_id || '', task.batch_code || '',
      operatorId, operatorName,
      hourlyRate, laborCost,
      todayLocal, progress ?? null, now, now,
    ]
  );
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
    if (!guardTransition(res, fromStatus, 'pending')) return;
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
    // 2026-10-12 (IS-NEW-159) P2 修复：reason 长度校验（min 6），与前端一致防止 500
    const parsed = ReasonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ success: false, error: parsed.error.issues[0]?.message || '参数校验失败' });
    }
    // 2026-09-21 修复：前端一直会发送 reason，但此前此处未接收、也没落库，
    //   导致"撤回原因"在任何地方都查不到。现接收并写入流转记录描述。
    const { operator_id, operator_name, reason } = req.body;

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
    if (!guardTransition(res, fromStatus, 'draft')) return;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'draft', update_time = ? WHERE id = ?`,
        [now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'withdraw',
        reason ? `撤回任务：${reason}` : '撤回任务', fromStatus, 'draft');
    });

    res.json({ success: true, data: { id, status: 'draft' } });
  } catch (error) {
    // Fail Loud：把具体错误带回给前端，便于排查（原先只返回笼统文案）
    console.error('[farm-tasks withdraw] 失败:', error);
    res.status(500).json({ success: false, error: `撤回任务失败：${(error as Error).message}` });
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

    // 2026-10-20 修复（HIGH）：没有执行人的任务不允许被接受。
    //   此前不校验，导致任务进入 accepted/in_progress/waiting_acceptance 却无人负责，
    //   页面上也没有任何操作按钮可推进 —— 实测库内已产生 2 条这种卡死任务
    //   （NS20261016-609、NS20261017-039，流转记录里的 operator_name 都是空）。
    if (!String(task.assignee_id || '').trim()) {
      return res.status(400).json({
        success: false,
        error: '任务尚未指派执行人，无法接受。请先派工给具体人员。',
      });
    }

    if (!guardTransition(res, fromStatus, 'accepted')) return;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'accepted', accepted_at = ?, update_time = ? WHERE id = ?`,
        [now, now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'accept', '接受任务', fromStatus, 'accepted');

      syncTaskOperationRecord(db, task, {
        status: 'accepted', operatorId: operator_id || '', operatorName: operator_name || '',
      });
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
    if (!guardTransition(res, fromStatus, 'in_progress')) return;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'in_progress', update_time = ? WHERE id = ?`,
        [now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'start', '开始执行', fromStatus, 'in_progress');

      syncTaskOperationRecord(db, task, {
        status: 'in_progress', operatorId: operator_id || '', operatorName: operator_name || '',
      });
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

    // P0-10：仅在显式推进状态时校验转移合法性（只改进度不校验）
    if (normalizedStatus && !guardTransition(res, task.status, normalizedStatus)) return;

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

      syncTaskOperationRecord(db, task, {
        status: normalizedStatus || 'in_progress',
        progress: newProgress,
        operatorId: operator_id || '',
        operatorName: operator_name || '',
      });
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
    if (!guardTransition(res, fromStatus, 'waiting_acceptance')) return;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'waiting_acceptance', progress = 100, update_time = ? WHERE id = ?`,
        [now, id]);

      // 将 feedback 对象转为 JSON 字符串存储
      const feedbackStr = feedback ? JSON.stringify(feedback) : undefined;
      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'submit', '申请验收', fromStatus, 'waiting_acceptance', 100, comment, undefined, feedbackStr);

      syncTaskOperationRecord(db, task, {
        status: 'waiting_acceptance', progress: 100,
        operatorId: operator_id || '', operatorName: operator_name || '',
      });
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
    const { comments, operator_id, operator_name, actual_hours, actual_area } = req.body;

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
    if (!guardTransition(res, fromStatus, 'completed')) return;
    const now = new Date().toISOString();

    // 2026-08-22：AI-06 工时预测 — 收集实际工时（AI 训练 target）
    // 同时计算 estimated_vs_actual_ratio 供 AI 特征工程使用
    // P0-8：body 未传时回退到任务上已记录的 actual_hours
    //   （ActualHoursRecorder 组件走 /api/ai/workhour/feedback 写入该列）
    let actualHoursValue: number | null = null;
    let ratioValue: number | null = null;
    const rawHours = actual_hours !== undefined && actual_hours !== null
      ? actual_hours
      : task.actual_hours;
    if (rawHours !== undefined && rawHours !== null) {
      const ah = Number(rawHours);
      if (!isNaN(ah) && ah > 0) {
        actualHoursValue = ah;
        const estimated = Number(task.estimated_hours) || 0;
        if (estimated > 0) {
          ratioValue = ah / estimated;
        }
      }
    }

    // P0-8：实际作业面积（亩）——可选，用于亩均成本
    const actualAreaValue = actual_area !== undefined && actual_area !== null && !Number.isNaN(Number(actual_area))
      ? Number(actual_area)
      : (Number(task.actual_area) || 0);

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'completed', completed_at = ?, progress = 100,
                                   actual_hours = ?, actual_hours_recorded_at = ?, actual_hours_recorded_by = ?,
                                   estimated_vs_actual_ratio = ?, actual_area = ?, update_time = ?
                                   WHERE id = ?`,
        [now, actualHoursValue, actualHoursValue ? now : null, actualHoursValue ? (operator_id || '') : null,
         ratioValue, actualAreaValue, now, id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'complete', '验收通过', fromStatus, 'completed', 100, comments);

      syncTaskOperationRecord(db, task, {
        status: 'completed', progress: 100,
        operatorId: operator_id || '', operatorName: operator_name || '',
        actualHours: actualHoursValue ?? undefined,
      });

      // P0-8：写人工工时（幂等，同任务只一条）
      if (actualHoursValue) {
        syncLaborRecord(db, task, { actualHours: actualHoursValue, actualArea: actualAreaValue });
      }
    });

    res.json({ success: true, data: { id, status: 'completed', actual_hours: actualHoursValue, actual_area: actualAreaValue, estimated_vs_actual_ratio: ratioValue } });
  } catch (error) {
    // 2026-09-19 修复 H14：原先这里只有 res.status(500)，没有 console.error ——
    // 缺列（no such column: actual_hours）这类故障在前端只看到"验收通过失败"，
    // 后端日志一片空白，违反 Fail Loud。补上日志。
    console.error('[farmTask] 验收通过失败:', error);
    res.status(500).json({ success: false, error: '验收通过失败' });
  }
});

/**
 * 验收驳回（返工）
 */
router.post('/:id/reject', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // 2026-10-20：驳回原因不做最小字数校验（改用 RejectReasonSchema），仅限 500 字上限
    const parsed = RejectReasonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ success: false, error: parsed.error.issues[0]?.message || '参数校验失败' });
    }
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

    // P0-10：状态转移守卫
    if (!guardTransition(res, fromStatus, newStatus)) return;

    // P0-1：事务包裹
    // P1-9：驳回原因/操作人写入 rejected_* 审计列
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = ?, rework_count = ?, update_time = ?, rejected_at = ?, rejected_by = ?, rejected_reason = ? WHERE id = ?`,
        [newStatus, reworkCount, now, now, operator_id || '', reason || '', id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'reject', '验收驳回', fromStatus, newStatus, undefined, reason);

      syncTaskOperationRecord(db, task, {
        status: newStatus, operatorId: operator_id || '', operatorName: operator_name || '',
      });
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
    if (!guardTransition(res, fromStatus, 'in_progress')) return;
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
    if (!guardTransition(res, fromStatus, 'cancelled')) return;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    // P1-9：取消原因/操作人写入 cancelled_* 审计列
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'cancelled', update_time = ?, cancelled_at = ?, cancelled_by = ?, cancelled_reason = ? WHERE id = ?`,
        [now, now, operator_id || '', reason || '', id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'cancel', '取消任务', fromStatus, 'cancelled', undefined, reason);

      syncTaskOperationRecord(db, task, {
        status: 'cancelled', operatorId: operator_id || '', operatorName: operator_name || '',
      });
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
    if (!guardTransition(res, fromStatus, 'abandoned')) return;
    const now = new Date().toISOString();

    // P0-1：事务包裹
    // P1-9：放弃原因/操作人写入 abandoned_* 审计列
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'abandoned', update_time = ?, abandoned_at = ?, abandoned_by = ?, abandoned_reason = ? WHERE id = ?`,
        [now, now, operator_id || '', reason || '', id]);

      recordTaskOperation(db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'abandon', '放弃任务', fromStatus, 'abandoned', undefined, reason);

      syncTaskOperationRecord(db, task, {
        status: 'abandoned', operatorId: operator_id || '', operatorName: operator_name || '',
      });
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
    if (!guardTransition(res, fromStatus, 'abandoned')) return;
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

    // 2026-10-10：参数防御（Fail Loud）——此前前端用错字段名（new_assignee_id）时，
    //   undefined 被 sql.js 静默绑为 NULL，"重新派发成功但执行人丢失"。
    //   缺参直接 400，避免再次静默写坏数据；空字符串是合法值（返工满 2 次时强制清空执行人）
    if (assigneeId === undefined) {
      return res.status(400).json({ success: false, error: '缺少 assigneeId 参数：重新派发必须指定执行人字段' });
    }

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
