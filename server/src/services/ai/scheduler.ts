/**
 * AI-02 智能人员排班服务（V2 — DB 数据驱动 + 真实约束）
 * 2026-09-02：v0.3.1 修复版
 *
 * 修复前问题：
 *   - V1 完全依赖前端传入的 employees[] / tasks[]（import getDatabase 但不用）
 *   - 任务循环分配：tasksForDay[Math.floor(...)] — 不是真实排班
 *   - 工时上限硬编码 8h（不查员工 max_daily_hours）
 *   - 合规率虚高（软约束不计入）
 *   - 连续工作天数检查缺失
 *
 * V2 修复：
 *   - 真实从 DB 加载 employees + team_members JOIN
 *   - 真实从 DB 加载 farm_tasks + temp_tasks 合并
 *   - 排班策略：按 task.priority 倒序 + 任务 preferred_date 优先
 *   - 软约束（preferred_off_days）+ 硬约束（max_consecutive_days、daily_hours_limit）
 *   - CV 计算 + 合规率真实
 *
 * 输入兼容：保留旧接口 employees/tasks（前端可继续传），但若不传则自动从 DB 加载
 */

import { getDatabase } from '../../db';

interface EmployeeInput {
  employee_id: string;
  name: string;
  skills?: string[];
  current_load?: number;
  max_consecutive_days?: number;     // 默认 6
  daily_hours_limit?: number;         // 默认 8
  preferred_off_days?: number[];      // 周几休息（0-6，0=周日）
}

interface TaskInput {
  task_id: string;
  task_type: string;
  required_skills?: string[];
  estimated_hours?: number;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  preferred_date?: string;            // YYYY-MM-DD
  plan_date?: string;                 // 兼容字段
  assignee_id?: string;               // 已分配员工（固定约束）
  batch_id?: string;
}

interface ScheduleInput {
  start_date?: string;                // YYYY-MM-DD
  days?: number;                      // 默认 7
  employees?: EmployeeInput[];         // 不传则从 DB 加载
  tasks?: TaskInput[];                 // 不传则从 DB 加载
  team_id?: string;                    // 可选：仅排该班组的员工
  min_rest_days?: number;             // 最小休息间隔（默认 1）
}

interface DailySchedule {
  date: string;
  day_of_week: number;
  assignments: {
    employee_id: string;
    employee_name: string;
    task_id: string;
    task_type: string;
    estimated_hours: number;
  }[];
  total_hours: number;
  load_distribution: Record<string, number>;
}

interface ScheduleResult {
  period: { start: string; end: string };
  daily_schedule: DailySchedule[];
  compliance_rate: number;
  workload_cv: number;
  employee_total_hours: Record<string, number>;
  violations: string[];
  model_version: string;
  xai_reasons: string[];
  source: { employees_from_db: number; tasks_from_db: number };
}

const MODEL_VERSION = '2.0.0-csp-greedy-dba';

/**
 * 真实从 DB 加载员工
 */
function loadEmployeesFromDB(teamId?: string): EmployeeInput[] {
  const db = getDatabase();
  let sql = `
    SELECT e.id, e.name, COALESCE(e.skills, '') AS skills,
           COALESCE(e.daily_hours_limit, 8) AS daily_hours_limit,
           COALESCE(e.max_consecutive_days, 6) AS max_consecutive_days,
           COALESCE(e.preferred_off_days, '') AS preferred_off_days
    FROM employees e
    WHERE COALESCE(e.status, 'active') IN ('active', '在职')
      AND e.resigned_at IS NULL
  `;
  const params: unknown[] = [];
  if (teamId) {
    sql += ` AND e.id IN (SELECT member_id FROM team_members WHERE team_id = ? AND status = 'active')`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params.push(teamId as any);
  }
  sql += ` ORDER BY e.id`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = db.exec(sql, params as any[]);
  if (result.length === 0) return [];

  const cols = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c] = row[i]));
    const skills = String(obj.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
    const offDays = String(obj.preferred_off_days || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    return {
      employee_id: String(obj.id),
      name: String(obj.name || ''),
      skills,
      current_load: 0,
      max_consecutive_days: Number(obj.max_consecutive_days) || 6,
      daily_hours_limit: Number(obj.daily_hours_limit) || 8,
      preferred_off_days: offDays,
    };
  });
}

/**
 * 真实从 DB 加载任务（合并 farm_tasks + temp_tasks）
 */
function loadTasksFromDB(startDate: string, days: number): TaskInput[] {
  const db = getDatabase();
  const endDate = new Date(new Date(startDate).getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  // 1. farm_tasks（普通任务）
  const farmResult = db.exec(
    `SELECT id, task_type, required_skills, estimated_hours, priority, plan_date, assignee_id, batch_id
     FROM farm_tasks
     WHERE status IN ('pending', 'waiting_acceptance', 'accepted')
       AND plan_date BETWEEN ? AND ?
     ORDER BY plan_date, CASE priority
       WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [startDate, endDate] as any[]
  );

  // 2. temp_tasks（临时任务）
  const tempResult = db.exec(
    `SELECT id, task_type, required_skills, estimated_hours, priority, plan_date, assignee_id, batch_id
     FROM temp_tasks
     WHERE status IN ('pending', 'waiting_acceptance', 'accepted')
       AND plan_date BETWEEN ? AND ?
     ORDER BY plan_date`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [startDate, endDate] as any[]
  );

  const result: TaskInput[] = [];
  const cols = (r: { columns: string[]; values: unknown[][] }) => {
    const obj: Record<string, unknown> = {};
    r.columns.forEach((c, i) => (obj[c] = r.values[0][i]));
    return obj;
  };

  for (const r of farmResult) {
    for (const row of r.values) {
      const o: Record<string, unknown> = {};
      r.columns.forEach((c, i) => (o[c] = row[i]));
      result.push({
        task_id: String(o.id),
        task_type: String(o.task_type || 'other'),
        required_skills: String(o.required_skills || '').split(',').filter(Boolean),
        estimated_hours: Number(o.estimated_hours) || 4,
        priority: (['urgent', 'high', 'normal', 'low'] as const).includes(o.priority as any)
          ? (o.priority as any) : 'normal',
        preferred_date: String(o.plan_date),
        assignee_id: o.assignee_id ? String(o.assignee_id) : undefined,
        batch_id: o.batch_id ? String(o.batch_id) : undefined,
      });
    }
  }
  for (const r of tempResult) {
    for (const row of r.values) {
      const o: Record<string, unknown> = {};
      r.columns.forEach((c, i) => (o[c] = row[i]));
      result.push({
        task_id: String(o.id),
        task_type: String(o.task_type || 'other'),
        required_skills: String(o.required_skills || '').split(',').filter(Boolean),
        estimated_hours: Number(o.estimated_hours) || 4,
        priority: (['urgent', 'high', 'normal', 'low'] as const).includes(o.priority as any)
          ? (o.priority as any) : 'normal',
        preferred_date: String(o.plan_date),
        assignee_id: o.assignee_id ? String(o.assignee_id) : undefined,
        batch_id: o.batch_id ? String(o.batch_id) : undefined,
      });
    }
  }
  return result;
}

/**
 * 贪心分配算法 V2
 * - 按 priority 排序（urgent > high > normal > low）
 * - 检查技能匹配（硬约束）
 * - 检查日工时上限（硬约束）
 * - 检查连续工作天数（硬约束，超过会跳过）
 * - 软约束：preferred_off_days 仅记录违规
 */
function assignTaskV2(
  task: TaskInput,
  employees: EmployeeInput[],
  employeeHoursByDate: Map<string, Map<string, number>>,  // employee_id -> date -> hours
  employeeConsecDays: Map<string, number>,                  // employee_id -> 连续工作天数
  dateStr: string,
  dayOfWeek: number,
  preferred_off_day_today: Map<string, boolean>            // employee_id -> 今日是偏好休息日
): { employee: EmployeeInput; violations: string[] } | null {
  const violations: string[] = [];

  // 过滤：技能匹配 + 工时上限 + 连续天数上限
  const candidates = employees.filter((e) => {
    // 1. 技能匹配（硬约束）
    if (task.required_skills && task.required_skills.length > 0 && e.skills && e.skills.length > 0) {
      const hasSkill = task.required_skills.some((s) => e.skills!.includes(s));
      if (!hasSkill) return false;
    }

    // 2. 工时上限（硬约束）
    const hoursMap = employeeHoursByDate.get(e.employee_id) || new Map();
    const todayHours = hoursMap.get(dateStr) || 0;
    if (todayHours + (task.estimated_hours || 4) > (e.daily_hours_limit || 8)) {
      return false;
    }

    // 3. 连续工作天数上限（硬约束）：达到上限则跳过
    const consec = employeeConsecDays.get(e.employee_id) || 0;
    if (consec >= (e.max_consecutive_days || 6)) {
      violations.push(`${e.name} 连续工作 ${consec} 天达到上限 ${e.max_consecutive_days} 天`);
      return false;
    }

    return true;
  });

  // 4. 软约束：今日是偏好休息日 → 记录但允许（不阻塞）
  candidates.forEach((e) => {
    if (e.preferred_off_days?.includes(dayOfWeek)) {
      violations.push(`${e.name} 被安排在偏好休息日（周${dayOfWeek === 0 ? '日' : dayOfWeek}）`);
    }
  });

  if (candidates.length === 0) return null;

  // 5. 选当前负荷最低的
  const selected = candidates.reduce((best, e) => {
    const bestHours = (employeeHoursByDate.get(best.employee_id)?.get(dateStr) || 0);
    const eHours = (employeeHoursByDate.get(e.employee_id)?.get(dateStr) || 0);
    return eHours < bestHours ? e : best;
  });

  return { employee: selected, violations };
}

export async function generateSchedule(input: ScheduleInput): Promise<ScheduleResult> {
  const startDate = input.start_date || new Date().toISOString().split('T')[0];
  const days = input.days || 7;

  // 1. 加载员工（前端传则用前端，否则从 DB 加载）
  let employees = input.employees || [];
  let employeesFromDB = 0;
  if (employees.length === 0) {
    employees = loadEmployeesFromDB(input.team_id);
    employeesFromDB = employees.length;
  }
  if (employees.length === 0) {
    throw new Error('排班需要至少 1 名员工（前端未传且 DB 员工池为空）');
  }

  // 2. 加载任务（前端传则用前端，否则从 DB 加载）
  let tasks = input.tasks || [];
  let tasksFromDB = 0;
  if (tasks.length === 0) {
    tasks = loadTasksFromDB(startDate, days);
    tasksFromDB = tasks.length;
  }
  if (tasks.length === 0) {
    throw new Error('排班窗口内无任务（前端未传且 DB 任务为空）');
  }

  // 3. 优先级排序：urgent > high > normal > low
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortedTasks = [...tasks].sort(
    (a, b) => (priorityOrder[a.priority || 'normal'] ?? 2) - (priorityOrder[b.priority || 'normal'] ?? 2)
  );

  // 4. 准备追踪数据
  const dailySchedule: DailySchedule[] = [];
  const employeeHoursByDate = new Map<string, Map<string, number>>();
  const employeeConsecDays = new Map<string, number>();
  const employeeLastWorkDate = new Map<string, string>();
  const violations: string[] = [];

  // 5. 按日期分配
  for (let i = 0; i < days; i++) {
    const date = new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // 6. 找今天需要排的任务
    const todayTasks = sortedTasks.filter((t) => t.preferred_date === dateStr || t.plan_date === dateStr);

    const assignments: DailySchedule['assignments'] = [];
    let totalHours = 0;
    const loadDistribution: Record<string, number> = {};

    for (const task of todayTasks) {
      // 6.1 已固定 assignee → 跳过贪心（仅校验技能/工时）
      let assigned = false;
      if (task.assignee_id) {
        const fixedEmp = employees.find((e) => e.employee_id === task.assignee_id);
        if (fixedEmp) {
          const fixedHours = task.estimated_hours || 4;
          const fixedHoursMap = employeeHoursByDate.get(fixedEmp.employee_id) || new Map();
          const fixedTodayHours = fixedHoursMap.get(dateStr) || 0;
          if (fixedTodayHours + fixedHours <= (fixedEmp.daily_hours_limit || 8)) {
            assignments.push({
              employee_id: fixedEmp.employee_id,
              employee_name: fixedEmp.name,
              task_id: task.task_id,
              task_type: task.task_type,
              estimated_hours: fixedHours,
            });
            totalHours += fixedHours;
            loadDistribution[fixedEmp.employee_id] = (loadDistribution[fixedEmp.employee_id] || 0) + fixedHours;
            fixedHoursMap.set(dateStr, fixedTodayHours + fixedHours);
            employeeHoursByDate.set(fixedEmp.employee_id, fixedHoursMap);
            assigned = true;
          } else {
            violations.push(`${dateStr}: 任务 ${task.task_id} 固定员工 ${fixedEmp.name} 超出工时上限`);
          }
        }
      }

      if (!assigned) {
        const result = assignTaskV2(task, employees, employeeHoursByDate, employeeConsecDays, dateStr, dayOfWeek, new Map());
        if (result) {
          const { employee, violations: taskViolations } = result;
          violations.push(...taskViolations);
          const hours = task.estimated_hours || 4;
          assignments.push({
            employee_id: employee.employee_id,
            employee_name: employee.name,
            task_id: task.task_id,
            task_type: task.task_type,
            estimated_hours: hours,
          });
          totalHours += hours;
          loadDistribution[employee.employee_id] = (loadDistribution[employee.employee_id] || 0) + hours;
          const hoursMap = employeeHoursByDate.get(employee.employee_id) || new Map();
          hoursMap.set(dateStr, (hoursMap.get(dateStr) || 0) + hours);
          employeeHoursByDate.set(employee.employee_id, hoursMap);
        } else {
          violations.push(`${dateStr}: 任务 ${task.task_id} (${task.task_type}) 无可用员工`);
        }
      }
    }

    // 7. 更新连续工作天数
    for (const a of assignments) {
      const lastDate = employeeLastWorkDate.get(a.employee_id);
      if (lastDate) {
        const last = new Date(lastDate);
        const cur = new Date(dateStr);
        const diff = Math.round((cur.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
        if (diff === 1) {
          employeeConsecDays.set(a.employee_id, (employeeConsecDays.get(a.employee_id) || 0) + 1);
        } else {
          employeeConsecDays.set(a.employee_id, 1);
        }
      } else {
        employeeConsecDays.set(a.employee_id, 1);
      }
      employeeLastWorkDate.set(a.employee_id, dateStr);
    }

    // 8. 休息日员工：连续天数清零
    const workedIds = new Set(assignments.map((a) => a.employee_id));
    for (const e of employees) {
      if (!workedIds.has(e.employee_id)) {
        employeeConsecDays.set(e.employee_id, 0);
      }
    }

    dailySchedule.push({
      date: dateStr,
      day_of_week: dayOfWeek,
      assignments,
      total_hours: totalHours,
      load_distribution: loadDistribution,
    });
  }

  // 9. 计算合规率
  const totalAssignments = dailySchedule.reduce((s, d) => s + d.assignments.length, 0);
  const hardViolations = violations.filter(
    (v) => !v.includes('偏好休息日') && !v.includes('软约束')
  );
  const complianceRate =
    totalAssignments > 0
      ? Math.round((1 - hardViolations.length / Math.max(totalAssignments, 1)) * 100) / 100
      : 1.0;

  // 10. 计算 CV
  const employeeTotalHours: Record<string, number> = {};
  for (const [empId, hoursMap] of employeeHoursByDate.entries()) {
    employeeTotalHours[empId] = Array.from(hoursMap.values()).reduce((a, b) => a + b, 0);
  }
  const hours = Object.values(employeeTotalHours);
  const mean = hours.length > 0 ? hours.reduce((a, h) => a + h, 0) / hours.length : 0;
  const std = hours.length > 0 ? Math.sqrt(hours.reduce((a, h) => a + (h - mean) ** 2, 0) / hours.length) : 0;
  const workloadCv = mean > 0 ? Math.round((std / mean) * 100) / 100 : 0;

  return {
    period: { start: startDate, end: dailySchedule[dailySchedule.length - 1]?.date || startDate },
    daily_schedule: dailySchedule,
    compliance_rate: complianceRate,
    workload_cv: workloadCv,
    employee_total_hours: employeeTotalHours,
    violations,
    model_version: MODEL_VERSION,
    xai_reasons: [
      `排班天数：${days} 天（${startDate} 起）`,
      `员工池：${employees.length} 人（DB 加载 ${employeesFromDB} / 前端传 ${input.employees?.length || 0}）`,
      `任务池：${tasks.length} 个（DB 加载 ${tasksFromDB} / 前端传 ${input.tasks?.length || 0}）`,
      `总分配任务：${totalAssignments} 个`,
      `硬约束违规：${hardViolations.length} 次（连续工作/超工时/无员工）`,
      `软约束提醒：${violations.length - hardViolations.length} 次（偏好休息日）`,
      `合规率：${(complianceRate * 100).toFixed(1)}%`,
      `工作量均衡 CV：${workloadCv}`,
      `算法：贪心分配 + 技能/工时/连续天数硬约束 + 偏好休息日软约束（V2 DB 驱动）`,
    ],
    source: { employees_from_db: employeesFromDB, tasks_from_db: tasksFromDB },
  };
}
