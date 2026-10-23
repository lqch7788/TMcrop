/**
 * 巡查记录前置校验（2026-10-21 P2c）
 *
 * 【为什么需要】
 * 巡查计划实例任务（source_type='inspection_plan'）的**唯一完成凭证**是巡查记录。
 * 没有这层校验，执行人可以直接把任务点成「已完成」——
 * 于是计划统计显示「已执行」，实际没人去现场巡过，1:1 对应关系形同虚设。
 *
 * 【调用点必须覆盖全部完成路径】
 * 审核结论 B1/H7/C1：完成有 4 条路径，逐条看代码很容易漏，
 * 其中 `POST /farm-tasks/:id/complete` 实际命中的是 taskProgress.ts
 * （routes/index.ts 里 taskProgressRouter 先于 farmTaskRouter 挂载，先注册先匹配）。
 * 所以 farmTask.ts 与 taskProgress.ts **两处都要加**，防止将来路由顺序调整后重新开口。
 */

/** 返回值：null 表示放行；非空为拒绝原因 */
export type GuardViolation = string | null;

/** 任务是否是需要巡查记录才能完成的计划实例任务 */
function isPlanTask(db: any, taskId: string): { planId: string } | null {
  const stmt = db.prepare(
    'SELECT inspection_plan_id FROM farm_tasks WHERE id = ? OR task_code = ? LIMIT 1'
  );
  stmt.bind([taskId, taskId]);
  let planId: string | null = null;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { inspection_plan_id?: string | null };
    if (row.inspection_plan_id) planId = row.inspection_plan_id;
  }
  stmt.free();
  return planId ? { planId } : null;
}

/** 该任务是否已有巡查记录 */
export function hasInspectionRecord(db: any, taskId: string): boolean {
  const stmt = db.prepare(
    'SELECT id FROM inspections WHERE inspection_task_id = ? AND inspection_task_id <> \'\' LIMIT 1'
  );
  stmt.bind([taskId]);
  const found = stmt.step();
  stmt.free();
  return found;
}

/**
 * 完成前的巡查记录校验。
 * @returns null = 放行；字符串 = 拒绝原因（调用方应 409）
 */
export function assertInspectionRecordBeforeComplete(db: any, taskId: string): GuardViolation {
  const plan = isPlanTask(db, taskId);
  if (!plan) return null;                       // 非计划任务：不受本规则约束
  if (hasInspectionRecord(db, taskId)) return null; // 已提交记录：放行
  return '该巡查任务尚未提交巡查记录，不能标记完成。请先在「我的任务」中提交巡查记录。';
}

/**
 * 状态推进到「终结或待验收」前的统一校验（2026-10-23）
 *
 * 【为什么需要这个包装】
 * 2026-10-22 那次修复只补了 `/progress` 一条通道，另外三条写 waiting_acceptance 的路径仍然裸奔：
 *   · PUT /farm-tasks/:id            —— 只在目标状态是 completed 时校验
 *   · PUT /farm-tasks/batch          —— 同上
 *   · POST /farm-tasks/:id/submit-acceptance —— 只有状态机守卫，没有记录守卫
 * 而 waiting_acceptance 是「死锁起点」：进去之后既不能补交记录（create 只允许
 * pending/accepted/in_progress），也不能重提（无记录），`/complete` 又被本守卫挡住。
 * 实测库里已因此产生 2 条不可恢复的记录（NS20261022-635、NS20261023-005）。
 *
 * 三条通道都调这一个函数，避免以后加通道时再漏。
 *
 * @param targetStatus 本次要写入的目标状态
 */
export function assertInspectionRecordBeforeAdvance(
  db: any,
  taskId: string,
  targetStatus: string | null | undefined,
): GuardViolation {
  if (targetStatus !== 'completed' && targetStatus !== 'waiting_acceptance') return null;
  // 复用同一判据（非计划任务放行 / 有记录放行），但文案按目标状态区分 ——
  // 目标若是待验收却提示「不能标记完成」，用户会照提示去做却仍然失败。
  if (!assertInspectionRecordBeforeComplete(db, taskId)) return null;
  return targetStatus === 'waiting_acceptance'
    ? '该巡查任务尚未提交巡查记录，不能申请验收。请先在「我的任务」中填写巡查记录。'
    : '该巡查任务尚未提交巡查记录，不能标记完成。请先在「我的任务」中提交巡查记录。';
}

/**
 * 删除前的巡查记录保护。
 * 有记录的任务被删除后，记录会变成孤儿（inspection_task_id 指向不存在的任务），
 * 计划执行率也会凭空变化。
 */
export function assertTaskDeletable(db: any, taskId: string): GuardViolation {
  if (!hasInspectionRecord(db, taskId)) return null;
  return '该任务已关联巡查记录，不可删除。如需取消请使用「取消任务」。';
}