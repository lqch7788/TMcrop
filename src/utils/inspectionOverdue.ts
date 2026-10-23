/**
 * 巡查计划实例「逾期未执行」判定（2026-10-23）
 *
 * 为什么单独抽一个共享函数：同一个判据要在三处出现 ——
 *   1. 巡查计划详情弹窗的实例表格（行级「逾期」标记）
 *   2. 「我的任务」列表（巡查实例行的「逾期」标记）
 *   3. 汇总看板「逾期任务」下钻（按巡查/普通拆分）
 * 三处口径必须一致，否则用户会在不同页面看到矛盾的结论。
 *
 * 口径与后端一致（server/src/routes/inspectionPlan.ts:624-625）：
 *   执行日已过 + 无巡查记录 + 状态不是 cancelled / completed
 *
 * 关键：「有没有执行」的判据是 **inspections 表里有没有记录**，不是任务状态。
 *   任务提交记录后会自动 pending→accepted→waiting_acceptance（progress=100），
 *   但反过来不成立 —— 状态变了不代表有记录，所以这里只认记录 id。
 */
export interface OverdueInspectionInput {
  /** 执行日（plan_occurrence_date），优先取这个 */
  occurrenceDate?: string | null;
  /** 排班日（plan_date），occurrenceDate 缺失时兜底 */
  planDate?: string | null;
  /** 已提交的巡查记录 id（有记录 = 已执行） */
  inspectionRecordId?: string | null;
  /** 任务状态 */
  status?: string | null;
}

/**
 * 判断一条巡查实例是否「逾期未执行」
 * @param input 实例的关键字段
 * @param today 今天的本地日期 'YYYY-MM-DD'
 */
export function isOverdueInspection(input: OverdueInspectionInput, today: string): boolean {
  const { occurrenceDate, planDate, inspectionRecordId, status } = input;
  const date = (occurrenceDate || planDate || '').trim();
  if (!date) return false;
  // 已取消 / 已完成不再算逾期
  if (status === 'cancelled' || status === 'completed') return false;
  // 已提交巡查记录 = 已执行
  if (inspectionRecordId) return false;
  return date < today;
}

/** 「逾期」徽章的样式（红底白字，与系统其它逾期标记一致） */
export const OVERDUE_BADGE_CLASS = 'inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium';
