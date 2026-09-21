/**
 * API 列表拉取上限（2026-09-21 新增）
 *
 * 【为什么需要这个】
 * 后端多个列表接口的默认分页是 `limit = 50`：
 *   · server/src/routes/problem.ts:70     （问题列表）
 *   · server/src/routes/tempTask.ts:50    （临时任务）
 *   · server/src/routes/inspection.ts:68  （巡查记录）
 *
 * 而前端相应的 Store（useProblemStore / useTempTaskStore / useInspectionDataStore）
 * 调用时既不传 limit 也不读 meta.total，于是拿到的永远只有前 50 条，
 * 却在这个数组上做全量统计、筛选、徽章计数与导出 ——
 * 一旦记录数超过 50，第 51 条起的数据会在列表、徽章、导出里【静默消失】，
 * 且没有任何提示，表现成"数据莫名其妙少了"。
 *
 * 内部管理系统的数据量级有限（当前问题 30 条、临时任务 19 条、巡查 13 条），
 * 因此这里用一个足够大的上限直接拉全量，而不是引入完整分页 —— 后者需要同时改造
 * 三组列表的 UI 分页、Store 状态与调用方，收益与风险不成比例。
 *
 * 若将来任一类记录接近该上限，应当改为真正的服务端分页，而不是继续调大这个数字。
 */
export const LIST_FETCH_LIMIT = 500;

/**
 * 把列表拉取上限拼进查询参数。
 *
 * @param params 已有的查询参数对象（会被就地修改）
 * @returns 同一个 params 对象，便于链式调用
 *
 * @example
 *   const params = new URLSearchParams();
 *   applyListLimit(params);          // → limit=500
 *   const url = `/problems?${params.toString()}`;
 */
export function applyListLimit(params: URLSearchParams): URLSearchParams {
  if (!params.has('limit')) {
    params.set('limit', String(LIST_FETCH_LIMIT));
  }
  return params;
}
