/**
 * 排班日期工具函数（2026-09-18 从 ScheduleAddModal.tsx 抽出）
 *
 * 抽因：ScheduleAddModal 766 行里混着 4 个纯日期函数，抽到独立文件后可单独测试，
 * 主组件也只关注表单/预览/提交逻辑。
 *
 * ⚠️ 全部使用**本地时区**解析（不用 toISOString，避免 UTC 偏移一天 —
 * 见项目记忆 utc-timezone-id-bug）。
 */

/** 今天的本地日期（YYYY-MM-DD） */
export function todayLocalISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 解析 YYYY-MM-DD 为本地时区的 Date（无效返回 null） */
export function parseLocalISO(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

/** 格式化本地 Date 为 YYYY-MM-DD */
export function formatLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 预览：计算日期段实际生效天数
 * @param weekdays 可选，仅保留这些星期几（0=周日…6=周六）；不传或空数组表示每天都算
 */
export function expandDatesForPreview(startDate: string, endDate: string, weekdays?: number[]): string[] {
  const start = parseLocalISO(startDate);
  const end = parseLocalISO(endDate);
  if (!start || !end || start > end) return [];
  const result: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (!weekdays || weekdays.length === 0 || weekdays.includes(day)) {
      result.push(formatLocalISO(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
