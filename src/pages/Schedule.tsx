/**
 * 排班调度页（Tab 容器）
 *
 * 2026-10-20：把「任务派工排班」（原独立路由 /farm-task-schedule）合并进来。
 *
 * 为什么合并到排班调度而不是班组分配：
 *   排班调度的主键是「人 × 日期 × 班次」，与任务排班的「任务 × 人 × 日期」同轴；
 *   班组分配是组织维度（谁归哪个班组长管），与时间轴维度错配。
 *
 * 为什么自己写 Tab 而不用 @/components/ui 的 Tabs：
 *   TabsContent 对非选中面板 return null（卸载）。考勤排班面板内含大量 Radix Select，
 *   切 Tab 时一次性卸载会触发已验证的「Radix Select 卸载风暴卡死」
 *   （见 memory: radix-select-unmount-freeze）。因此两个面板都保持挂载，只用 CSS 隐藏。
 *
 * 2026-10-23：把「排班调度」标题卡片（图标 + 标题）从 SchedulePage 内部提升到页面级，
 *   置于 Tab 切换条之上并 sticky 常显：
 *   1. 原先标题卡片在 SchedulePage 内，只有「考勤排班」Tab 才可见，切到「任务排班」标题就消失了；
 *   2. 提升后无论哪个 Tab，页面顶部始终是「排班调度」标题卡片，Tab 条排在其下方。
 */
import { useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { SchedulePage } from '../components/labor/schedule';
import TaskSchedulePage from './farm/TaskSchedulePage';

const TAB_ATTENDANCE = 'attendance';
const TAB_FARM_TASK = 'farm-task';

export default function Schedule() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab 状态落在 URL 上：可分享、可前进后退
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === TAB_FARM_TASK ? TAB_FARM_TASK : TAB_ATTENDANCE;

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === TAB_FARM_TASK) {
      params.set('tab', TAB_FARM_TASK);
    } else {
      params.delete('tab');
    }
    setSearchParams(params, { replace: true });
  };

  const tabClass = (active: boolean) =>
    active
      ? 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold bg-white text-emerald-600 shadow-sm transition-colors'
      : 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors';

  return (
    <div className="space-y-4">
      {/* 页面标题卡片（置顶 + sticky 常显）：两个 Tab 共用，切换时标题与图标不会消失 */}
      <div className="sticky top-12 z-20 bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">排班调度</h1>
            <p className="text-sm text-gray-500">员工排班管理与调班申请</p>
          </div>
        </div>
      </div>

      {/* Tab 切换条（排在「排班调度」标题卡片之下） */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="inline-flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl">
          <button
            type="button"
            onClick={() => handleTabChange(TAB_ATTENDANCE)}
            data-state={activeTab === TAB_ATTENDANCE ? 'active' : 'inactive'}
            className={tabClass(activeTab === TAB_ATTENDANCE)}
          >
            考勤排班
          </button>
          <button
            type="button"
            onClick={() => handleTabChange(TAB_FARM_TASK)}
            data-state={activeTab === TAB_FARM_TASK ? 'active' : 'inactive'}
            className={tabClass(activeTab === TAB_FARM_TASK)}
          >
            任务排班
          </button>
        </div>
      </div>

      {/* 两个面板都保持挂载，只用 CSS 隐藏 —— 避免 Radix Select 卸载风暴 */}
      <div className={activeTab === TAB_ATTENDANCE ? 'block' : 'hidden'}>
        <SchedulePage />
      </div>
      <div className={activeTab === TAB_FARM_TASK ? 'block' : 'hidden'}>
        <TaskSchedulePage />
      </div>
    </div>
  );
}
