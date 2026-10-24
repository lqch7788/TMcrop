/**
 * 排班调度页（农事管理）
 *
 * 2026-10-24：原「考勤排班」Tab 已移入人工管理 → 考勤管理 → 「排班」Tab
 *   （/labor/attendance?tab=schedule），本页只保留「任务排班」。
 *
 *   两张排班表互不相通（见 memory: two-schedule-tables-exist）：
 *   - schedules（人 × 日期 × 班次，含签到签退/调班/班次设置）= 考勤排班 → 人工管理
 *   - farm_task_schedules（任务 × 人 × 日期）= 任务排班 → 本页
 *
 * 排班调度菜单名保持不变（用户既有指令），页面副标题标明本页承载的是「农事任务排班」。
 *
 * 考勤排班的就近入口保留在本页顶部：schedules 表是农事派工占用（/api/schedules/occupations）
 * 与班组日可用性（team_daily_availability）的数据源，没有就近入口会导致农事场景下无处排班。
 */
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import TaskSchedulePage from './farm/TaskSchedulePage';

export default function Schedule() {
  return (
    <div className="space-y-4">
      {/* 页面标题卡片（置顶 + sticky 常显）+ 考勤排班就近入口 */}
      <div className="sticky top-12 z-20 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">排班调度</h1>
              <p className="text-sm text-gray-500">农事任务排班：哪条农事任务在什么时候由谁做</p>
            </div>
          </div>
          {/* 考勤排班已移入人工管理 → 考勤管理 → 排班 Tab，这里保留就近入口 */}
          <Link
            to="/labor/attendance?tab=schedule"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap"
          >
            考勤排班
          </Link>
        </div>
      </div>

      <TaskSchedulePage />
    </div>
  );
}
