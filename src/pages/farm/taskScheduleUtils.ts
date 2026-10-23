/**
 * 任务排班辅助函数
 *
 * 2026-10-23：新增排班弹窗需从待排班任务「派工执行人」带出执行人。
 *   注意：农事任务的 assignee_id 是姓名哈希 ID，与工人表 worker.id 不是同一套 ID，
 *   无法直接回填，只能按姓名匹配工人表；匹配不到就留空由用户手工选。
 */

/** 待排班任务的最小结构（只要 id 与派工执行人姓名） */
export interface TaskScheduleTask {
  id: string;
  assigneeName?: string;
}

/** 工人表的最小结构 */
export interface TaskScheduleWorker {
  id: string;
  name: string;
}

/**
 * 按派工执行人姓名匹配工人表，返回工人 id
 * @param tasks 待排班任务列表
 * @param workers 工人列表
 * @param taskId 目标任务 id
 * @returns 匹配到的工人 id；未匹配到返回空串
 */
export function resolveWorkerIdByAssignee(
  tasks: TaskScheduleTask[],
  workers: TaskScheduleWorker[],
  taskId: string,
): string {
  if (!taskId) return '';
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.assigneeName) return '';
  return workers.find((w) => w.name === task.assigneeName)?.id || '';
}

/**
 * 判断班次是否跨天（结束时间早于开始时间 → 结束在次日）
 *
 * 背景：班次字典里的晚班是 22:00-06:00（跨午夜）。起止时间在库里存的是纯 'HH:MM'
 * 字符串（后端 plan_start/plan_end 不做日期换算，考勤排班的晚班同样存 22:00 / 06:00），
 * 因此「结束 < 开始」不是错误，而是跨天班次的正常表达。
 *
 * @param start 开始时间 'HH:MM'
 * @param end 结束时间 'HH:MM'
 * @returns true 表示跨天（结束时间为次日）
 */
export function isCrossDayShift(start: string, end: string): boolean {
  if (!start || !end) return false;
  return end < start;
}

/**
 * 校验排班起止时间是否合法
 *
 * 跨天班次（结束早于开始）合法；只有「起止完全相同」（零时长）才非法。
 *
 * @param start 开始时间 'HH:MM'
 * @param end 结束时间 'HH:MM'
 */
export function isValidScheduleTimeRange(start: string, end: string): boolean {
  if (!start || !end) return false;
  return start !== end;
}

/**
 * 格式化结束时间展示：跨天班次加「次日」前缀（如 22:00 ~ 次日 06:00）
 */
export function formatEndTimeLabel(end: string, start: string): string {
  if (!end) return '—';
  return isCrossDayShift(start, end) ? `次日 ${end}` : end;
}
