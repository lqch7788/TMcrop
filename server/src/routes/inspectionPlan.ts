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
// 2026-10-22：统计的「应执行」必须按当前频率重算，复用同一份算法，避免与生成器漂移
import { computeOccurrences } from '../lib/inspectionPlanFrequency';
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
    // 2026-10-22（审核 L1）：原实现每条计划一次 COUNT(*) —— 前端 limit=200 时是 200 次查询。
    //   改成一次 GROUP BY 的 IN 查询。
    const countMap = new Map<string, number>();
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const ph = ids.map(() => '?').join(',');
      for (const r of queryToObjects<{ pid: string; c: number }>(
        db,
        `SELECT inspection_plan_id AS pid, COUNT(*) AS c FROM farm_tasks
         WHERE inspection_plan_id IN (${ph}) AND inspection_plan_id <> '' AND status <> 'cancelled'
         GROUP BY inspection_plan_id`,
        ids
      )) {
        countMap.set(String(r.pid), Number(r.c));
      }
    }
    const withCounts = rows.map((plan) => ({
      ...plan,
      occurrenceCount: countMap.get(String(plan.id)) ?? 0,
    }));

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
    //
    // 2026-10-22（审核 M5）：副作用失败不能用 500 表达。
    //   计划此时**已经落盘**，若生成抛错就返回 500，用户会以为「创建失败」并重试，
    //   而 nextPlanCode 每次都会生成新编号 → 重复计划（重试放大）。
    //   改为：主对象成功即 201，副作用失败通过 generateError 显式告知。
    let gen: Awaited<ReturnType<typeof generateOccurrences>> | null = null;
    let generateError = '';
    try {
      gen = await generateOccurrences(db, plan);
    } catch (e: any) {
      generateError = e?.message || String(e);
      console.error('[inspection-plans] 计划已创建但生成实例失败:', generateError);
    }

    // 2026-10-22（审核 P2-1）：附带信息必须放进 data。
    //   enhancedApiClient 只返回响应里的 `data` 字段，`data` 的兄弟字段会被整段丢弃
    //   —— 原先 pause/generate/resync 放在顶层，前端拿到的永远是 undefined，
    //   于是"暂停后取消 0 条"这类提示恒为 0。
    res.status(201).json({
      success: true,
      data: { ...plan, generate: gen, generateError: generateError || undefined },
      message: generateError
        ? `计划已创建，但生成实例失败：${generateError}（可在详情页点「生成排期」重试）`
        : `计划已创建，生成实例 ${gen?.created.length ?? 0} 条${gen?.scheduled ? `，已排班 ${gen.scheduled} 条` : ''}`,
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

    // listOccurrences 内部用 queryRows（保留蛇形列名），所以 rows 是 snake_case；
    // 下面的排班/记录映射来自 queryToObjects（驼峰），两者**不能混用同一套键名**。
    const rows = listOccurrences(db, plan.id);
    const taskIds = rows.map((r) => r.task_id);

    // 一次 IN 查询取回排班 + 记录标记，代替逐行查。
    //
    // 2026-10-22（审核 P0-1）：这里必须用**驼峰**键。
    //   queryToObjects 会把列名转驼峰（task_id → taskId、record_code → recordCode），
    //   原先按蛇形读写 Map → 键恒为 undefined，于是每条实例的 schedule 都是 null、
    //   记录标记都是空串：排班列永远显示「未排班」、已提交的任务仍显示「填写记录」。
    //   与「统计 verified/overdue 恒 0」是同一个根因。
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
        const key = String(s.taskId ?? s.task_id ?? '');
        if (key && !scheduleMap.has(key)) scheduleMap.set(key, s);
      }
      for (const r of queryToObjects<any>(
        db,
        // 注意：inspections 表没有 issue_status 列（问题处理状态在 problems.status 上，
        //   列表/详情的 issueStatus 由 inspection 路由另行推导）。此处只取记录标识。
        `SELECT id, record_code, inspection_task_id FROM inspections
         WHERE inspection_task_id IN (${ph})`,
        taskIds
      )) {
        const key = String(r.inspectionTaskId ?? r.inspection_task_id ?? '');
        if (key && !recordMap.has(key)) recordMap.set(key, r);
      }
    }

    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        schedule: scheduleMap.get(r.task_id) || null,
        inspectionRecordId: recordMap.get(r.task_id)?.id || '',
        inspectionRecordCode: recordMap.get(r.task_id)?.recordCode
          ?? recordMap.get(r.task_id)?.record_code
          ?? '',
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
    const today = formatLocalDateISO();
    const data = computePlanStats(db, plan, from, to, today);
    res.json({ success: true, data });
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

    // 2026-10-22（审核 M1）：区间校验不能只在 from、to **同时**存在时才做。
    //   原实现 `if (from && to)`：只传 to=2030-12-31 时 from 回落到今天，
    //   computeOccurrences 会扫满 MAX_SCAN_DAYS(366) 天，一次生成 366 条；
    //   只传 from=2020-01-01 则会从 2020 年往后扫 366 天，批量造历史 pending 任务，
    //   直接违反「不补历史」。
    //   现在：任一存在即按「缺省值 + 服务端默认」算出真实区间再校验，并给条数硬上限。
    if (from || to) {
      const today = formatLocalDateISO();
      const effectiveFrom = from || today;
      const windowDays = Math.min(Math.max(Number(plan.window_days ?? 14), 1), MAX_WINDOW_DAYS);
      const defaultTo = (() => {
        const d = new Date();
        d.setDate(d.getDate() + windowDays);
        return formatLocalDateISO(d);
      })();
      const effectiveTo = to || defaultTo;

      const days = diffDaysLocal(effectiveFrom, effectiveTo);
      if (days === null) {
        return res.status(400).json({
          success: false,
          error: 'from / to 必须是合法的 YYYY-MM-DD，且 to 不得早于 from',
        });
      }
      if (days > MAX_WINDOW_DAYS) {
        return res.status(400).json({
          success: false,
          error: `生成区间不能超过 ${MAX_WINDOW_DAYS} 天（收到 ${days + 1} 天）`,
        });
      }
      // 不补历史：起始早于今天时明确拒绝（而不是静默从今天开始，用户会以为补上了）
      if (from && from < today) {
        return res.status(400).json({
          success: false,
          error: `不支持补生成历史实例（from=${from} 早于今天 ${today}）`,
        });
      }
    }

    const gen = await generateOccurrences(db, plan, from, to);
    logOperation(
      db, req, 'generate', plan.id,
      `生成计划 ${plan.plan_code} 实例：新增 ${gen.created.length} 条，跳过 ${gen.skipped.length} 条`
    );
    saveDatabase();

    // 2026-10-22（审核 P2-7）：blockedReason 必须回传（归档/暂停计划点生成是静默 0 条）
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
    //
    // 2026-10-22（审核 M9）：原先两个分支直接 `return`，同一请求里的**其它字段被静默丢弃**
    //   （PUT {status:'paused', title:'新名字'} 只暂停、title 不保存且无提示）。
    //   现在从 body 里摘掉 status/pauseReason 后照常走 updatePlan，再执行生命周期动作。
    const nextStatus = String(req.body?.status || '');
    const isPausing = nextStatus === 'paused' && plan.status !== 'paused';
    const isResuming = nextStatus === 'active' && plan.status === 'paused';
    const restBody = { ...req.body };
    delete restBody.status;
    delete restBody.pauseReason;

    if (isPausing || isResuming) {
      const { dropped: lifecycleDropped } = updatePlan(db, plan.id, restBody);
      if (isPausing) {
        const paused = pausePlan(db, plan, String(req.body?.pauseReason || '计划暂停'));
        logOperation(db, req, 'pause', plan.id, `暂停巡查计划 ${plan.plan_code}，取消未来实例 ${paused.cancelledTasks.length} 条`);
        saveDatabase();
        return res.json({
          success: true,
          // P2-1：附带信息放进 data（顶层字段会被 enhancedApiClient 丢弃）
          data: { ...getPlanById(db, plan.id), pause: paused },
          ...(lifecycleDropped.length > 0 ? { message: `以下字段不在可更新范围，已忽略：${lifecycleDropped.join('、')}` } : {}),
        });
      }
      resumePlan(db, plan);
      logOperation(db, req, 'resume', plan.id, `恢复巡查计划 ${plan.plan_code}`);
      // 恢复后立即补齐缺失日期（cancelled 行保留为台账，靠唯一索引排除后可重建）
      const gen = await generateOccurrences(db, getPlanById(db, plan.id)!);
      saveDatabase();
      return res.json({ success: true, data: { ...getPlanById(db, plan.id), generate: gen } });
    }

    const { dropped } = updatePlan(db, plan.id, req.body);
    logOperation(db, req, 'update', plan.id, `更新巡查计划 ${plan.plan_code}`);
    saveDatabase();

    // 2026-10-21 P4：同步未来实例（方案 §7.5「编辑」）
    //   只动「今天及以后 + pending + 无记录」的实例；已执行/已提交台账永不改动。
    //   不改计划的话不做任何同步（纯备注编辑不该触发重排）。
    // 2026-10-22（审核 P3-6）：注意当前表单**每次保存都发全套字段**，
    //   所以这一判断在 UI 路径上恒为 true —— 每次保存都会重排未来实例。
    //   重排本身幂等（只动「今天及以后 + pending + 无记录」的实例），可接受；
    //   若将来要支持「纯备注编辑不重排」，需要前端改成只提交变更字段（PATCH 语义）。
    const touchesInstances =
      req.body?.title !== undefined ||
      req.body?.frequency !== undefined || req.body?.weekdays !== undefined ||
      req.body?.dayOfMonth !== undefined || req.body?.intervalValue !== undefined ||
      req.body?.startDate !== undefined || req.body?.endDate !== undefined ||
      req.body?.assigneeId !== undefined || req.body?.assigneeName !== undefined ||
      req.body?.defaultTime !== undefined || req.body?.durationHours !== undefined ||
      req.body?.windowDays !== undefined;
    // 2026-10-22（审核 M5）：重排/补生成失败不能把已落盘的更新报成 500。
    //   主对象已保存，副作用失败用 resyncError 告知，用户可在详情页「生成排期」重试。
    let resync = null as Awaited<ReturnType<typeof resyncFutureOccurrences>> | null;
    let regen = null as Awaited<ReturnType<typeof generateOccurrences>> | null;
    let resyncError = '';
    if (touchesInstances) {
      try {
        resync = await resyncFutureOccurrences(db, plan, input);
        if (resync.toGenerate.length > 0) {
          // 新频率多出的日期：补生成（幂等；已存在的日期会被 occurrenceExists 跳过）
          regen = await generateOccurrences(db, getPlanById(db, plan.id)!);
        }
      } catch (e: any) {
        resyncError = e?.message || String(e);
        console.error('[inspection-plans] 计划已更新但同步实例失败:', resyncError);
      }
    }
    saveDatabase();

    const updated = getPlanById(db, plan.id);
    res.json({
      success: true,
      // P2-1：附带信息放进 data（顶层字段会被 enhancedApiClient 丢弃）
      data: {
        ...updated,
        ...(resync ? {
          resync: {
            updated: resync.updated.length,
            cancelled: resync.cancelled.length,
            conflicts: resync.conflicts,
          },
        } : {}),
        ...(regen ? { generate: regen } : {}),
        ...(resyncError ? { resyncError } : {}),
      },
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

    const archived = archivePlan(db, plan.id);
    logOperation(
      db, req, 'archive', plan.id,
      `归档巡查计划 ${plan.plan_code}，取消未来实例 ${archived.cancelledTasks.length} 条`
    );
    saveDatabase();

    res.json({
      success: true,
      data: { cancelledTasks: archived.cancelledTasks.length },
      message: `计划已归档（软删除，历史实例保留为台账），取消未来实例 ${archived.cancelledTasks.length} 条`,
    });
  } catch (error) {
    console.error('[inspection-plans] 归档失败:', error);
    res.status(500).json({ success: false, error: '归档巡查计划失败' });
  }
});

// ========== 辅助 ==========

/**
 * 计划统计（方案 §8.3，8 项指标）
 *
 * 口径要点（每条都对应方案表格里的一行）：
 *   · 应执行 = 按**当前频率**在窗口内算出的日期数 − 落在暂停区间内的日期数；
 *     归档计划不计（返回 0），因为「归档」语义就是「后续不再要求执行」。
 *   · 已生成 排除 cancelled；被取消的实例单列「已取消」，避免与已生成重复计数。
 *   · 已排班 / 已记录 都按 **distinct 任务**算 —— 一条任务可能有多条排班（多人）。`+
 *   · 已验收 = 任务 completed **且**存在记录（只有记录没有验收不算）。
 *   · 逾期未执行 = 执行日已过 且 无记录 且 状态不是 cancelled/completed。
 *   · 未闭环问题 = 由该计划的巡查记录产生、状态未完成的问题。
 *
 * 注意：主查询刻意不用 JOIN 聚合，避免 queryHelper.execCount 的子查询截断问题
 *（本端点不用 execCount，但保持同一写法风格便于后续复用）。
 */
function computePlanStats(
  db: any,
  plan: any,
  from: string,
  to: string,
  today: string
): Record<string, unknown> {
  // 窗口内的实例任务（一次取回，后续在内存里分类，避免多次全表扫描）
  //
  // 2026-10-22（审核 P1-5）：queryToObjects 返回的是**驼峰**键
  //   （plan_occurrence_date → planOccurrenceDate），原实现按蛇形读 → 全部 undefined，
  //   于是 overdue 恒 0、recordedIds 里全是 "undefined" → verified 恒 0。
  const tasks = queryToObjects<{
    id: string;
    status: string;
    planOccurrenceDate: string;
  }>(
    db,
    `SELECT id, status, plan_occurrence_date FROM farm_tasks
     WHERE inspection_plan_id = ? AND inspection_plan_id <> ''
       AND plan_occurrence_date >= ? AND plan_occurrence_date <= ?`,
    [plan.id, from, to]
  );

  const byStatus: Record<string, number> = {};
  for (const t of tasks) byStatus[t.status] = (byStatus[t.status] || 0) + 1;

  const cancelled = tasks.filter((t) => t.status === 'cancelled').length;
  const generated = tasks.length - cancelled;

  // 已排班 / 已记录：只看非 cancelled 任务
  const activeIds = tasks.filter((t) => t.status !== 'cancelled').map((t) => t.id);
  let scheduled = 0;
  let recorded = 0;
  let verified = 0;
  const recordedIds = new Set<string>();

  if (activeIds.length > 0) {
    const ph = activeIds.map(() => '?').join(',');
    const scheduleRows = queryToObjects<{ taskId: string }>(
      db,
      `SELECT DISTINCT task_id FROM farm_task_schedules
       WHERE task_id IN (${ph}) AND status <> 'cancelled'`,
      activeIds
    );
    scheduled = scheduleRows.length;

    const recordRows = queryToObjects<{ inspectionTaskId: string; id: string }>(
      db,
      `SELECT inspection_task_id, id FROM inspections WHERE inspection_task_id IN (${ph})`,
      activeIds
    );
    recorded = recordRows.length;
    for (const r of recordRows) recordedIds.add(String(r.inspectionTaskId));
    verified = tasks.filter(
      (t) => t.status === 'completed' && recordedIds.has(String(t.id))
    ).length;
  }

  // 逾期未执行
  const overdue = tasks.filter(
    (t) =>
      String(t.planOccurrenceDate) < today &&
      !recordedIds.has(String(t.id)) &&
      t.status !== 'cancelled' &&
      t.status !== 'completed'
  ).length;

  // 应执行：按当前频率算日期数 − 暂停区间日期数；归档计划不计
  let expected = 0;
  if (plan.status !== 'archived') {
    const dates = computeOccurrences(
      {
        start_date: plan.start_date,
        end_date: plan.end_date,
        frequency: plan.frequency,
        interval_value: plan.interval_value,
        weekdays: plan.weekdays,
        day_of_month: plan.day_of_month,
      },
      from,
      to,
      // 2026-10-22（审核 P2-2）：统计要覆盖整个区间（「全周期」可能跨多年）。
      //   默认的 366 天扫描上限是给「生成」用的防跑死护栏，
      //   套在统计上会让运行超过一年的计划 expected 少算。
      { allowLongRange: true }
    );
    const paused = parsePauseRanges(plan.pause_ranges);
    // 2026-10-22（审核 P2-3）：暂停区间不能把「确实要执行」的日期扣掉。
    //   恢复计划时区间收口到当天，同一天既在暂停区间内、又有重建的 pending 实例，
    //   直接按区间扣减会让 expected=0 而实际有 1 条 —— 执行率恒 0，用户以为计划没生效。
    //   规则：该日期若已存在**非 cancelled** 实例，就说明它要执行，不做扣减。
    const datesWithLiveTask = new Set(
      tasks.filter((t) => t.status !== 'cancelled').map((t) => String(t.planOccurrenceDate))
    );
    expected = dates.filter((d) => datesWithLiveTask.has(d) || !isDatePaused(d, paused)).length;
  }

  // 未闭环问题：由该计划的巡查记录产生
  const openProblems = queryToObjects<{ c: number }>(
    db,
    `SELECT COUNT(*) AS c FROM problems p
     WHERE p.source_module = 'inspection'
       AND p.source_id IN (
         SELECT i.record_code FROM inspections i
         WHERE i.inspection_plan_id = ? AND i.inspection_plan_id <> ''
       )
       AND p.status NOT IN ('completed', '已处理', 'closed')`,
    [plan.id]
  )[0]?.c ?? 0;

  return {
    range: { from, to },
    expected,
    generated,
    cancelled,
    scheduled,
    recorded,
    verified,
    overdue,
    openProblems: Number(openProblems),
    // 执行率 = 已记录 / 应执行（应执行为 0 时按 0 处理，不产生 NaN）
    completionRate: expected > 0 ? Math.round((recorded / expected) * 100) : 0,
    // 兼容旧字段（前端旧版本仍在读，避免一次性破坏）
    total: tasks.length,
    byStatus,
    submittedRecords: recorded,
    missingRecords: Math.max(expected - recorded, 0),
  };
}

/** 解析暂停区间（JSON [{from,to}]，to 为空表示「至今未恢复」） */
function parsePauseRanges(raw: unknown): Array<{ from: string; to: string }> {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r: any) => ({ from: String(r?.from || ''), to: String(r?.to || '') }))
      .filter((r) => r.from);
  } catch {
    return [];
  }
}

/** 某日期是否落在任一暂停区间内（to 为空视为无限期到 today） */
function isDatePaused(date: string, ranges: Array<{ from: string; to: string }>): boolean {
  for (const r of ranges) {
    const end = r.to || '9999-12-31';
    if (date >= r.from && date <= end) return true;
  }
  return false;
}

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