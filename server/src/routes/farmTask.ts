/**
 * 农事任务 API 路由
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { resolveEmployeeIdentity } from '../lib/employeeIdentity';
// v0.3 前置 3 + 前置 5：租户上下文 + RBAC 权限守卫
import { tenantContext } from '../middleware/tenantContext';
import { permissionGuard } from '../middleware/permissionGuard';
// 2026-10-25：数据行级权限（基地维度）
import { resolveUserDataScope } from '../lib/dataScope';
// 2026-10-25：当前基地上下文（顶部基地切换器）
import { getCurrentBaseOid } from '../middleware/currentBase';
import { resolveBaseFromRequest, checkBasePermission, applyBaseOwnership } from '../lib/baseResolver';
// 2026-10-12 P2 (IS-NEW-159) 修复：拒绝/撤回原因长度仅前端校验，绕过即 500；后端补 zod min(6)
import { z } from 'zod';
// 2026-10-20 P0-10：后端权威状态转移守卫（此前转移表只在前端，后端 17 个流转端点零守卫）
import { assertTaskTransition } from '../constants';
// 2026-10-21 P2c：巡查记录守卫（完成前置校验 / 删除保护）+ 记录写入服务
import { assertInspectionRecordBeforeAdvance, assertInspectionRecordBeforeComplete, assertTaskDeletable } from '../lib/inspectionRecordGuard';
import {
  insertRecord,
  updateRecordFields,
  getRecordByTaskId,
  nextRecordCode,
} from '../services/inspectionRecordService';
import { formatLocalDateYYYYMMDD } from '../utils/dateUtil';
import { parseLocalDate } from '../lib/inspectionPlanFrequency';
import { generateId } from '../utils/id';

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
 * 2026-10-21（P2a）：给当前页任务批量补上「已提交的巡查记录」标记。
 *
 * 为什么要单独查而不是 JOIN：queryHelper.execCount 用正则把 COUNT(*) 从 SQL 里摘出来，
 *   而正则会停在子查询**内部**的 FROM 处 —— 列表 SQL 里一旦出现子查询，分页总数必错
 *   （execCount 双别名 SQL 事故的同型陷阱）。所以主 SELECT 保持 `SELECT * FROM farm_tasks`，
 *   记录标记用一次 IN 查询补齐：当前页 N 条任务 = 1 次查询，不是 N+1。
 *
 * 就地写入 item.inspectionRecordId / inspectionRecordCode（供 transformTaskFields 透传）。
 * 查不到记录的任务保持空串，前端据此渲染「未提交巡查记录」。
 */
function attachInspectionRecords(db: any, items: any[]): void {
  if (!items || items.length === 0) return;
  // 最多 200 条（列表默认 limit=200），单条 IN 查询足够；不额外分批以免引入半截数据。
  const ids = items.map((i) => i.id).filter(Boolean);
  if (ids.length === 0) return;

  const placeholders = ids.map(() => '?').join(',');
  const rows = queryToObjects<any>(
    db,
    `SELECT inspection_task_id, id, record_code FROM inspections
     WHERE inspection_task_id IN (${placeholders})`,
    ids
  );
  if (!rows || rows.length === 0) return;

  // inspection_task_id 受唯一索引约束，一个任务最多一条记录；防御性取首条。
  const byTaskId = new Map<string, any>();
  for (const row of rows) {
    const key = String(row.inspectionTaskId || row.inspection_task_id || '');
    if (key && !byTaskId.has(key)) byTaskId.set(key, row);
  }
  for (const item of items) {
    const hit = byTaskId.get(String(item.id));
    if (hit) {
      item.inspectionRecordId = hit.id || '';
      item.inspectionRecordCode = hit.recordCode || hit.record_code || '';
    }
  }
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
    // 2026-10-20 修复：planEnd 此前直接取 planDate（**开始日期**），
    //   多天任务的「计划结束」永远显示成开始那天（实测传入 10-22 17:00，返回 10-21）。
    //   现在优先读新的 plan_end 列；老数据回落到 due_date（它一直由 planEnd 派生）。
    planEnd: item.planEnd || item.dueDate || item.planDate || '',
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
    // 2026-10-21（P2a）：巡查计划实例标记
    //   inspectionRecordId / inspectionRecordCode 由列表端点批量回填（见 GET / 的批注）；
    //   此处只透传任务自身的计划归属，单条 GET 也能拿到。
    inspectionPlanId: item.inspectionPlanId || '',
    planOccurrenceDate: item.planOccurrenceDate || '',
    inspectionRecordId: item.inspectionRecordId || '',
    inspectionRecordCode: item.inspectionRecordCode || '',
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
    const { task_type, status, assignee_name, greenhouse_name, keyword, page = 1, limit = 200,
            exclude_source_type } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM farm_tasks WHERE 1=1';
    const params: any[] = [];

    // 2026-10-21（P2a）：排除某类来源任务。
    //   农事任务中心传 exclude_source_type=inspection_plan，把巡查计划实例任务从
    //   农事任务列表里滤掉（它由「巡查记录」tab 承载，避免两个列表重复渲染同一批任务）。
    //   「我的任务」不传此参数，保留计划任务 —— 执行人要在那里看到自己的巡查安排。
    if (exclude_source_type) {
      sql += ' AND (source_type IS NULL OR source_type <> ?)';
      params.push(exclude_source_type);
    }

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

    // 2026-10-25：数据行级过滤（按「当前登录基地」）
    //   优先 X-Base-Oid；未指定时退回 user_base_permissions 范围。
    //   2026-10-25 二次收紧：不再放行未归属记录（写入路径已全部补上基地归属）。
    const currentBaseOid = getCurrentBaseOid(req);
    if (currentBaseOid) {
      sql += ` AND base_oid = ?`;
      params.push(currentBaseOid);
    } else {
      const dataScope = resolveUserDataScope((req as any).user?.userId);
      if (dataScope.restricted && dataScope.baseOids.length > 0) {
        const ph = dataScope.baseOids.map(() => '?').join(',');
        sql += ` AND base_oid IN (${ph})`;
        params.push(...dataScope.baseOids);
      }
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

    // 2026-10-21（P2a）：批量回填「该任务是否已有巡查记录」。
    //   刻意不用子查询 JOIN —— queryHelper.execCount 会用正则从子查询内部的 FROM 处截断
    //   COUNT(*)（见 execCount 双别名事故），列表 SQL 一旦带子查询，分页总数必错。
    //   因此先取回当前页，再用 task ids 单独批量查一次 inspections。
    attachInspectionRecords(db, items);

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

    // 2026-10-21 P2c：与列表端点一致回填「已提交巡查记录」标记
    attachInspectionRecords(db, items);

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
      crop, cropName, crop_remarks, cropRemarks,
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
      // 2026-10-21：临时任务合并前置（人工数量 / 紧急程度）
      worker_count, workerCount,
      urgency,
      // 2026-10-21（P2a）：巡查计划实例标记（由计划生成端点写入；普通新建任务为空）
      inspection_plan_id, inspectionPlanId,
      plan_occurrence_date, planOccurrenceDate,
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
        due_date, plan_end, progress, crop, crop_remarks, estimated_hours, estimated_days,
        worker_count, urgency,
        remarks,
        materials, tools,
        batch_id, batch_code,
        planting_id, production_plan_id, production_plan_code,
        type_name, source_type, dispatch_mode,
        feedback_requirements,
        rework_history, deadline_extensions,
        type_config, sop_content, description,
        team_id, team_name, tools_remarks,
        source_problem_id, source_inspection_id, source_id, source_code,
        inspection_plan_id, plan_occurrence_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      // 2026-10-20：计划结束（完整日期时间），与 due_date（仅日期）并存
      planEndVal || null,
      progress || 0,
      crop || cropName || '',
      // 2026-10-20：作物备注（「作物=其他」时的说明）
      crop_remarks || cropRemarks || '',
      estimated_hours || estimatedHours || 0,
      estimated_days || estimatedDays || 0,
      // 2026-10-21：人工数量默认 1；紧急程度默认 normal（仅迁移保真，新建走 priority）
      Number(worker_count ?? workerCount) || 1,
      urgency || 'normal',
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
      // 2026-10-21（P2a）：巡查计划实例标记
      inspection_plan_id || inspectionPlanId || null,
      plan_occurrence_date || planOccurrenceDate || null,
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

    // 2026-10-21：补创建操作记录（此前 POST / 端点从未写过 action='create' 的流转记录，
    //   导致任务"创建"操作人有 5/29 条 operator_name 为空）。
    //   同时操作人字段从 req.user 兜底（演示模式注入"陆启闯"）。
    const createdTaskCode = task_code || taskCode || newId;
    const createdTaskTitle = task_title || taskTitle || title || '';
    // 2026-10-21（追溯增强 第二批）：创建时快照关联单据 —— 后续单据被删除/改号仍可回溯
    const linkedDocs: Array<{ type: string; code: string; label: string }> = [];
    if (batch_code || batchCode) linkedDocs.push({ type: 'batch', code: String(batch_code || batchCode), label: '批次' });
    if (production_plan_code || productionPlanCode) linkedDocs.push({ type: 'production_plan', code: String(production_plan_code || productionPlanCode), label: '生产计划' });
    if (planting_id || plantingId) linkedDocs.push({ type: 'planting', code: String(planting_id || plantingId), label: '种植实例' });
    if (sop_content || sopContent) linkedDocs.push({ type: 'sop', code: 'SOP', label: '作业标准' });
    recordTaskOperation(
      req, db, newId, createdTaskCode, createdTaskTitle,
      create_by || createBy || '', // body 上的创建人标识
      (req as any).user?.name || create_by || createBy || '', // 操作人姓名：优先 req.user.name
      'create', '创建任务', undefined, normalizeTaskStatus(status || 'pending'),
      undefined, undefined, undefined, undefined,
      undefined,
      linkedDocs.length > 0 ? JSON.stringify(linkedDocs) : undefined,
    );
    // 2026-10-25：基地归属补写 + 数据范围校验
    try {
      const resolvedBase = resolveBaseFromRequest(req.body, getCurrentBaseOid(req));
      const baseCheck = checkBasePermission((req as any).user?.userId, resolvedBase?.oid);
      if (!baseCheck.allowed) throw new Error(baseCheck.reason);
      if (resolvedBase) applyBaseOwnership('farm_tasks', String(newId), resolvedBase);
    } catch (baseErr) {
      if (baseErr instanceof Error && /无权操作基地|指定的基地不存在/.test(baseErr.message)) throw baseErr;
      console.warn('[farmTask] 基地归属解析失败（不影响创建）:', (baseErr as Error)?.message);
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
    // 2026-10-21：把真实原因一并返回 —— 此前只回笼统文案「创建农事任务失败」，
    //   而本文件的 console.error 只写 stdout（不进 logs/*.log），
    //   用户报 500 时既看不到日志也拿不到 message，无法定位。
    //   排查 SQLite 绑定/写盘类错误必须看到原始 message（如 NaN 绑定、no such column）。
    const detail = error instanceof Error ? error.message : String(error);
    console.error('创建农事任务失败:', detail, error);
    res.status(500).json({
      success: false,
      error: '创建农事任务失败',
      detail,
    });
  }
});

/**
 * 2026-10-21（追溯增强 第二批）：需要记录"字段级变更差异"的业务字段白名单。
 *
 * PUT /:id 会接收任意可写字段，但只有这些字段的变更值得审计（谁把执行人改了、
 * 谁把截止日期推后了）。其余字段（update_time / version / feedback 大 JSON 等）
 * 要么是噪音，要么会造成记录膨胀。
 */
const TRACKED_FIELD_LABELS: Record<string, string> = {
  task_title: '任务标题',
  task_type: '任务类型',
  assignee_id: '执行人ID',
  assignee_name: '执行人',
  assigner_name: '派发人',
  greenhouse_name: '任务区域',
  area_name: '区域',
  plan_date: '计划开始',
  plan_end: '计划结束',
  due_date: '截止日期',
  priority: '优先级',
  status: '状态',
  progress: '进度',
  crop: '作物',
  crop_remarks: '作物备注',
  estimated_hours: '预计工时',
  estimated_days: '预计天数',
  team_name: '班组',
  description: '工作内容',
  remarks: '备注',
  sop_content: '作业标准',
};

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
  // 2026-10-21：临时任务合并——人工数量 / 紧急程度（此前无映射，PUT 会被静默丢弃）
  workerCount: 'worker_count',
  urgency: 'urgency',
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
  // 2026-10-20：作物备注（新建弹窗「作物=其他」时填写，此前无列、无映射）
  cropRemarks: 'crop_remarks',
  crop_remarks: 'crop_remarks',
  materials: 'materials',
  tools: 'tools',
  createTime: 'create_time',
  updateTime: 'update_time',
  crop: 'crop',
  cropName: 'crop',
  title: 'task_title',
  planStart: 'plan_date',
  // 2026-10-20：planEnd 此前映射到 plan_date（开始日期），PUT 会把结束时间写进开始日期列。
  //   改为独立列 plan_end。
  planEnd: 'plan_end',
  plan_end: 'plan_end',
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
  'greenhouse_id', 'greenhouse_name', 'area_name', 'crop', 'crop_remarks', 'plan_end',
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
  // 2026-10-21：临时任务合并前置（人工数量 / 紧急程度）
  'worker_count', 'urgency',
  // P0-8：实际作业面积（亩）→ 亩均成本
  'actual_area',
  // P0-5：种植实例 / 生产计划关联
  'planting_id', 'production_plan_id', 'production_plan_code',
  'dispatch_mode', 'source_type', 'source_id', 'source_code',
  'source_problem_id', 'source_inspection_id',
  'feedback_requirements', 'deadline_extensions', 'type_config', 'type_name', 'sop_content',
  'materials', 'tools', 'tools_remarks', 'remarks', 'outsource_cost',
  // 2026-10-21（P2a）：巡查计划实例标记
  'inspection_plan_id', 'plan_occurrence_date',
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
      // 2026-10-22（审核 H1）：**这是验收 UI 实际走的写入通道**。
      //   前端 acceptCompletion 在 fire-and-forget 调 POST /complete 之后，
      //   还会调 store.updateTask({status:'completed'}) → PUT /farm-tasks/:id。
      //   POST /complete 的 409 会被吞掉，但这条 PUT 会把状态写成 completed 并落盘，
      //   巡查记录守卫形同虚设（刷新后任务已完成、记录仍为空）。
      //   因此 completed 目标状态必须在这里再校验一次。
      // 2026-10-23：范围扩到 waiting_acceptance —— 无记录进待验收会死锁
      //   （既不能补交、也不能重提、又过不了完成守卫），实测已产生 2 条脏数据。
      {
        const violation = assertInspectionRecordBeforeAdvance(db, id, String(updates.status));
        if (violation) {
          return res.status(409).json({ success: false, error: violation, code: 'INSPECTION_RECORD_REQUIRED' });
        }
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

    // 2026-10-21（追溯增强 第二批）：UPDATE 前取旧行快照，用于计算字段级变更差异。
    //   此前 PUT /:id 完全不写流转记录 —— 改执行人/改截止日期/改优先级等操作零审计，
    //   任务详情里查不到"谁在什么时候把执行人从张三改成了李四"。
    const beforeRows = queryToObjects(db, 'SELECT * FROM farm_tasks WHERE id = ?', [id]);
    const beforeRow = (beforeRows && beforeRows.length > 0 ? beforeRows[0] : null) as Record<string, any> | null;

    const setClauses = validKeys.map(k => `${toDbColumnName(k)} = ?`).join(', ');
    const values = validKeys.map(k => toDbValue(updates[k]));
    values.push(now, id);

    db.run(`UPDATE farm_tasks SET ${setClauses}, update_time = ? WHERE id = ?`, values);

    // 2026-10-20：状态变化时清理不属于新状态的审计时间戳。
    //   实测库内已有 5 条自相矛盾数据（3 条 completed 带 rejected_at、
    //   2 条 accepted/cancelled 带 rejected_at），会让"按驳回时间统计"等报表失真。
    if (updates.status) {
      db.run(
        `UPDATE farm_tasks SET
           completed_at = CASE WHEN ? = 'completed' THEN completed_at ELSE NULL END,
           rejected_at  = CASE WHEN ? IN ('rejected','failed') THEN rejected_at ELSE NULL END,
           cancelled_at = CASE WHEN ? = 'cancelled' THEN cancelled_at ELSE NULL END,
           abandoned_at = CASE WHEN ? = 'abandoned' THEN abandoned_at ELSE NULL END
         WHERE id = ?`,
        [updates.status, updates.status, updates.status, updates.status, id],
      );
    }
    // 2026-10-10：0 行更新 → 404（Fail Loud）。此前对不存在的 id 更新返回 200"幽灵成功"
    //   （如巡查记录误发给本端点），前端乐观更新不回滚、刷新后数据回退且无任何提示
    if (db.getRowsModified() === 0) {
      return res.status(404).json({ success: false, error: '农事任务不存在' });
    }

    // 2026-10-21（追溯增强 第二批）：字段级变更差异落流转记录。
    //   只跟踪业务关键字段（见 TRACKED_FIELD_LABELS），忽略 updated_at 之类的噪音。
    //   注意：queryToObjects 返回的是 camelCase 键（mapToCamelCase），
    //   直接用 snake_case 取值会静默拿到 undefined → diff 永远为空。
    if (beforeRow) {
      const readCol = (row: Record<string, any>, snake: string): unknown => {
        const camel = snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        return row[camel] !== undefined ? row[camel] : row[snake];
      };
      const diffObj: Record<string, { label: string; from: string; to: string }> = {};
      for (const k of validKeys) {
        const col = toDbColumnName(k);
        if (!(col in TRACKED_FIELD_LABELS)) continue;
        const rawOld = readCol(beforeRow, col);
        const oldVal = rawOld === null || rawOld === undefined ? '' : String(rawOld);
        const newVal = updates[k] === null || updates[k] === undefined ? '' : String(updates[k]);
        if (oldVal !== newVal) {
          diffObj[col] = { label: TRACKED_FIELD_LABELS[col], from: oldVal, to: newVal };
        }
      }
      const diffKeys = Object.keys(diffObj);
      if (diffKeys.length > 0) {
        // 纯状态变更用 status_change，其余（含混合）统一 update
        const onlyStatus = diffKeys.length === 1 && diffKeys[0] === 'status';
        const rawBeforeStatus = readCol(beforeRow, 'status');
        const beforeStatus = rawBeforeStatus ? String(rawBeforeStatus) : undefined;
        const afterStatus = updates.status ? String(normalizeTaskStatus(updates.status)) : String(rawBeforeStatus || '');
        recordTaskOperation(
          req, db, id,
          String(readCol(beforeRow, 'task_code') || ''),
          String(readCol(beforeRow, 'task_title') || ''),
          String(updates.operator_id || updates.operatorId || ''),
          String(updates.operator_name || updates.operatorName || ''),
          onlyStatus ? 'status_change' : 'update',
          onlyStatus ? '状态变更' : '修改任务',
          beforeStatus,
          afterStatus,
          undefined, undefined, undefined, undefined,
          JSON.stringify(diffObj),
        );
      }
    }

    // 2026-10-25：基地归属（仅当当前为空时补写）
    try {
      const resolvedBase = resolveBaseFromRequest(req.body, getCurrentBaseOid(req));
      const baseCheck = checkBasePermission((req as any).user?.userId, resolvedBase?.oid);
      if (!baseCheck.allowed) throw new Error(baseCheck.reason);
      if (resolvedBase) applyBaseOwnership('farm_tasks', String(id), resolvedBase);
    } catch (baseErr) {
      if (baseErr instanceof Error && /无权操作基地|指定的基地不存在/.test(baseErr.message)) throw baseErr;
      console.warn('[farmTask] 基地归属解析失败（不影响更新）:', (baseErr as Error)?.message);
    }
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新农事任务失败:', error);
    res.status(500).json({ success: false, error: '更新农事任务失败' });
  }
});

/**
 * 按 id 查任务，兼容 task_code（AI 训练样本的 id 为 NULL，见 DELETE /:id 的同款兜底）
 */
function lookupFarmTask(db: any, idOrCode: string): Record<string, any> | null {
  const byId = db.prepare('SELECT * FROM farm_tasks WHERE id = ?');
  byId.bind([idOrCode]);
  let task: Record<string, any> | null = null;
  if (byId.step()) task = byId.getAsObject() as unknown as Record<string, any>;
  byId.free();
  if (task) return task;

  const byCode = db.prepare('SELECT * FROM farm_tasks WHERE task_code = ?');
  byCode.bind([idOrCode]);
  if (byCode.step()) task = byCode.getAsObject() as unknown as Record<string, any>;
  byCode.free();
  return task;
}

/**
 * 2026-10-22（审核 P1-1）：巡查时间必须是合法的 HH:mm。
 *
 * 实测脏数据：`XT20261022-005` 的 `check_time` 落成 `"2026-"` ——
 *   前端把 `planStart`（"2026-10-22 11:00"）当成 planTime 传进弹窗，
 *   弹窗再 `.slice(0, 5)` 就得到 `"2026-"`。
 * 这里做最后一道兜底：只接受 HH:mm / H:mm，否则回落到任务计划时间，再否则空。
 */
function normalizeCheckTime(input: unknown, fallback: unknown): string {
  const toHHmm = (v: unknown): string => {
    const s = String(v ?? '').trim();
    // 先取「日期时间串」里的时间部分，兼容 "2026-10-22 11:00"
    const fromDateTime = /(\d{1,2}):(\d{2})/.exec(s);
    if (!fromDateTime) return '';
    const h = Number(fromDateTime[1]);
    const m = Number(fromDateTime[2]);
    if (h > 23 || m > 59) return '';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  return toHHmm(input) || toHHmm(fallback) || '';
}

/**
 * 2026-10-21 P2c：巡查记录提交端点（计划 ↔ 任务 ↔ 记录 1:1 闭环核心）
 *
 * POST /api/farm-tasks/:id/inspection-record
 *
 * 单事务步骤（方案 §6.3）：
 *   1. 取任务；必须带 inspection_plan_id，状态 ∈ pending/accepted/in_progress
 *   2. 校验该任务尚无巡查记录 → 否则 409
 *   3. pending → accepted（自动接受，状态守卫 + 流转记录）
 *   4. 服务端生成记录编号并插入 inspections（plan_id / task_id / checklist / area）
 *   5. payload.problem 存在时同事务建问题（problem_code NOT NULL 必须生成）
 *   6. accepted/in_progress → waiting_acceptance，progress=100（状态守卫 + 流转记录）
 *   7. 一次 COMMIT + 一次落盘
 *
 * 为什么不用通用 POST /inspections：它无法保证「记录 + 任务状态 + 问题」三者原子，
 * 任何一步失败都会留下「有记录但任务还停在 pending」的半截数据。
 */
router.post('/:id/inspection-record', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const now = new Date().toISOString();

    // 1. 取任务（id 为主，task_code 兜底）
    const task = lookupFarmTask(db, id);
    if (!task) return res.status(404).json({ success: false, error: '农事任务不存在' });

    if (!task.inspection_plan_id) {
      return res.status(400).json({
        success: false,
        error: '该任务不是巡查计划任务，请通过「巡查记录 → 新增」提交记录',
      });
    }

    const allowedStatuses = ['pending', 'accepted', 'in_progress'];
    if (!allowedStatuses.includes(String(task.status))) {
      return res.status(409).json({
        success: false,
        error: `当前状态「${task.status}」不允许提交巡查记录（允许：${allowedStatuses.join(' / ')}）`,
      });
    }

    // 2. 1:1 校验
    const existing = getRecordByTaskId(db, String(task.id));
    if (existing) {
      return res.status(409).json({
        success: false,
        code: 'INSPECTION_RECORD_EXISTS',
        error: `该任务已提交过巡查记录（${existing.record_code}），不能重复提交`,
        data: { recordId: existing.id, recordCode: existing.record_code },
      });
    }

    const body = req.body || {};
    const occurrenceDate = String(task.plan_occurrence_date || body.checkDate || '').slice(0, 10);
    const recordCode = String(body.recordCode || nextRecordCode(db, formatLocalDateYYYYMMDD(parseLocalDate(occurrenceDate) || new Date())));

    // 2026-10-22：巡查类型以**计划**为准。
    //   任务表上没有 inspection_type 列，前端 MyTasks 映射恒回落到 'farm'，
    //   所以 body.inspectionType 几乎总是 'farm' —— 原优先级 body 在前会让计划类型永远不生效
    //   （审核 P1-2：设备/设施计划提交的记录与问题被标成 farm，分派时选错任务类型）。
    //   现改为 plan > body > task_type。
    let planInspectionType = '';
    let planRow: any = null;
    if (task.inspection_plan_id) {
      const planStmt = db.prepare('SELECT inspection_type, equipment_id, equipment_name, infrastructure_id, infrastructure_name, area FROM inspection_plans WHERE id = ?');
      planStmt.bind([task.inspection_plan_id]);
      if (planStmt.step()) {
        planRow = planStmt.getAsObject();
        planInspectionType = String((planRow as { inspection_type?: string }).inspection_type || '');
      }
      planStmt.free();
    }
    const inspectionType = planInspectionType || body.inspectionType || task.task_type || 'farm';

    // 2026-10-22（审核 P1-1）：位置字段不能只信 body。
    //   前端从「我的任务」提交时 greenhouseName 是空串（映射里没这个字段），
    //   而 `??` 兜底不会把空串换成任务上的值 → 记录与问题都丢了温室。
    //   这里改成 `||` 链：body 非空优先，其次任务快照，最后才空。
    //   巡查对象（设备/设施/区域）同理，从计划取（任务表没有这些列）。
    const resolvedGreenhouseId = body.greenhouseId || task.greenhouse_id || '';
    const resolvedGreenhouseName = body.greenhouseName || task.greenhouse_name || '';
    const resolvedCropName = body.cropName || task.crop || '';
    const resolvedArea = body.area || task.area_name || (planRow?.area ? String(planRow.area) : '');
    const resolvedEquipmentId = body.equipmentId || (planRow?.equipment_id ? String(planRow.equipment_id) : '');
    const resolvedEquipmentName = body.equipmentName || (planRow?.equipment_name ? String(planRow.equipment_name) : '');
    const resolvedInfrastructureId = body.infrastructureId || (planRow?.infrastructure_id ? String(planRow.infrastructure_id) : '');
    const resolvedInfrastructureName = body.infrastructureName || (planRow?.infrastructure_name ? String(planRow.infrastructure_name) : '');

    let createdRecordId = '';
    let createdProblemId = '';
    const flowSteps: Array<{ from: string; to: string; action: string; actionName: string; comment: string }> = [];

    runInTransaction(db, () => {
      // 3. pending → accepted（自动接受）
      let currentStatus = String(task.status);
      if (currentStatus === 'pending') {
        assertTaskTransition(currentStatus, 'accepted');
        db.run(`UPDATE farm_tasks SET status = 'accepted', update_time = ? WHERE id = ?`, [now, task.id]);
        flowSteps.push({ from: currentStatus, to: 'accepted', action: 'accept', actionName: '自动接受', comment: '提交巡查记录时自动接受' });
        currentStatus = 'accepted';
      }

      // 4. 插入巡查记录（1:1 由唯一索引兜底）
      createdRecordId = insertRecord(db, {
        recordCode,
        inspectionType,
        inspectorId: body.inspectorId || task.assignee_id || '',
        inspectorName: body.inspectorName || task.assignee_name || '',
        greenhouseId: resolvedGreenhouseId,
        greenhouseName: resolvedGreenhouseName,
        cropName: resolvedCropName,
        equipmentId: resolvedEquipmentId,
        equipmentName: resolvedEquipmentName,
        infrastructureId: resolvedInfrastructureId,
        infrastructureName: resolvedInfrastructureName,
        checkDate: body.checkDate || occurrenceDate,
        checkTime: normalizeCheckTime(body.checkTime, task.plan_time),
        weather: body.weather || '',
        temperature: body.temperature ?? 0,
        humidity: body.humidity ?? 0,
        cropStatus: body.cropStatus || '',
        area: resolvedArea,
        // 2026-10-22（审核 L4）：不传 result 时不应默认按异常（critical）落库
        status: body.result === 'normal' ? 'normal'
          : body.result === 'abnormal' ? 'critical'
          : String(body.status || 'normal'),
        issueCategories: body.issueCategories || [],
        issuePresets: body.issuePresets || [],
        issueText: body.issueText ?? '',
        issueSeverity: body.issueSeverity ?? '中等',
        issuePhotos: body.issuePhotos || [],
        checklistResults: body.checklistResults || [],
        remarks: body.remarks ?? '',
        inspectionPlanId: task.inspection_plan_id,
        inspectionTaskId: task.id,
        recordVersion: 1,
      }, now);

      // 5. 异常建问题（problem_code 为 NOT NULL，必须服务端生成）
      if (body.problem && String(body.problem.issueText || '').trim()) {
        const d = new Date();
        const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const lastStmt = db.prepare(
          'SELECT problem_code FROM problems WHERE problem_code LIKE ? ORDER BY problem_code DESC LIMIT 1'
        );
        lastStmt.bind([`PD${ymd}%`]);
        let lastCode = '';
        if (lastStmt.step()) lastCode = String((lastStmt.getAsObject() as { problem_code?: string }).problem_code || '');
        lastStmt.free();
        const seq = lastCode ? (parseInt(lastCode.slice(-3), 10) || 0) + 1 : 1;
        const problemCode = `PD${ymd}${String(seq).padStart(3, '0')}`;
        createdProblemId = generateId('PRB');
        // 2026-10-24：具体问题项（如勾选的「灰霉病、病毒病、白粉病」）。
        //   巡查记录表一直有 issue_presets，但建问题时没带过来 ——
        //   问题详情、任务处理弹窗只剩「病害」这种分类，执行人不知道具体是什么病。
        //   这里同时写进独立列（结构化）和 description（详情直接可读）。
        const problemIssuePresets: string[] = Array.isArray(body.issuePresets) ? body.issuePresets : [];
        const problemIssueText = String(body.problem.issueText);
        // 原文已包含全部具体项时不再拼接，避免「病毒病、灰霉病：病毒病、灰霉病」
        const presetsCovered = problemIssueText.length > 0
          && problemIssuePresets.every((p) => problemIssueText.includes(p));
        const problemDescription = problemIssuePresets.length > 0 && !presetsCovered
          ? `${problemIssueText}：${problemIssuePresets.join('、')}`
          : problemIssueText;
        db.run(`
          INSERT INTO problems (
            id, problem_code, problem_type, title, description, greenhouse_name, greenhouse_id,
            reporter_id, reporter_name, assignee_id, assignee_name, priority, status,
            crop_name, inspector_id, inspector_name, check_date, check_time,
            issue_text, issue_severity, flow_records, rework_count,
            source_module, source_id, inspection_type, issue_categories, issue_presets, images,
            create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          createdProblemId, problemCode, body.problem.category || 'other',
          String(body.problem.issueText).slice(0, 60), problemDescription,
          // 2026-10-22（审核 P1-1）：与记录同源，避免空串把温室冲掉、时间写成 "2026-"
          resolvedGreenhouseName, resolvedGreenhouseId,
          body.inspectorId || task.assignee_id || '', body.inspectorName || task.assignee_name || '',
          '', '', 'medium', 'pending',
          resolvedCropName, body.inspectorId || task.assignee_id || '',
          body.inspectorName || task.assignee_name || '', body.checkDate || occurrenceDate,
          normalizeCheckTime(body.checkTime, task.plan_time),
          String(body.problem.issueText), body.problem.issueSeverity || '中等',
          JSON.stringify([{ id: `FR-${Date.now()}`, problemId: createdProblemId, operatorId: body.inspectorId || task.assignee_id || '', operatorName: body.inspectorName || task.assignee_name || '', action: 'report', fromStatus: '', toStatus: '待处理', actionTime: now }]),
          0,
          'inspection', recordCode,
          inspectionType,
          JSON.stringify(body.problem.issueCategories || body.issueCategories || []),
          JSON.stringify(problemIssuePresets),
          JSON.stringify(body.problem.images || []),
          now, now,
        ]);
        db.run('UPDATE inspections SET problem_id = ? WHERE id = ?', [createdProblemId, createdRecordId]);
      }

      // 6. → waiting_acceptance，progress=100
      assertTaskTransition(currentStatus, 'waiting_acceptance');
      db.run(
        `UPDATE farm_tasks SET status = 'waiting_acceptance', progress = 100, progress_pct = 100,
                update_time = ? WHERE id = ?`,
        [now, task.id]
      );
      flowSteps.push({ from: currentStatus, to: 'waiting_acceptance', action: 'submit_progress', actionName: '提交巡查记录', comment: `已提交巡查记录 ${recordCode}` });
    });

    // 流转记录写在事务之外：recordTaskOperation 需要 req（IP/UA 采集）且自带审计副作用，
    //   失败不应把已落库的记录回滚掉。
    let stepFrom = String(task.status);
    for (const step of flowSteps) {
      recordTaskOperation(
        req, db, String(task.id), String(task.task_code || task.id), String(task.task_title || ''),
        body.inspectorId || task.assignee_id || '', body.inspectorName || task.assignee_name || '',
        step.action, step.actionName, step.from, step.to,
        step.to === 'waiting_acceptance' ? 100 : undefined, step.comment
      );
      stepFrom = step.to;
    }
    saveDatabase();

    res.status(201).json({
      success: true,
      data: {
        recordId: createdRecordId,
        recordCode,
        problemId: createdProblemId || null,
        taskStatus: 'waiting_acceptance',
      },
      message: createdProblemId ? '巡查记录已提交，并已生成待处理问题' : '巡查记录已提交',
    });
  } catch (error) {
    console.error('[farm-tasks] 提交巡查记录失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    const isTransition = (error as { code?: string })?.code === 'ILLEGAL_TASK_TRANSITION';
    res.status(isTransition ? 409 : 500).json({ success: false, error: `提交巡查记录失败：${msg}` });
  }
});

/**
 * 2026-10-21 P2c：驳回后重提（方案 §6.4）
 * 刻意不使用通用 PUT /inspections —— 那条路径不做版本递增、不写变更差异，
 * 也无法保证任务状态回到待验收。
 * POST /api/farm-tasks/:id/inspection-record/resubmit
 */
router.post('/:id/inspection-record/resubmit', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const now = new Date().toISOString();
    const task = lookupFarmTask(db, id);
    if (!task) return res.status(404).json({ success: false, error: '农事任务不存在' });

    const record = getRecordByTaskId(db, String(task.id));
    if (!record) {
      return res.status(409).json({ success: false, error: '该任务尚无巡查记录，无法重提' });
    }
    if (String(task.status) !== 'rejected') {
      return res.status(409).json({
        success: false,
        error: `当前状态「${task.status}」不允许重提（仅驳回态允许）`,
      });
    }

    const body = req.body || {};
    // camelCase → snake_case：前端天然发驼峰，只认蛇形会静默丢字段（实测 issueCategories 被丢弃）
    const RESUBMIT_FIELD_MAP: Record<string, string> = {
      issueText: 'issue_text', issueSeverity: 'issue_severity',
      issueCategories: 'issue_categories', issuePresets: 'issue_presets',
      issuePhotos: 'issue_photos', checklistResults: 'checklist_results',
      remarks: 'remarks', area: 'area', cropStatus: 'crop_status',
      weather: 'weather', temperature: 'temperature', humidity: 'humidity',
      // 2026-10-23：补 checkTime —— 重提弹窗的「巡查时间」可编辑，
      //   白名单缺这一项时改动被静默丢弃（提示成功但值不变）。
      checkTime: 'check_time',
      status: 'status',
    };
    const writable: Record<string, unknown> = {};
    for (const [rawKey, value] of Object.entries(body)) {
      if (value === undefined) continue;
      const col = RESUBMIT_FIELD_MAP[rawKey] || rawKey;
      writable[col] = value;
    }
    const allowed = new Set(Object.values(RESUBMIT_FIELD_MAP));
    for (const key of Object.keys(writable)) {
      if (!allowed.has(key)) delete writable[key];
    }
    if (Object.keys(writable).length === 0) {
      return res.status(400).json({
        success: false,
        error: `没有可更新的字段（可更新：${[...allowed].join('、')}）`,
      });
    }

    runInTransaction(db, () => {
      updateRecordFields(db, String(record.id), writable, now);
      // 2026-10-22（审核 M7）：注释说「两次状态守卫」，实际两次都是裸 UPDATE。
      //   当前状态表恰好允许这两条边，能跑通；但状态机一旦调整就会静默越权，
      //   也与「所有流转都过守卫」的约束不符。这里显式校验。
      assertTaskTransition('rejected', 'in_progress');
      assertTaskTransition('in_progress', 'waiting_acceptance');
      db.run(`UPDATE farm_tasks SET status = 'in_progress', update_time = ? WHERE id = ?`, [now, task.id]);
      db.run(
        `UPDATE farm_tasks SET status = 'waiting_acceptance', progress = 100, progress_pct = 100, update_time = ? WHERE id = ?`,
        [now, task.id]
      );
    });

    recordTaskOperation(
      req, db, String(task.id), String(task.task_code || task.id), String(task.task_title || ''),
      body.operatorId || '', body.operatorName || '',
      'resubmit', '重新提交巡查记录', 'rejected', 'waiting_acceptance', 100,
      `记录 ${record.record_code} 修订后重提`,
      undefined, undefined,
      JSON.stringify(writable)
    );
    saveDatabase();

    res.json({
      success: true,
      data: { recordId: record.id, recordCode: record.record_code, taskStatus: 'waiting_acceptance' },
      message: '巡查记录已重新提交',
    });
  } catch (error) {
    console.error('[farm-tasks] 重提巡查记录失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: `重提巡查记录失败：${msg}` });
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

    // 2026-10-21 P2c：已关联巡查记录的任务不可删除。
    //   校验用解析后的 targetId（含 task_code 兜底路径），否则按编号删除能绕过检查，
    //   留下 inspection_task_id 指向空任务的孤儿记录。
    const deleteViolation = assertTaskDeletable(db, String(targetId));
    if (deleteViolation) {
      return res.status(409).json({ success: false, error: deleteViolation, code: 'TASK_HAS_INSPECTION_RECORD' });
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

    // 2026-10-21 P2c：批量改到 completed 时，巡查计划任务必须已提交巡查记录。
    //   逐条检查并**列出违规 id**，而不是整体 500 —— 批量操作里一条不合法就整批失败不可接受。
    // 2026-10-23：范围扩到 waiting_acceptance（同 PUT /:id，防无记录死锁）。
    if (normalizedUpdates.status === 'completed' || normalizedUpdates.status === 'waiting_acceptance') {
      const blocked: string[] = [];
      for (const tid of ids) {
        const violation = assertInspectionRecordBeforeAdvance(db, String(tid), normalizedUpdates.status);
        if (violation) blocked.push(String(tid));
      }
      if (blocked.length > 0) {
        return res.status(409).json({
          success: false,
          code: 'INSPECTION_RECORD_REQUIRED',
          error: `以下 ${blocked.length} 个巡查任务尚未提交巡查记录，不能标记为「${normalizedUpdates.status}」：${blocked.join('、')}`,
          blockedIds: blocked,
        });
      }
    }

    const placeholders = ids.map(() => '?').join(',');

    // 2026-10-21（追溯增强 第二批）：批量更新同样要留痕 —— 批量派发/验收/重派/编辑
    //   全部走本端点，此前这些操作零审计。先取旧行快照，UPDATE 后逐条写记录。
    const beforeBatch = queryToObjects(
      db,
      `SELECT * FROM farm_tasks WHERE id IN (${placeholders})`,
      ids,
    ) as Record<string, any>[];

    db.run(`UPDATE farm_tasks SET ${fields}, update_time = ? WHERE id IN (${placeholders})`, [...values, ...ids]);

    // 2026-10-20：返回**真实**影响行数（此前恒为 ids.length，不存在的 id 也算成功）
    const affected = db.getRowsModified();

    // 逐条写流转记录（每条任务的旧值不同，diff 需单独计算）
    if (affected > 0 && beforeBatch.length > 0) {
      const readCol = (row: Record<string, any>, snake: string): unknown => {
        const camel = snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        return row[camel] !== undefined ? row[camel] : row[snake];
      };
      for (const before of beforeBatch) {
        const tid = String(readCol(before, 'id') || '');
        if (!tid) continue;
        const diffObj: Record<string, { label: string; from: string; to: string }> = {};
        for (const k of validKeys) {
          const col = toDbColumnName(k);
          if (!(col in TRACKED_FIELD_LABELS)) continue;
          const rawOld = readCol(before, col);
          const oldVal = rawOld === null || rawOld === undefined ? '' : String(rawOld);
          const rawNew = normalizedUpdates[k];
          const newVal = rawNew === null || rawNew === undefined ? '' : String(rawNew);
          if (oldVal !== newVal) {
            diffObj[col] = { label: TRACKED_FIELD_LABELS[col], from: oldVal, to: newVal };
          }
        }
        const diffKeys = Object.keys(diffObj);
        if (diffKeys.length === 0) continue;
        const onlyStatus = diffKeys.length === 1 && diffKeys[0] === 'status';
        recordTaskOperation(
          req, db, tid,
          String(readCol(before, 'task_code') || ''),
          String(readCol(before, 'task_title') || ''),
          String(normalizedUpdates.operator_id || normalizedUpdates.operatorId || ''),
          String(normalizedUpdates.operator_name || normalizedUpdates.operatorName || ''),
          onlyStatus ? 'status_change' : 'batch_update',
          onlyStatus ? '批量状态变更' : '批量修改',
          String(readCol(before, 'status') || ''),
          String(normalizedUpdates.status || readCol(before, 'status') || ''),
          undefined, undefined, undefined, undefined,
          JSON.stringify(diffObj),
        );
      }
    }

    saveDatabase();
    res.json({ success: true, data: { ids, requested: ids.length, updated: affected } });
  } catch (error) {
    // 2026-10-21：补充错误日志（原只有 res.status(500)，异常堆栈完全丢失）
    console.error('批量更新农事任务失败:', error);
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

    // 2026-10-22（审核 H2）：批量删除是**独立的删除通道**（frontend apiFarmTaskService 已在用），
    //   原先这里没有巡查记录保护 —— 已提交记录的任务可被批量删掉，
    //   inspections.inspection_task_id 变成悬空引用，计划执行率统计随之漂移。
    //   逐条检查并列出被拦截的 id（与 PUT /batch 的 blocked 风格一致）。
    const blockedIds: string[] = [];
    for (const tid of idArray) {
      const violation = assertTaskDeletable(db, String(tid));
      if (violation) blockedIds.push(String(tid));
    }
    if (blockedIds.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'TASK_HAS_INSPECTION_RECORD',
        error: `以下 ${blockedIds.length} 个任务已关联巡查记录，不可删除：${blockedIds.join('、')}`,
        blockedIds,
      });
    }

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
 * 记录任务操作（含操作人兜底 + 追溯信息自动采集）
 *
 * 2026-10-21：
 * 1. 调用方传 body.operator_id / operator_name 优先；
 * 2. 为空时从 req.user 兜底（避免前端漏传或第三方调用丢操作人）；
 * 3. 全表扫描确认 12 类操作有 12 类带 operator_name='' 历史脏数据
 *    （create 5/29、publish 16/27、accept 26/168、status_change 23/47 等），
 *    此次仅修未来写入链路 + 历史修复脚本由服务端一次补齐。
 * 4. 追溯增强（第一批）：自动采集 操作时执行人快照 / 操作来源 IP / 终端 UA；
 *    调用方无需关心，全部由本函数从 req + db 读取。
 * 5. 追溯增强（第二批）：可选传入 changeDiff / linkedDocuments。
 */
function recordTaskOperation(
  req: Request,
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
  feedback?: string,
  changeDiff?: string,
  linkedDocuments?: string
) {
  // 2026-10-21：ID 加随机后缀 —— 批量更新会在同一毫秒内循环写入多条，
  //   仅用 Date.now() 会触发 UNIQUE constraint failed: task_operation_records.id
  const id = `TOR${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // 2026-10-21：操作人为空时从 req.user 兜底（演示模式默认会注入 "陆启闯/demo_user"）
  const fallbackUser = (req as any).user || {};
  const finalOperatorId = operatorId || fallbackUser.userId || fallbackUser.aid || '';
  const finalOperatorName = operatorName || fallbackUser.name || '';

  // ---- 追溯增强：自动采集（第一批） ----
  // 1) 操作时的执行人快照：任务被重派后，历史记录仍需回答"当时是谁在执行"
  let assigneeNameAtAction: string | null = null;
  try {
    const rows = queryToObjects(db, 'SELECT assignee_name FROM farm_tasks WHERE id = ?', [taskId]);
    if (rows && rows.length > 0) {
      assigneeNameAtAction = String((rows[0] as any).assigneeName ?? (rows[0] as any).assignee_name ?? '') || null;
    }
  } catch {
    // 临时任务等表不存在该字段，忽略
  }

  // 2) 操作来源 IP：优先取代理转发的 x-forwarded-for 首段，其次 req.ip，最后 socket
  const xff = req.headers['x-forwarded-for'];
  const rawIp = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim()
    || req.ip
    || (req.socket as any)?.remoteAddress
    || '';
  // 规范化 IPv6 映射地址（::ffff:192.168.1.1 → 192.168.1.1）
  const operatorIp = rawIp.replace(/^::ffff:/, '');

  // 3) 终端 UA：截断到 500 字符，避免异常长 UA 撑爆记录
  const operatorUserAgent = String(req.headers['user-agent'] || '').slice(0, 500) || null;

  db.run(`
    INSERT INTO task_operation_records (id, task_id, task_code, task_title, operator_id, operator_name,
      action, action_name, from_status, to_status, progress, comment, reason, feedback, action_time, create_time,
      assignee_name_at_action, operator_ip, operator_user_agent, change_diff, linked_documents)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, taskId, taskCode, taskTitle, finalOperatorId, finalOperatorName, action, actionName,
      fromStatus !== undefined ? fromStatus : null, toStatus,
      progress !== undefined ? progress : null,
      comment !== undefined ? comment : null,
      reason !== undefined ? reason : null,
      feedback !== undefined ? feedback : null, now, now,
      assigneeNameAtAction, operatorIp || null, operatorUserAgent,
      changeDiff !== undefined ? changeDiff : null,
      linkedDocuments !== undefined ? linkedDocuments : null]);
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

  // 2026-10-24 员工身份管理 E3：操作人 id 归一为 employees.id
  //   任务执行人 id 是 users.id（commit 2b382ba0 统一），而 farm_operation_records.operator_id
  //   的口径是员工档案（见 employee-identity-contract §3）。落库前统一转换。
  const operator = resolveEmployeeIdentity(operatorId, operatorName);
  const finalOperatorId = operator ? operator.employeeId : null;
  const finalOperatorName = operator ? operator.name : operatorName;

  // P0-8：人工成本快照（单价取自执行人配置，缺失回退系统默认）
  //   resolveHourlyRate 查的是 employees 表，故传归一后的 employees.id 才能命中真实时薪
  const hourlyRate = resolveHourlyRate(db, task.assignee_id || finalOperatorId || operatorId);
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
      [status, progress ?? null, task.id, finalOperatorId, finalOperatorName, hourlyRate, laborCost, now, existingId]
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
      finalOperatorId, finalOperatorName,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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
    const body = req.body || {};
    // 2026-10-22（审核 H5）：本路由**实际生效**（farmTaskRouter 挂在 taskProgressRouter 之前），
    //   而 taskProgress 版的 /progress 是死代码。前端 apiTaskProgressService 发的是 {pct}，
    //   原先这里只解构 progress → undefined → newProgress 保持原值，返回 200 但进度没动
    //   （QuickTaskCompletePage 会显示"进度已更新为 undefined%"）。
    //   现在同时接受 pct 与 progress（pct 优先，与 taskProgress 的契约对齐）。
    const rawProgress = body.pct !== undefined && body.pct !== null ? body.pct : body.progress;
    const progress = rawProgress === undefined || rawProgress === null ? undefined : Number(rawProgress);
    const { feedback, operator_id, operator_name, comment, status } = body;
    if (progress !== undefined && Number.isNaN(progress)) {
      return res.status(400).json({ success: false, error: '进度必须是数字' });
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
    const currentProgress = task.progress || 0;
    const newProgress = progress || currentProgress;

    // P0-4：如果传了 status 字段，UPDATE 时一并更新（状态机推进）
    // 若未传 status 则保持原 status 不变（向后兼容旧客户端）
    const normalizedStatus = status ? normalizeTaskStatus(status) : undefined;

    // P0-10：仅在显式推进状态时校验转移合法性（只改进度不校验）
    if (normalizedStatus && !guardTransition(res, task.status, normalizedStatus)) return;

    // 2026-10-21 P2c：进度到 100% / 状态推进到 completed 时，
    //   巡查计划任务必须已提交巡查记录（与 taskProgress.ts 的同名校验成对，防路由顺序开口）。
    const willComplete =
      normalizedStatus === 'completed' ||
      // 2026-10-23：巡查计划实例推进到「待验收」同样必须有记录 ——
      //   待验收的出口是「验收」，而验收的前提就是巡查记录。
      //   此前这里把 waiting_acceptance 显式排除了（当"待验收不算完成"），
      //   于是「提交进度 + status=waiting_acceptance」能把**无记录**的巡查实例推进到待验收，
      //   之后既不能补交记录（状态只允许 pending/accepted/in_progress）、
      //   也不能重提（无记录）→ 任务彻底死锁，且没有任何 UI 出口。
      (normalizedStatus === 'waiting_acceptance' && !!task.inspection_plan_id) ||
      (!normalizedStatus && Number(newProgress) >= 100 && task.status !== 'completed');
    if (willComplete) {
      const violation = assertInspectionRecordBeforeComplete(db, id);
      if (violation) {
        return res.status(409).json({ success: false, error: violation, code: 'INSPECTION_RECORD_REQUIRED' });
      }
    }

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
      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

    // 2026-10-23：补巡查记录守卫 —— 此前只有状态机校验，无记录的巡查实例
    //   可以直接提交验收进 waiting_acceptance，之后彻底死锁。
    {
      const violation = assertInspectionRecordBeforeAdvance(db, id, 'waiting_acceptance');
      if (violation) {
        return res.status(409).json({ success: false, error: violation, code: 'INSPECTION_RECORD_REQUIRED' });
      }
    }

    const now = new Date().toISOString();

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET status = 'waiting_acceptance', progress = 100, update_time = ? WHERE id = ?`,
        [now, id]);

      // 将 feedback 对象转为 JSON 字符串存储
      const feedbackStr = feedback ? JSON.stringify(feedback) : undefined;
      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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
    // 2026-10-21 P2c：巡查计划任务必须先提交巡查记录才能完成。
    //   注意：本端点当前被 taskProgress.ts 的同名端点遮蔽（routes/index.ts 先注册者先匹配），
    //   两处都加了同一校验，防止路由顺序调整后重新开口。
    const recordViolation = assertInspectionRecordBeforeComplete(db, id);
    if (recordViolation) {
      return res.status(409).json({ success: false, error: recordViolation, code: 'INSPECTION_RECORD_REQUIRED' });
    }
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
                                   estimated_vs_actual_ratio = ?, actual_area = ?, update_time = ?,
                                   -- 2026-10-20：验收通过后清理其它终态的时间戳，
                                   --   避免"已完成却带 rejected_at / cancelled_at"的矛盾数据
                                   rejected_at = NULL, cancelled_at = NULL, abandoned_at = NULL
                                   WHERE id = ?`,
        [now, actualHoursValue, actualHoursValue ? now : null, actualHoursValue ? (operator_id || '') : null,
         ratioValue, actualAreaValue, now, id]);

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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
      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

    // 2026-10-20：补状态守卫（此前本端点直接把 status 写成 pending，任何源状态都放行）
    if (!guardTransition(res, task.status, 'pending')) return;

    // P0-1：事务包裹
    runInTransaction(db, () => {
      db.run(`UPDATE farm_tasks SET assignee_id = ?, assignee_name = ?, status = 'pending', update_time = ? WHERE id = ?`,
        [assigneeId, assigneeName, now, id]);

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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

      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
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
      recordTaskOperation(req, db, id, task.task_code, task.task_title || task.title,
        operator_id || '', operator_name || '', 'remind', '催办', task.status, task.status, undefined, message);
    });

    res.json({ success: true, data: { id, reminded: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: '催办任务失败' });
  }
});

export default router;
