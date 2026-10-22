/**
 * 巡查计划 API（P2b）
 *
 * 端点（方案 §6.1）：
 *   GET    /api/inspection-plans                  列表（status/type/keyword/分页）
 *   POST   /api/inspection-plans                  创建 + 生成窗口内实例
 *   GET    /api/inspection-plans/:id              详情（含实例概览）
 *   PUT    /api/inspection-plans/:id              更新
 *   DELETE /api/inspection-plans/:id              归档（软删除）
 *   POST   /api/inspection-plans/:id/generate      手动生成 {from,to}（≤90 天）
 *   GET    /api/inspection-plans/:id/occurrences   实例列表
 *   GET    /api/inspection-plans/:id/stats         统计
 *
 * 权限说明：本期不引入计划级 RBAC（CurrentUser 无 role 字段，见既有审核结论），
 *   与其余农事接口一致仅 requireAuth；写操作统一落 operation_logs。
 *
 * 本期明确不做（文档声明）：
 *   · 计划审批（计划生成的任务直接 pending，不走派发审批）
 *   · 考勤排班表 schedules 的占用（只写 farm_task_schedules）
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase, saveDatabase } from '../db/index';
import { queryToObjects } from '../utils/queryHelper';
import { formatLocalDateISO } from '../utils/dateUtil';
import {
  validatePlanInput,
  createPlan,
  updatePlan,
  archivePlan,
  pausePlan,
  resumePlan,
  resyncFutureOccurrences,
  getPlanById,
  listOccurrences,
  generateOccurrences,
  MAX_WINDOW_DAYS,
  type InspectionPlanInput,
} from '../services/inspectionPlanService';

const router = Router();

/** 静态单段路由名（避免被 /:id 吃掉） */
const STATIC_ROUTE_SEGMENTS = new Set(['generate', 'occurrences', 'stats']);

/** 写操作审计（Fail Loud：写操作必须留痕） */
function logOperation(
  db: any,
  req: Request,
  action: string,
  resourceId: string,
  description: string
): void {
  db.run(
    `INSERT INTO operation_logs (id, user_id, username, action, module, resource_type, resource_id, description, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      req.user?.userId || '', req.user?.name || '系统',
      action, '巡查计划', 'inspection_plan', resourceId,
      description, 'success', new Date().toISOString(),
    ]
  );
}

/** 请求体 → 计划输入载荷 */
function toPlanInput(body: any): InspectionPlanInput {
  return {
    title: body.title,
    inspectionType: body.inspectionType ?? body.inspection_type,
    frequency: body.frequency,
    intervalValue: body.intervalValue ?? body.interval_value,
    weekdays: body.weekdays,
    dayOfMonth: body.dayOfMonth ?? body.day_of_month,
    startDate: body.startDate ?? body.start_date,
    endDate: body.endDate ?? body.end_date,
    windowDays: body.windowDays ?? body.window_days,
    defaultTime: body.defaultTime ?? body.default_time,
    durationHours: body.durationHours ?? body.duration_hours,
    assigneeId: body.assigneeId ?? body.assignee_id,
    assigneeName: body.assigneeName ?? body.assignee_name,
    teamId: body.teamId ?? body.team_id,
    teamName: body.teamName ?? body.team_name,
    autoSchedule: body.autoSchedule ?? body.auto_schedule,
    shiftCode: body.shiftCode ?? body.shift_code,
    greenhouseId: body.greenhouseId ?? body.greenhouse_id,
    greenhouseName: body.greenhouseName ?? body.greenhouse_name,
    cropName: body.cropName ?? body.crop_name,
    equipmentId: body.equipmentId ?? body.equipment_id,
    equipmentName: body.equipmentName ?? body.equipment_name,
    infrastructureId: body.infrastructureId ?? body.infrastructure_id,
    infrastructureName: body.infrastructureName ?? body.infrastructure_name,
    area: body.area,
    checklist: body.checklist,
  };
}

// ========== 列表 ==========

router.get('/', (req: Request, res: Response) => {
  try {
    const { status, inspection_type, keyword, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 注意：主 SQL 禁止子查询（queryHelper.execCount 的正则会从子查询内部 FROM 处截断）
    let sql = 'SELECT * FROM inspection_plans WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (inspection_type) {
      sql += ' AND inspection_type = ?';
      params.push(inspection_type);
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR plan_code LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    const countRows = queryToObjects<{ c: number }>(
      db,
      `SELECT COUNT(*) AS c FROM inspection_plans WHERE 1=1` +
        (status ? ' AND status = ?' : '') +
        (inspection_type ? ' AND inspection_type = ?' : '') +
        (keyword ? ' AND (title LIKE ? OR plan_code LIKE ?)' : ''),
      [...params]
    );
    const total = Number(countRows[0]?.c ?? 0);

    const offset = (Number(page) - 1) * Number(limit);
    const rows = queryToObjects<any>(
      db,
      sql + ' ORDER BY create_time DESC LIMIT ? OFFSET ?',
      [...params, Number(limit), offset]
    );

    // 批量补实例计数（不用 JOIN/子查询，避免 execCount 陷阱）
    const withCounts = rows.map((plan) => {
      const stat = queryToObjects<{ c: number }>(
        db,
        `SELECT COUNT(*) AS c FROM farm_tasks
         WHERE inspection_plan_id = ? AND inspection_plan_id <> '' AND status <> 'cancelled'`,
        [plan.id]
      );
      return { ...plan, occurrenceCount: Number(stat[0]?.c ?? 0) };
    });

    res.json({
      success: true,
      data: withCounts,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('[inspection-plans] 获取列表失败:', error);
    res.status(500).json({ success: false, error: '获取巡查计划列表失败' });
  }
});

// ========== 创建 ==========

router.post('/', async (req: Request, res: Response) => {
  try {
    const input = toPlanInput(req.body);
    const errors = validatePlanInput(input);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join('；'), errors });
    }

    const db = getDatabase();
    const plan = createPlan(db, input, {
      id: req.user?.userId,
      name: req.user?.name,
    });
    logOperation(db, req, 'create', plan.id, `创建巡查计划 ${plan.plan_code} ${plan.title}`);
    saveDatabase();

    // 创建后立即生成窗口内实例（方案 §7.6：不补历史）
    const gen = await generateOccurrences(db, plan);

    res.status(201).json({
      success: true,
      data: { ...plan, generate: gen },
      message: `计划已创建，生成实例 ${gen.created.length} 条${gen.scheduled ? `，已排班 ${gen.scheduled} 条` : ''}`,
    });
  } catch (error) {
    console.error('[inspection-plans] 创建失败:', error);
    res.status(500).json({ success: false, error: '创建巡查计划失败' });
  }
});

// ========== 静态子路由（必须先于 /:id）============

/** 实例列表：批量 join 排班与记录状态，避免 N+1（方案 §6.1） */
router.get('/:id/occurrences', (req: Request, res: Response, next: NextFunction) => {
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const db = getDatabase();
    const plan = getPlanById(db, req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: '巡查计划不存在' });

    const rows = listOccurrences(db, plan.id);
    const taskIds = rows.map((r) => r.task_id);

    // 一次 IN 查询取回排班 + 记录标记，代替逐行查
    const scheduleMap = new Map<string, any>();
    const recordMap = new Map<string, any>();
    if (taskIds.length > 0) {
      const ph = taskIds.map(() => '?').join(',');
      for (const s of queryToObjects<any>(
        db,
        `SELECT id, task_id, worker_name, plan_start, plan_end, shift_type, status
         FROM farm_task_schedules WHERE task_id IN (${ph}) AND status <> 'cancelled'`,
        taskIds
      )) {
        if (!scheduleMap.has(s.task_id)) scheduleMap.set(s.task_id, s);
      }
      for (const r of queryToObjects<any>(
        db,
        // 注意：inspections 表没有 issue_status 列（问题处理状态在 problems.status 上，
        //   列表/详情的 issueStatus 由 inspection 路由另行推导）。此处只取记录标识。
        `SELECT id, record_code, inspection_task_id FROM inspections
         WHERE inspection_task_id IN (${ph})`,
        taskIds
      )) {
        if (!recordMap.has(r.inspection_task_id)) recordMap.set(r.inspection_task_id, r);
      }
    }

    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        schedule: scheduleMap.get(r.task_id) || null,
        inspectionRecordId: recordMap.get(r.task_id)?.id || '',
        inspectionRecordCode: recordMap.get(r.task_id)?.record_code || '',
      })),
    });
  } catch (error) {
    console.error('[inspection-plans] 获取实例列表失败:', error);
    res.status(500).json({ success: false, error: '获取计划实例列表失败' });
  }
});

/** 统计：口径见方案 §8.3（窗口默认本月） */
router.get('/:id/stats', (req: Request, res: Response, next: NextFunction) => {
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const db = getDatabase();
    const plan = getPlanById(db, req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: '巡查计划不存在' });

    const { from, to } = resolveStatsRange(req.query.from as string, req.query.to as string);
    const params: any[] = [plan.id];
    let sql = `SELECT status, COUNT(*) AS c FROM farm_tasks
                WHERE inspection_plan_id = ? AND inspection_plan_id <> ''`;
    if (from) { sql += ' AND plan_occurrence_date >= ?'; params.push(from); }
    if (to) { sql += ' AND plan_occurrence_date <= ?'; params.push(to); }
    sql += ' GROUP BY status';

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of queryToObjects<{ status: string; c: number }>(db, sql, params)) {
      byStatus[row.status] = Number(row.c);
      total += Number(row.c);
    }

    const recordRows = queryToObjects<{ c: number }>(
      db,
      `SELECT COUNT(*) AS c FROM inspections
       WHERE inspection_plan_id = ? AND inspection_plan_id <> ''`,
      [plan.id]
    );
    const submitted = Number(recordRows[0]?.c ?? 0);

    res.json({
      success: true,
      data: {
        range: { from, to },
        total,
        byStatus,
        submittedRecords: submitted,
        // 应执行 = 已生成实例总数；已提交以记录为准；未提交 = 缺口
        missingRecords: Math.max(total - submitted, 0),
        completionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('[inspection-plans] 获取统计失败:', error);
    res.status(500).json({ success: false, error: '获取计划统计失败' });
  }
});

/** 手动生成：区间 ≤ 90 天（方案 §7.6） */
router.post('/:id/generate', async (req: Request, res: Response, next: NextFunction) => {
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const db = getDatabase();
    const plan = getPlanById(db, req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: '巡查计划不存在' });

    const from = req.body?.from || undefined;
    const to = req.body?.to || undefined;

    // 区间上限：90 天，超出直接拒绝而不是静默截断（让用户知道自己填错了）
    if (from && to) {
      const days = diffDaysLocal(from, to);
      if (days === null) {
        return res.status(400).json({ success: false, error: 'from / to 必须是合法的 YYYY-MM-DD' });
      }
      if (days > MAX_WINDOW_DAYS) {
        return res.status(400).json({
          success: false,
          error: `生成区间不能超过 ${MAX_WINDOW_DAYS} 天（收到 ${days + 1} 天）`,
        });
      }
    }

    const gen = await generateOccurrences(db, plan, from, to);
    logOperation(
      db, req, 'generate', plan.id,
      `生成计划 ${plan.plan_code} 实例：新增 ${gen.created.length} 条，跳过 ${gen.skipped.length} 条`
    );
    saveDatabase();

    res.json({ success: true, data: gen });
  } catch (error) {
    console.error('[inspection-plans] 生成实例失败:', error);
    res.status(500).json({ success: false, error: '生成计划实例失败' });
  }
});

// ========== 详情 / 更新 / 归档 ==========

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const db = getDatabase();
    const plan = getPlanById(db, req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: '巡查计划不存在' });
    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('[inspection-plans] 获取详情失败:', error);
    res.status(500).json({ success: false, error: '获取巡查计划详情失败' });
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const db = getDatabase();
    const plan = getPlanById(db, req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: '巡查计划不存在' });

    const input = toPlanInput(req.body);
    // 校验用「合并后的完整计划」：局部更新时未传的字段沿用原值，
    // 否则 weekly 计划只改标题会被误判为「weekdays 缺失」。
    const merged: InspectionPlanInput = {
      title: input.title ?? plan.title,
      inspectionType: input.inspectionType ?? plan.inspection_type,
      frequency: input.frequency ?? plan.frequency,
      intervalValue: input.intervalValue ?? plan.interval_value,
      weekdays: input.weekdays ?? plan.weekdays,
      dayOfMonth: input.dayOfMonth ?? plan.day_of_month,
      startDate: input.startDate ?? plan.start_date,
      endDate: input.endDate ?? plan.end_date,
      windowDays: input.windowDays ?? plan.window_days,
      assigneeId: input.assigneeId ?? plan.assignee_id,
      assigneeName: input.assigneeName ?? plan.assignee_name,
      area: input.area ?? plan.area,
      equipmentName: input.equipmentName ?? plan.equipment_name,
      infrastructureName: input.infrastructureName ?? plan.infrastructure_name,
    };
    const errors = validatePlanInput(merged);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join('；'), errors });
    }

    // 暂停/恢复走专用逻辑（取消/补生成实例），不能当普通字段更新糊过去（方案 §7.5）
    const nextStatus = String(req.body?.status || '');
    if (nextStatus === 'paused' && plan.status !== 'paused') {
      const paused = pausePlan(db, plan, String(req.body?.pauseReason || '计划暂停'));
      logOperation(db, req, 'pause', plan.id, `暂停巡查计划 ${plan.plan_code}，取消未来实例 ${paused.cancelledTasks.length} 条`);
      saveDatabase();
      return res.json({ success: true, data: getPlanById(db, plan.id), pause: paused });
    }
    if (nextStatus === 'active' && plan.status === 'paused') {
      resumePlan(db, plan);
      logOperation(db, req, 'resume', plan.id, `恢复巡查计划 ${plan.plan_code}`);
      // 恢复后立即补齐缺失日期（cancelled 行保留为台账，靠唯一索引排除后可重建）
      const gen = await generateOccurrences(db, getPlanById(db, plan.id)!);
      saveDatabase();
      return res.json({ success: true, data: getPlanById(db, plan.id), generate: gen });
    }

    const { dropped } = updatePlan(db, plan.id, req.body);
    logOperation(db, req, 'update', plan.id, `更新巡查计划 ${plan.plan_code}`);
    saveDatabase();

    // 2026-10-21 P4：同步未来实例（方案 §7.5「编辑」）
    //   只动「今天及以后 + pending + 无记录」的实例；已执行/已提交台账永不改动。
    //   不改计划的话不做任何同步（纯备注编辑不该触发重排）。
    const touchesInstances =
      req.body?.frequency !== undefined || req.body?.weekdays !== undefined ||
      req.body?.dayOfMonth !== undefined || req.body?.intervalValue !== undefined ||
      req.body?.startDate !== undefined || req.body?.endDate !== undefined ||
      req.body?.assigneeId !== undefined || req.body?.assigneeName !== undefined ||
      req.body?.defaultTime !== undefined || req.body?.durationHours !== undefined ||
      req.body?.windowDays !== undefined;
    const resync = touchesInstances
      ? resyncFutureOccurrences(db, plan, input)
      : null;
    // 新频率多出的日期：补生成（幂等；已存在的日期会被 occurrenceExists 跳过）
    const regen = resync && resync.toGenerate.length > 0
      ? await generateOccurrences(db, getPlanById(db, plan.id)!)
      : null;
    saveDatabase();

    const updated = getPlanById(db, plan.id);
    res.json({
      success: true,
      data: updated,
      ...(resync ? {
        resync: {
          updated: resync.updated.length,
          cancelled: resync.cancelled.length,
          conflicts: resync.conflicts,
        },
      } : {}),
      ...(regen ? { generate: regen } : {}),
      ...(dropped.length > 0 ? { message: `以下字段不在可更新范围，已忽略：${dropped.join('、')}` } : {}),
    });
  } catch (error) {
    console.error('[inspection-plans] 更新失败:', error);
    res.status(500).json({ success: false, error: '更新巡查计划失败' });
  }
});

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  if (STATIC_ROUTE_SEGMENTS.has(req.params.id)) return next();
  try {
    const db = getDatabase();
    const plan = getPlanById(db, req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: '巡查计划不存在' });

    archivePlan(db, plan.id);
    logOperation(db, req, 'archive', plan.id, `归档巡查计划 ${plan.plan_code}`);
    saveDatabase();

    res.json({ success: true, message: '计划已归档（软删除，历史实例保留为台账）' });
  } catch (error) {
    console.error('[inspection-plans] 归档失败:', error);
    res.status(500).json({ success: false, error: '归档巡查计划失败' });
  }
});

// ========== 辅助 ==========

/** 统计默认区间：本月（方案 §8.3） */
function resolveStatsRange(from?: string, to?: string): { from: string; to: string } {
  const today = formatLocalDateISO();
  if (from && to) return { from, to };
  const d = new Date();
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  return { from: from || monthStart, to: to || today };
}

/** 本地日期差（避免 UTC 解析）；非法输入返回 null */
function diffDaysLocal(from: string, to: string): number | null {
  const re = /^(\d{4})-(\d{2})-(\d{2})$/;
  const a = re.exec(String(from || ''));
  const b = re.exec(String(to || ''));
  if (!a || !b) return null;
  const da = new Date(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const db = new Date(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  if (da.getTime() > db.getTime()) return null;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export default router;