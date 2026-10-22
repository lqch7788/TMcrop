/**
 * 巡查计划服务（2026-10-21 P2b）
 *
 * 【定位】
 * 巡查计划是「模板」：定义谁、多久查一次、查什么、查多久。
 * 实例化出来的执行单**仍是 farm_tasks**，不新建第二套任务/排班/状态系统
 * （这是刚完成的「临时任务并入农事任务」教训的直接延续）。
 *
 * 【为什么单事务】
 * 一次生成要写 N 条 farm_tasks + M 条 farm_task_schedules。
 * 中途失败若不回滚，就会留下「有任务没排班」或「有排班没任务」的半截数据 ——
 * 计划统计和人员负荷都会算错。整个生成包在 runInTransaction 里，失败整体回滚。
 *
 * 【幂等的三道防线】
 *   1. occurrenceExists() 逐日期预查（谓词与唯一索引逐字一致，见 OCCURRENCE_EXISTS_SQL）
 *   2. uk_farm_tasks_plan_occurrence 唯一索引（DB 层最终防线）
 *   3. 单事务（并发生成互相看不到中间态）
 * 三道缺一不可：预查避免无谓写入，索引兜住并发，事务保证原子性。
 */
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper'; // 仅路由层响应序列化用；本服务内部一律用 queryRows 保留蛇形列名
import { formatLocalDateYYYYMMDD, formatLocalDateISO } from '../utils/dateUtil';
import { generateId, maxNumericSuffix } from '../utils/id';
import {
  computeOccurrences,
  validateFrequencyInput,
  formatLocalDate,
  parseLocalDate,
  type PlanFrequencyInput,
} from '../lib/inspectionPlanFrequency';
import { autoAssignSchedule, resolveEmployeeId } from './farmTaskScheduleService';

// ========== 类型 ==========

export interface InspectionPlanRow {
  id: string;
  plan_code: string;
  title: string;
  inspection_type: string;
  greenhouse_id?: string | null;
  greenhouse_name?: string | null;
  crop_name?: string | null;
  equipment_id?: string | null;
  equipment_name?: string | null;
  infrastructure_id?: string | null;
  infrastructure_name?: string | null;
  area?: string | null;
  checklist?: string;
  frequency: string;
  interval_value?: number | null;
  weekdays?: string;
  day_of_month?: number | null;
  start_date: string;
  end_date?: string | null;
  window_days?: number | null;
  default_time?: string | null;
  duration_hours?: number | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  auto_schedule?: number | null;
  shift_code?: string | null;
  pause_ranges?: string;
  status?: string;
  created_by?: string | null;
  created_by_name?: string | null;
  create_time?: string;
  update_time?: string;
  version?: number;
}

/** 计划写入载荷（camelCase，前端入参） */
export interface InspectionPlanInput {
  title: string;
  inspectionType: string;
  frequency: string;
  intervalValue?: number | null;
  weekdays?: string | number[] | null;
  dayOfMonth?: number | null;
  startDate: string;
  endDate?: string | null;
  windowDays?: number | null;
  defaultTime?: string | null;
  durationHours?: number | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  autoSchedule?: boolean | number | null;
  shiftCode?: string | null;
  greenhouseId?: string | null;
  greenhouseName?: string | null;
  cropName?: string | null;
  equipmentId?: string | null;
  equipmentName?: string | null;
  infrastructureId?: string | null;
  infrastructureName?: string | null;
  area?: string | null;
  checklist?: Array<{ key: string; label: string; required?: boolean }> | null;
  status?: string;
}

export interface GenerateResult {
  planId: string;
  /** 本次生成的日期（升序） */
  created: string[];
  /** 已存在而跳过的日期 */
  skipped: string[];
  /** 计划本身不可生成时的原因（status 非 active / 频率非法等） */
  blockedReason?: string;
  /** 自动排班统计 */
  scheduled: number;
  unscheduledReasons: Record<string, string>;
}

/** 实例任务（查重/统计用） */
export interface OccurrenceRow {
  task_id: string;
  task_code: string;
  task_title: string;
  task_type: string;
  status: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  plan_occurrence_date: string;
  plan_date?: string | null;
  plan_time?: string | null;
  plan_end?: string | null;
  estimated_hours?: number | null;
  description?: string | null;
  inspection_plan_id: string;
}

// ========== 常量 ==========

/**
 * 实例查重谓词。
 *
 * 必须与唯一索引 uk_farm_tasks_plan_occurrence 的 WHERE 条件**逐字一致**：
 *   inspection_plan_id <> '' AND plan_occurrence_date <> '' AND status <> 'cancelled'
 * 两处（索引定义在 fixSchemaColumns.ts、这里）抽同一份常量语义。
 * 若查重口径比索引宽（少排除 cancelled），会出现「预查说不存在、插入却撞唯一约束」
 * 的 500；若比索引窄，会漏生成重复任务。
 */
const OCCURRENCE_EXISTS_SQL = `
  SELECT id FROM farm_tasks
  WHERE inspection_plan_id = ?
    AND inspection_plan_id <> ''
    AND plan_occurrence_date = ?
    AND plan_occurrence_date <> ''
    AND status <> 'cancelled'
  LIMIT 1
`;

/** 生成窗口上限（方案 §12-12：window_days ≤ 90，手动生成区间 ≤90 天） */
export const MAX_WINDOW_DAYS = 90;

/** 巡查任务固定类型（方案 §5.1：系统类型不进新建下拉，只由计划生成） */
const INSPECTION_TASK_TYPE = 'inspection';
const INSPECTION_TASK_TYPE_NAME = '巡查';

// ========== 事务助手 ==========

/**
 * 读行（保留 snake_case 列名）。
 *
 * 不能用 queryToObjects：它会把列名转成驼峰（start_date → startDate），
 * 而本模块内部一律按数据库列名（plan.start_date）访问 ——
 * 混用会导致所有字段读成 undefined，频率计算恒不命中、生成结果恒为空
 * （首次实测：POST 201 但 created=[]，原因就是这个）。
 */
function queryRows<T = any>(db: any, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as unknown as T);
  stmt.free();
  return rows;
}

/** 与 farmTask.ts 同款：BEGIN IMMEDIATE → COMMIT → saveDatabase，失败 ROLLBACK */
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

// ========== 编号生成 ==========

/** 计划编号 XHJH{YYYYMMDD}-{3位日序}，当日 MAX+1（方案 §4.5） */
export function nextPlanCode(db: any, ymd: string = formatLocalDateYYYYMMDD()): string {
  const prefix = `XHJH${ymd}-`;
  const rows = queryRows<{ plan_code: string }>(
    db,
    'SELECT plan_code FROM inspection_plans WHERE plan_code LIKE ?',
    [`${prefix}%`]
  );
  // 2026-10-22（审核 L3）：合并到 maxNumericSuffix —— 原 slice(-3) 在 4 位序号时取错位
  const seq = maxNumericSuffix(rows.map((r) => String(r.plan_code || ''))) + 1;
  return `${prefix}${String(seq).padStart(seq > 999 ? 4 : 3, '0')}`;
}

/** 任务编号 NS{YYYYMMDD}-{3位日序}，当日 MAX+1；>999 扩为 4 位（方案 §4.5） */
export function nextTaskCode(db: any, ymd: string): string {
  const prefix = `NS${ymd}-`;
  // 当日编号最多约 1000 条，全量取回在内存里比数值，代价可忽略
  const rows = queryRows<{ task_code: string }>(
    db,
    'SELECT task_code FROM farm_tasks WHERE task_code LIKE ?',
    [`${prefix}%`]
  );
  // 2026-10-22（审核 L3）：不能只取字符串最大的一条。
  //   ORDER BY task_code DESC 走字符串比较，"…-999" > "…-1000"（'9' > '1'），
  //   当日第 1000 条会算成 1000 → 与已存在的 NS…-1000 撞唯一约束。
  //   改为取当日全部编号后在内存里按数值求最大。
  const n = maxNumericSuffix(rows.map((r) => String(r.task_code || ''))) + 1;
  return `${prefix}${String(n).padStart(n > 999 ? 4 : 3, '0')}`;
}

// ========== 校验 ==========

/**
 * 计划保存校验（方案 §6.2）。
 * 返回错误信息数组；非空表示拒绝保存。
 * 目标：非法组合在**保存时**暴露，不留到生成阶段静默不生成。
 */
export function validatePlanInput(input: InspectionPlanInput): string[] {
  const errors: string[] = [];

  if (!String(input.title || '').trim()) errors.push('计划名称必填');

  const type = String(input.inspectionType || '');
  if (!type) errors.push('巡查类型必填');
  else if (!['farm', 'equipment', 'infrastructure', 'safety', 'other'].includes(type)) {
    errors.push('巡查类型必须是 farm / equipment / infrastructure / safety / other 之一');
  }

  const freqInput: PlanFrequencyInput = {
    start_date: String(input.startDate || ''),
    end_date: input.endDate ?? null,
    frequency: String(input.frequency || ''),
    interval_value: input.intervalValue ?? 1,
    weekdays: input.weekdays ?? null,
    day_of_month: input.dayOfMonth ?? null,
  };
  errors.push(...validateFrequencyInput(freqInput));

  // 执行人必填：否则实例任务不进待排班，任务列表里出现无主工单（审核 M5）
  if (!String(input.assigneeId || '').trim() && !String(input.assigneeName || '').trim()) {
    errors.push('执行人必填（否则生成的巡查任务无人可派）');
  }

  const windowDays = Number(input.windowDays ?? 14);
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > MAX_WINDOW_DAYS) {
    errors.push(`生成窗口天数必须是 1..${MAX_WINDOW_DAYS} 的整数`);
  }

  // 安全检查的检查区域必填（与巡查记录侧的安全检查校验同口径）
  if (type === 'safety' && !String(input.area || '').trim()) {
    errors.push('安全检查必须填写检查区域/场所');
  }
  if (type === 'equipment' && !String(input.equipmentName || '').trim()) {
    errors.push('设备保养巡查必须选择设备');
  }
  if (type === 'infrastructure' && !String(input.infrastructureName || '').trim()) {
    errors.push('基础设施巡检必须选择设施');
  }

  return errors;
}

// ========== 读 ==========

/** 取计划（不存在返回 null） */
export function getPlanById(db: any, id: string): InspectionPlanRow | null {
  const rows = queryRows<InspectionPlanRow>(db, 'SELECT * FROM inspection_plans WHERE id = ?', [id]);
  return rows[0] || null;
}

/** 取全部 active 计划（启动补齐 / cron 用） */
export function listActivePlans(db: any): InspectionPlanRow[] {
  return queryRows<InspectionPlanRow>(
    db,
    "SELECT * FROM inspection_plans WHERE status = 'active' ORDER BY create_time DESC"
  );
}

/**
 * 计划对应的实例任务（含已取消，作为台账）
 *
 * 2026-10-22（审核 L2）：加 LIMIT。计划跑一年后详情页会一次拉几百行；
 *   默认 500 条与全站列表口径一致（apiLimits.LIST_FETCH_LIMIT），超出时由调用方分页。
 */
export function listOccurrences(db: any, planId: string, limit = 500): OccurrenceRow[] {
  return queryRows<OccurrenceRow>(
    db,
    `SELECT id AS task_id, task_code, task_title, task_type, status,
            assignee_id, assignee_name, plan_occurrence_date, plan_date, plan_time, plan_end,
            estimated_hours, description, inspection_plan_id
     FROM farm_tasks
     WHERE inspection_plan_id = ? AND inspection_plan_id <> ''
     ORDER BY plan_occurrence_date ASC
     LIMIT ?`,
    [planId, limit]
  );
}

/** 查重：该计划该日期是否已有实例（谓词与唯一索引一致） */
export function occurrenceExists(db: any, planId: string, date: string): boolean {
  const rows = queryRows<{ id: string }>(db, OCCURRENCE_EXISTS_SQL, [planId, date]);
  return rows.length > 0;
}

// ========== 写：计划 CRUD ==========

/** 创建计划（不生成实例，生成由调用方显式触发，便于同一事务或分步控制） */
export function createPlan(db: any, input: InspectionPlanInput, operator: { id?: string; name?: string }): InspectionPlanRow {
  const now = new Date().toISOString();
  const id = generateId('PLN');
  const planCode = nextPlanCode(db);
  const checklist = JSON.stringify(input.checklist || []);
  const weekdays = typeof input.weekdays === 'string'
    ? input.weekdays
    : JSON.stringify(input.weekdays || []);
  const autoSchedule = input.autoSchedule === false || input.autoSchedule === 0 ? 0 : 1;

  db.run(`
    INSERT INTO inspection_plans (
      id, plan_code, title, inspection_type,
      greenhouse_id, greenhouse_name, crop_name,
      equipment_id, equipment_name, infrastructure_id, infrastructure_name, area,
      checklist, frequency, interval_value, weekdays, day_of_month,
      start_date, end_date, window_days, default_time, duration_hours,
      assignee_id, assignee_name, team_id, team_name,
      auto_schedule, shift_code, pause_ranges, status,
      created_by, created_by_name, create_time, update_time, tenant_id, version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, 1, 1)
  `, [
    id, planCode, String(input.title || '').trim(), input.inspectionType || 'farm',
    input.greenhouseId || null, input.greenhouseName || null, input.cropName || null,
    input.equipmentId || null, input.equipmentName || null,
    input.infrastructureId || null, input.infrastructureName || null, input.area || null,
    checklist, input.frequency || 'weekly', Number(input.intervalValue ?? 1), weekdays,
    input.dayOfMonth ?? null,
    input.startDate, input.endDate || null, Number(input.windowDays ?? 14),
    input.defaultTime || '09:00', Number(input.durationHours ?? 1),
    input.assigneeId || null, input.assigneeName || null,
    input.teamId || null, input.teamName || null,
    autoSchedule, input.shiftCode || null,
    // pause_ranges 在 VALUES 里写字面量 '[]'（新建计划没有暂停区间），
    //   所以这里**不传值**——列 29 由 '[]' 占位，数组从 status 开始接。
    input.status || 'active',
    operator.id || '', operator.name || '系统', now, now,
  ]);

  return getPlanById(db, id)!;
}

/** 计划可更新列（不含 id / plan_code / status 生命周期字段） */
const PLAN_UPDATABLE_COLUMNS: Record<string, string> = {
  title: 'title',
  inspectionType: 'inspection_type',
  greenhouseId: 'greenhouse_id', greenhouseName: 'greenhouse_name', cropName: 'crop_name',
  equipmentId: 'equipment_id', equipmentName: 'equipment_name',
  infrastructureId: 'infrastructure_id', infrastructureName: 'infrastructure_name',
  area: 'area',
  checklist: 'checklist',
  frequency: 'frequency', intervalValue: 'interval_value', weekdays: 'weekdays',
  dayOfMonth: 'day_of_month',
  startDate: 'start_date', endDate: 'end_date', windowDays: 'window_days',
  defaultTime: 'default_time', durationHours: 'duration_hours',
  assigneeId: 'assignee_id', assigneeName: 'assignee_name',
  teamId: 'team_id', teamName: 'team_name',
  autoSchedule: 'auto_schedule', shiftCode: 'shift_code',
  pauseRanges: 'pause_ranges', status: 'status',
};

/**
 * 更新计划（只更新传入的字段）。
 * 返回被丢弃的字段名数组 —— 调用方应据此告警（白名单职责是防注入，不是静默丢字段）。
 */
export function updatePlan(db: any, id: string, input: Partial<InspectionPlanInput>, pauseRanges?: string): { dropped: string[] } {
  const sets: string[] = [];
  const values: any[] = [];
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const col = PLAN_UPDATABLE_COLUMNS[key];
    // 2026-10-22（审核 L11）：status 不走通用字段更新。
    //   生命周期（active/paused/archived）由 PUT 的专用分支与 DELETE 处理，
    //   放进白名单会让 `PUT {status:'archived'}` 绕过「归档要取消未来实例」的副作用。
    if (key === 'status') { dropped.push(key); continue; }
    if (!col) { dropped.push(key); continue; }

    // 先算出要写的值，算不出合法值就整列跳过（不能先 push set 再 continue，否则
    // sets 与 values 错位 → SQL 绑定参数个数不匹配）
    let normalized: any;
    if (key === 'checklist' || key === 'weekdays') {
      normalized = typeof value === 'string' ? value : JSON.stringify(value || []);
    } else if (key === 'autoSchedule') {
      normalized = value === false || value === 0 ? 0 : 1;
    } else if (key === 'windowDays' || key === 'intervalValue' || key === 'durationHours') {
      // 2026-10-22（审核 L10）：Number(null)=0 会把「清空输入」写成 0。
      //   windowDays=0 会被 generate 钳到 1 天、durationHours=0 会生成零时长任务 ——
      //   语义上应是「不修改」，而不是「改成 0」。
      if (value === null || value === '') continue;
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) { dropped.push(key); continue; }
      normalized = n;
    } else {
      normalized = value as any;
    }

    sets.push(`${col} = ?`);
    values.push(normalized);
  }

  if (sets.length === 0) return { dropped };

  sets.push('update_time = ?', 'version = COALESCE(version, 1) + 1');
  values.push(new Date().toISOString(), id);
  db.run(`UPDATE inspection_plans SET ${sets.join(', ')} WHERE id = ?`, values);
  if (pauseRanges !== undefined) {
    db.run('UPDATE inspection_plans SET pause_ranges = ? WHERE id = ?', [pauseRanges, id]);
  }
  return { dropped };
}

/**
 * 归档（软删除）：状态置 archived，不物理删除（方案 §7.5）
 *
 * 2026-10-22（审核 M4）：归档必须同时取消**未来 pending 实例**。
 *   原先只改计划状态 —— 归档后未来 14 天的实例仍是 pending、仍出现在「我的任务」、
 *   仍要求执行人提交记录，而统计又把归档计划排除，形成「要求执行但不计入」的矛盾。
 *   与 pause 同款处理：写原因、不物理删，历史台账保留。
 */
export function archivePlan(db: any, id: string): { cancelledTasks: string[] } {
  const now = new Date().toISOString();
  const today = formatLocalDateISO();
  const result = { cancelledTasks: [] as string[] };

  runInTransaction(db, () => {
    const targets = queryRows<{ id: string }>(
      db,
      `SELECT id FROM farm_tasks
       WHERE inspection_plan_id = ? AND inspection_plan_id <> ''
         AND status IN ('pending', 'accepted') AND plan_occurrence_date >= ?`,
      [id, today]
    );
    if (targets.length > 0) {
      const ids = targets.map((t) => t.id);
      result.cancelledTasks = ids;
      const ph = ids.map(() => '?').join(',');
      db.run(
        `UPDATE farm_tasks SET status = 'cancelled', cancelled_at = ?, cancelled_by = '巡查计划',
                cancelled_reason = '计划已归档', update_time = ?
         WHERE id IN (${ph})`,
        [now, now, ...ids]
      );
      db.run(
        `UPDATE farm_task_schedules SET status = 'cancelled', updated_at = ?
         WHERE task_id IN (${ph}) AND status <> 'cancelled'`,
        [now, ...ids]
      );
    }
    db.run(
      "UPDATE inspection_plans SET status = 'archived', update_time = ? WHERE id = ?",
      [now, id]
    );
  });

  return result;
}

export interface PauseResult {
  /** 被取消的未来实例任务 id */
  cancelledTasks: string[];
  /** 被取消的排班数 */
  cancelledSchedules: number;
}

/**
 * 暂停计划（方案 §7.5）
 *
 * 规则：
 *   · 只取消「今天及以后 + status=pending」的实例 —— 历史实例与已执行实例保留为台账，
 *     否则「计划暂停」会把上个月的执行记录也抹掉，统计无从追溯。
 *   · 对应排班置 cancelled（不物理删，避免换班申请的外键悬空）。
 *   · pause_ranges 追加 {from: today, to: ''}，统计口径据此排除暂停区间。
 *
 * 关键：cancelled 状态被唯一索引的 WHERE 条件排除，所以恢复时同一天可以重新生成。
 */
export function pausePlan(db: any, plan: InspectionPlanRow, reason: string): PauseResult {
  const today = formatLocalDateISO();
  const now = new Date().toISOString();
  const result: PauseResult = { cancelledTasks: [], cancelledSchedules: 0 };

  runInTransaction(db, () => {
    const targets = queryRows<{ id: string }>(
      db,
      `SELECT id FROM farm_tasks
       WHERE inspection_plan_id = ? AND inspection_plan_id <> ''
         AND status = 'pending' AND plan_occurrence_date >= ?`,
      [plan.id, today]
    );
    for (const t of targets) result.cancelledTasks.push(t.id);

    if (targets.length > 0) {
      const ids = targets.map((t) => t.id);
      const ph = ids.map(() => '?').join(',');
      db.run(
        `UPDATE farm_tasks
         SET status = 'cancelled', cancelled_at = ?, cancelled_by = ?, cancelled_reason = ?, update_time = ?
         WHERE id IN (${ph})`,
        [now, '巡查计划', reason || '计划暂停', now, ...ids]
      );
      db.run(
        `UPDATE farm_task_schedules SET status = 'cancelled', updated_at = ?
         WHERE task_id IN (${ph}) AND status <> 'cancelled'`,
        [now, ...ids]
      );
      result.cancelledSchedules = queryRows<{ c: number }>(
        db,
        `SELECT COUNT(*) AS c FROM farm_task_schedules WHERE task_id IN (${ph}) AND status = 'cancelled'`,
        ids
      )[0]?.c ?? 0;
    }

    // 追加暂停区间（to 留空 = 至今仍未恢复，恢复时补齐）
    const ranges = safeParseArray(plan.pause_ranges);
    ranges.push({ from: today, to: '' });
    db.run(
      `UPDATE inspection_plans SET status = 'paused', pause_ranges = ?, update_time = ?, version = COALESCE(version,1)+1 WHERE id = ?`,
      [JSON.stringify(ranges), now, plan.id]
    );
  });

  return result;
}

/**
 * 恢复计划（方案 §7.5）
 * 只改状态并把 open 的暂停区间收口；缺失日期由调用方再跑一次生成补齐
 * （历史 cancelled 行保留为台账，不复活）。
 */
export function resumePlan(db: any, plan: InspectionPlanRow): void {
  const now = new Date().toISOString();
  // 2026-10-22（审核 M6）：暂停区间的 to 必须用**本地日期**。
  //   now.substring(0,10) 取的是 UTC 日期，中国时区 00:00-07:59 恢复会写成「昨天」，
  //   于是 pause_ranges 出现 {from:'2026-10-22', to:'2026-10-21'} 这种倒挂区间，
  //   isDatePaused 的日期比较会把整段判成未暂停。同文件其它地方都用 formatLocalDateISO。
  const today = formatLocalDateISO();
  const ranges = safeParseArray(plan.pause_ranges);
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i];
    // 收口时保证 to >= from，避免历史脏区间继续倒挂
    if (r && !r.to) ranges[i] = { ...r, to: r.from && r.from > today ? r.from : today };
  }
  db.run(
    `UPDATE inspection_plans SET status = 'active', pause_ranges = ?, update_time = ?, version = COALESCE(version,1)+1 WHERE id = ?`,
    [JSON.stringify(ranges), now, plan.id]
  );
}

/** 重排同步结果 */
export interface ResyncResult {
  /** 已更新的实例任务 id */
  updated: string[];
  /** 因新执行人同日冲突而保留旧排班的实例（不静默删除，列出给用户） */
  conflicts: Array<{ taskId: string; date: string; reason: string }>;
  /** 日期不再命中新频率、被取消的实例 */
  cancelled: string[];
  /** 新频率多出来的日期（交由调用方再跑一次生成） */
  toGenerate: string[];
}

/**
 * 编辑计划后同步未来实例（方案 §7.5「编辑」）
 *
 * 只动「今天及以后 + status=pending + 无巡查记录」的实例：
 *   · 已执行 / 已提交记录 / 已取消的实例**永不改动** —— 台账不能被后续编辑追溯性地改写。
 *   · 新日期不再命中频率 → status='cancelled'（写原因，不物理删除）
 *   · 执行人/时间变化 → 更新任务并重排；冲突则**保留旧排班并记录**（不静默删）
 *   · 新频率多出的日期不在本函数生成（跨进程抢唯一索引不安全），由调用方再跑一次生成
 */
export async function resyncFutureOccurrences(
  db: any,
  plan: InspectionPlanRow,
  next: Partial<InspectionPlanInput>,
  rangeFrom?: string,
  rangeTo?: string
): Promise<ResyncResult> {
  const result: ResyncResult = { updated: [], conflicts: [], cancelled: [], toGenerate: [] };
  const today = formatLocalDateISO();
  const from = rangeFrom || (String(plan.start_date) > today ? String(plan.start_date) : today);

  const freqInput = {
    start_date: next.startDate ?? plan.start_date,
    end_date: next.endDate !== undefined ? next.endDate : plan.end_date,
    frequency: next.frequency ?? plan.frequency,
    interval_value: next.intervalValue ?? plan.interval_value,
    weekdays: next.weekdays ?? plan.weekdays,
    day_of_month: next.dayOfMonth ?? plan.day_of_month,
  };
  // 窗口终点与生成口径保持一致
  const windowDays = Math.min(Math.max(Number(next.windowDays ?? plan.window_days ?? 14), 1), MAX_WINDOW_DAYS);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + windowDays);
  // 2026-10-22（审核 M3）：终点不能只用窗口末端。
  //   若用户此前用「生成排期」造了 90 天实例，再随便编辑一次计划（默认窗口 14 天），
  //   第 15–90 天那些**仍符合频率**的 pending 实例会被判成「不再命中」而批量取消。
  //   因此扫描终点取 max(窗口末端, 现有实例最远执行日)，保证只取消真正不命中新频率的日期。
  const existingMaxRow = queryRows<{ d: string }>(
    db,
    `SELECT MAX(plan_occurrence_date) AS d FROM farm_tasks
     WHERE inspection_plan_id = ? AND inspection_plan_id <> ''
       AND status <> 'cancelled'`,
    [plan.id]
  )[0];
  const existingMax = String(existingMaxRow?.d || '');
  const to = rangeTo || (existingMax > formatLocalDate(endDate) ? existingMax : formatLocalDate(endDate));

  const expectedDates = new Set(computeOccurrences(freqInput, from, to));
  const newAssigneeId = next.assigneeId ?? plan.assignee_id ?? '';
  const newAssigneeName = next.assigneeName ?? plan.assignee_name ?? '';
  const newDefaultTime = next.defaultTime ?? plan.default_time ?? '09:00';
  const newDuration = Number(next.durationHours ?? plan.duration_hours ?? 1);
  const endTime = addHoursToTime(String(newDefaultTime), newDuration);
  const now = new Date().toISOString();

  // 2026-10-22（审核 H3）：排班表的 worker_id 是 employees.id，
  //   而计划表单把 assigneeId 填成了**姓名**。必须在事务外先归一化
  //   （resolveEmployeeId 是异步的，事务体是同步的，不能放进去）。
  const resolvedAssignee = newAssigneeId || newAssigneeName
    ? await resolveEmployeeId(newAssigneeId, newAssigneeName)
    : null;

  runInTransaction(db, () => {
    // 待同步的实例：未来 + pending + 无巡查记录
    const rows = queryRows<{ id: string; plan_occurrence_date: string }>(
      db,
      `SELECT f.id AS id, f.plan_occurrence_date AS plan_occurrence_date
       FROM farm_tasks f
       LEFT JOIN inspections i ON i.inspection_task_id = f.id
       WHERE f.inspection_plan_id = ? AND f.inspection_plan_id <> ''
         AND f.status = 'pending' AND f.plan_occurrence_date >= ?
         AND i.id IS NULL`,
      [plan.id, today]
    );

    for (const row of rows) {
      if (!expectedDates.has(row.plan_occurrence_date)) {
        db.run(
          `UPDATE farm_tasks SET status = 'cancelled', cancelled_at = ?, cancelled_by = '巡查计划',
                  cancelled_reason = '计划编辑后该日期不再命中频率', update_time = ? WHERE id = ?`,
          [now, now, row.id]
        );
        db.run(
          `UPDATE farm_task_schedules SET status = 'cancelled', updated_at = ?
           WHERE task_id = ? AND status <> 'cancelled'`,
          [now, row.id]
        );
        result.cancelled.push(row.id);
        continue;
      }

      // 命中频率：更新任务快照
      // 2026-10-22（审核 P3-4）：标题/描述也一起更新 ——
      //   生成时 task_title = `【巡查】${plan.title}`，若改名后不更新，
      //   未来实例会一直显示旧计划名，执行人看到的和计划列表对不上。
      db.run(
        `UPDATE farm_tasks
         SET task_title = ?, task_content = ?,
             assignee_id = ?, assignee_name = ?, plan_time = ?, plan_end = ?,
             estimated_hours = ?, update_time = ?
         WHERE id = ?`,
        [
          `【巡查】${next.title ?? plan.title}`,
          next.title ?? plan.title,
          newAssigneeId, newAssigneeName, newDefaultTime,
          `${row.plan_occurrence_date} ${endTime}`, newDuration, now, row.id,
        ]
      );
      result.updated.push(row.id);

      // 排班同步：执行人变了就重排；冲突保留旧排班并记录
      if (newAssigneeId) {
        if (!resolvedAssignee) {
          result.conflicts.push({
            taskId: row.id,
            date: row.plan_occurrence_date,
            reason: `执行人「${newAssigneeName || newAssigneeId}」不在员工档案中，保留原排班未改动`,
          });
          continue;
        }
        const own = queryRows<{ id: string; worker_id: string }>(
          db,
          `SELECT id, worker_id FROM farm_task_schedules WHERE task_id = ? AND status <> 'cancelled' LIMIT 1`,
          [row.id]
        )[0];
        if (own && own.worker_id !== resolvedAssignee.id) {
          // 同日该员工是否还有别的排班
          const conflict = queryRows<{ c: number }>(
            db,
            `SELECT COUNT(*) AS c FROM farm_task_schedules
             WHERE worker_id = ? AND plan_date = ? AND status <> 'cancelled' AND id <> ?`,
            [resolvedAssignee.id, row.plan_occurrence_date, own.id]
          )[0]?.c ?? 0;
          if (conflict > 0) {
            result.conflicts.push({
              taskId: row.id,
              date: row.plan_occurrence_date,
              reason: '新执行人在同日已有其它排班，保留原排班未改动',
            });
          } else {
            db.run(
              `UPDATE farm_task_schedules SET worker_id = ?, worker_name = ?, updated_at = ?
               WHERE id = ?`,
              [resolvedAssignee.id, resolvedAssignee.name, now, own.id]
            );
          }
        }
      }
    }

    // 新频率多出来的日期：交由调用方生成
    const existing = new Set(rows.map((r) => r.plan_occurrence_date));
    for (const d of computeOccurrences(freqInput, from, to)) {
      if (!existing.has(d)) result.toGenerate.push(d);
    }
  });

  return result;
}

// ========== 实例生成 ==========

/**
 * 生成计划实例任务。
 *
 * @param db 数据库句柄
 * @param plan 计划行
 * @param rangeFrom 区间起（含）；默认 = max(today, plan.start_date)
 * @param rangeTo 区间止（含）；默认 = min(today+window_days, plan.end_date || 无限期)
 *
 * 幂等：已存在的日期跳过（不重复生成）。
 * 并发：唯一索引冲突 catch 为跳过，不 500。
 */
export async function generateOccurrences(
  db: any,
  plan: InspectionPlanRow,
  rangeFrom?: string,
  rangeTo?: string
): Promise<GenerateResult> {
  const result: GenerateResult = {
    planId: plan.id,
    created: [],
    skipped: [],
    scheduled: 0,
    unscheduledReasons: {},
  };

  if (plan.status !== 'active') {
    result.blockedReason = `计划状态为 ${plan.status}，不生成实例`;
    return result;
  }

  const today = formatLocalDateISO();
  const windowDays = Math.min(Math.max(Number(plan.window_days ?? 14), 1), MAX_WINDOW_DAYS);

  // 默认区间：max(today, start_date) ~ today+window_days（不补历史，方案 §7.6）
  const from = rangeFrom || (String(plan.start_date) > today ? String(plan.start_date) : today);
  let to = rangeTo;
  if (!to) {
    const end = new Date();
    end.setDate(end.getDate() + windowDays);
    to = formatLocalDate(end);
  }
  // end_date 为空 = 无限期，此时 to 就是窗口末端；end_date 非空则由 computeOccurrences 内部截断

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
    to
  );

  if (dates.length === 0) return result;

  const checklistSnapshot = plan.checklist || '[]';
  const defaultTime = String(plan.default_time || '09:00');
  const durationHours = Number(plan.duration_hours ?? 1);
  const ymd = formatLocalDateYYYYMMDD(parseLocalDate(dates[0]) || new Date());
  const now = new Date().toISOString();

  runInTransaction(db, () => {
    let taskCode = '';
    for (const date of dates) {
      if (occurrenceExists(db, plan.id, date)) {
        result.skipped.push(date);
        continue;
      }
      // 编号按实例日期取当日序号：跨月时重新取号，避免同一个 ymd 编到底
      const dateYmd = formatLocalDateYYYYMMDD(parseLocalDate(date) || new Date());
      if (!taskCode || dateYmd !== ymd) taskCode = nextTaskCode(db, dateYmd);

      const endTime = addHoursToTime(defaultTime, durationHours);
      const title = `【巡查】${plan.title}`;

      try {
        db.run(`
          INSERT INTO farm_tasks (
            id, task_code, task_title, task_type, type_name, task_content, description,
            assignee_id, assignee_name, assigner_id, assigner_name,
            greenhouse_id, greenhouse_name, area_name, crop,
            plan_date, plan_time, plan_end, due_date,
            priority, status, progress, estimated_hours, estimated_days,
            type_config, source_type, dispatch_mode, source_id, source_code,
            inspection_plan_id, plan_occurrence_date,
            version, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', 'pending', 0, ?, 1, ?, 'inspection_plan', 'farm', ?, ?, ?, ?, 1, ?, ?)
        `, [
          taskCode, taskCode, title, INSPECTION_TASK_TYPE, INSPECTION_TASK_TYPE_NAME,
          plan.title, buildDescription(plan),
          plan.assignee_id || '', plan.assignee_name || '',
          plan.created_by || '', plan.created_by_name || '巡查计划',
          plan.greenhouse_id || '', plan.greenhouse_name || '', plan.area || null, plan.crop_name || '',
          date, defaultTime, `${date} ${endTime}`, date,
          durationHours,
          // 计划快照：设备/设施台账后续可能变，任务上留一份当时的检查项与巡查对象。
          // 2026-10-22（审核 P1-3/P1-4）：farm_tasks 没有 equipment_* 列，
          //   若不在这里快照，「巡检哪台设备」在任务侧完全丢失 ——
          //   执行人在「我的任务」看不到对象，记录里的 equipmentName 也只能是空。
          JSON.stringify({
            planId: plan.id,
            planCode: plan.plan_code,
            planName: plan.title,
            checklist: safeParseArray(checklistSnapshot),
            inspectionTarget: {
              equipmentId: plan.equipment_id || '',
              equipmentName: plan.equipment_name || '',
              infrastructureId: plan.infrastructure_id || '',
              infrastructureName: plan.infrastructure_name || '',
              area: plan.area || '',
            },
          }),
          plan.id, plan.plan_code,
          plan.id, date,
          now, now,
        ]);
      } catch (err: any) {
        // 并发生成撞唯一索引 → 跳过，不 500（方案 §7.4）
        const msg = String(err?.message || '');
        if (msg.includes('UNIQUE') && msg.includes('plan_occurrence_date')) {
          result.skipped.push(date);
          continue;
        }
        throw err;
      }
      result.created.push(date);
    }
  });

  // 自动排班放在事务外：autoAssignSchedule 自己带 saveDatabase + 冲突检查，
  // 混进生成事务会形成长事务 + 嵌套落盘。
  if (plan.auto_schedule !== 0) {
    for (const date of result.created) {
      // 2026-10-22（审核 H4）：必须排除 cancelled。
      //   暂停→恢复（或重新生成已取消的日期）后，同一天会同时存在
      //   「旧 cancelled 行 + 新 pending 行」；原查询无 status 过滤，
      //   LIMIT 1 大概率取到较早的 cancelled 行 → 排班挂到已取消任务上，
      //   新任务永远排不上，返回值却计入 scheduled++。
      const rows = queryRows<{ id: string }>(
        db,
        `SELECT id FROM farm_tasks
         WHERE inspection_plan_id = ? AND plan_occurrence_date = ?
           AND status <> 'cancelled'
         ORDER BY rowid DESC LIMIT 1`,
        [plan.id, date]
      );
      const taskId = rows[0]?.id;
      if (!taskId) continue;
      try {
        const assign = await autoAssignSchedule({
          taskId,
          workerId: plan.assignee_id || '',
          workerName: plan.assignee_name || '',
          teamId: plan.team_id || null,
          teamName: plan.team_name || null,
          planDate: date,
          shiftType: plan.shift_code || null,
        });
        if (assign.created || assign.updated) {
          result.scheduled++;
        } else if (assign.reason) {
          result.unscheduledReasons[date] = assign.reason;
        }
      } catch (err: any) {
        result.unscheduledReasons[date] = `自动排班失败：${err?.message || err}`;
      }
    }
  }

  return result;
}

/** 生成窗口补齐：对全部 active 计划各跑一次窗口生成（启动 / cron 用） */
export async function backfillAllPlans(db: any): Promise<{ plans: number; created: number; failed: number }> {
  const plans = listActivePlans(db);
  let created = 0;
  let failed = 0;
  for (const plan of plans) {
    try {
      const r = await generateOccurrences(db, plan);
      created += r.created.length;
    } catch (err: any) {
      failed++;
      console.error(`[inspectionPlan] 计划 ${plan.plan_code} 窗口补齐失败:`, err?.message || err);
    }
  }
  return { plans: plans.length, created, failed };
}

// ========== 辅助 ==========

/** 'HH:mm' + N 小时 → 'HH:mm'（跨天只保留时刻，跨天由 plan_end 的日期部分表达） */
function addHoursToTime(time: string, hours: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim());
  if (!m) return time;
  const total = (Number(m[1]) * 60 + Number(m[2]) + Math.round(hours * 60)) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** 任务描述：计划名 + 检查项摘要 */
function buildDescription(plan: InspectionPlanRow): string {
  const items = safeParseArray(plan.checklist)
    .map((c: any) => (typeof c === 'string' ? c : c?.label))
    .filter(Boolean);
  const lines = [`来源巡查计划：${plan.title}（${plan.plan_code}）`, `计划编号：${plan.plan_code}`];
  if (items.length > 0) lines.push(`检查项：${items.join('、')}`);
  if (plan.area) lines.push(`检查区域：${plan.area}`);
  return lines.join('\n');
}

function safeParseArray(raw: string | null | undefined): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}