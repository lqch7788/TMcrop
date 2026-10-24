/**
 * 考勤管理聚合页面
 *
 * 2026-10-24：新增「排班」Tab（原「排班调度」页里的考勤排班部分，从农事管理移入）。
 *   - 考勤排班实体 = src/components/labor/schedule/SchedulePage.tsx，
 *     代码本就位于 components/labor/ 目录下，本次只改挂载位置，不动组件内部。
 *   - 两张排班表互不相通（见 memory: two-schedule-tables-exist）：
 *       schedules（人 × 日期 × 班次，含签到签退/调班/班次设置）= 考勤排班 → 本页「排班」Tab
 *       farm_task_schedules（任务 × 人 × 日期）= 任务排班 → 农事管理 /schedule
 *
 * Tab 状态从组件内 useState 改为 URL 参数（?tab=），与排班调度页保持一致（可分享、可前进后退）。
 *
 * Tab 面板采用「首次访问后保持挂载 + CSS 隐藏」：
 *   Radix Select 内部用 useState 存 DOM 节点并把 setState 当 ref 回调传给元素
 *   （ref={composeRefs(forwardedRef, setTrigger)}），批量卸载时 React commit 阶段的
 *   safelyDetachRef 会触发大量 setState → 同步渲染死循环（已验证的切 tab 卡死事故）。
 *   同款实现见 src/pages/farm/FarmTaskHub.tsx 与 memory: radix-select-unmount-freeze。
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Calendar, Clock, CalendarDays } from 'lucide-react';
import { TabHeader } from '../../components/common/TabHeader';
import { WorkerAttendancePage } from '../../components/labor/attendance/WorkerAttendancePage';
import { SchedulePage } from '../../components/labor/schedule';
import { LeavePage } from '../../components/labor/leave/LeavePage';
import { OvertimePage } from '../../components/labor/overtime/OvertimePage';

const TAB_WORKER = 'worker-attendance';
const TAB_SCHEDULE = 'schedule';
const TAB_LEAVE = 'leave';
const TAB_OVERTIME = 'overtime';

const TABS = [
  { key: TAB_WORKER, label: '工人考勤', icon: Users },
  { key: TAB_SCHEDULE, label: '排班', icon: CalendarDays },
  { key: TAB_LEAVE, label: '请假管理', icon: Calendar },
  { key: TAB_OVERTIME, label: '加班管理', icon: Clock },
];

export default function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab 状态落在 URL 上：可分享、可前进后退
  const tabParam = searchParams.get('tab');
  const activeTab =
    tabParam === TAB_SCHEDULE || tabParam === TAB_LEAVE || tabParam === TAB_OVERTIME
      ? tabParam
      : TAB_WORKER;

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === TAB_WORKER) {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    setSearchParams(params, { replace: true });
  };

  // 首次访问后保持挂载，仅切 CSS 可见性（防 Radix Select 卸载风暴）
  // 初始集合取当前 tab —— 深链直接落到「排班」时无需等一轮 effect 才挂载
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set<string>([activeTab]));
  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <TabHeader
        title="考勤管理"
        subtitle="工人考勤、排班、请假与加班管理"
        icon={<Users className="w-6 h-6 text-white" />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Tab内容区域（保持挂载 + CSS 隐藏） */}
      <div>
        {visitedTabs.has(TAB_WORKER) && (
          <div className={activeTab === TAB_WORKER ? 'block' : 'hidden'}>
            <WorkerAttendancePage />
          </div>
        )}
        {visitedTabs.has(TAB_SCHEDULE) && (
          <div className={activeTab === TAB_SCHEDULE ? 'block' : 'hidden'}>
            <SchedulePage />
          </div>
        )}
        {visitedTabs.has(TAB_LEAVE) && (
          <div className={activeTab === TAB_LEAVE ? 'block' : 'hidden'}>
            <LeavePage />
          </div>
        )}
        {visitedTabs.has(TAB_OVERTIME) && (
          <div className={activeTab === TAB_OVERTIME ? 'block' : 'hidden'}>
            <OvertimePage />
          </div>
        )}
      </div>
    </div>
  );
}
