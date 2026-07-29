/**
 * OccupationHoverCard — 排班占用悬浮卡
 *
 * 日历单元格 hover 时显示该员工当日任务列表 + 工时进度条。
 * 工时阈值动态计算：基于当前员工 shift 时长（从 shiftConfigs 读）。
 */

import { useScheduleStore } from '../../../stores';
import type { ScheduleOccupation } from '../../../stores/scheduleStore';

interface OccupationHoverCardProps {
  occupation: ScheduleOccupation;
  shiftConfigs: Array<{ name: string; startTime: string; endTime: string }>;
}

export function OccupationHoverCard({ occupation, shiftConfigs }: OccupationHoverCardProps) {
  const shift = shiftConfigs.find(s => s.name === occupation.shift);
  // 解析 HH:mm 格式的小时数，计算班次时长（处理跨夜班次）
  const shiftDurationHours = shift
    ? (() => {
        const startH = parseInt(shift.startTime.split(':')[0], 10);
        const endH = parseInt(shift.endTime.split(':')[0], 10);
        return ((endH - startH + 24) % 24) || 8;
      })()
    : 8;

  const usageRatio = Math.min(1, occupation.totalAssignedHours / shiftDurationHours);
  const barColor = usageRatio >= 1 ? 'bg-red-500' : usageRatio >= 0.75 ? 'bg-amber-500' : 'bg-green-500';
  const textColor = usageRatio >= 1 ? 'text-red-700' : usageRatio >= 0.75 ? 'text-amber-700' : 'text-green-700';

  return (
    <div className="absolute z-20 bottom-full right-0 mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{occupation.workerName}</span>
        <span className="text-xs text-gray-500">{occupation.shift}</span>
      </div>

      {/* 工时进度条 */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">工时占用</span>
          <span className={`font-medium ${textColor}`}>
            {occupation.totalAssignedHours}h / {shiftDurationHours}h
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${usageRatio * 100}%` }} />
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {occupation.tasks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-1">暂无任务</p>
        ) : (
          occupation.tasks.slice(0, 5).map((t) => (
            <div key={t.taskId} className="flex items-center justify-between text-xs">
              <span className="truncate flex-1 text-gray-700">{t.title}</span>
              <span className={`ml-2 px-1 py-0.5 rounded text-[10px] ${
                t.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                t.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>{t.priority}</span>
            </div>
          ))
        )}
      </div>

      {/* 底部穿透链接 */}
      {occupation.tasks.length > 5 && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-center">
          <button
            onClick={() => {
              // ★ 穿透到该员工当日任务列表（通过 URL 参数触发）
              const params = new URLSearchParams({ workerId: occupation.workerId, date: '' });
              window.history.pushState({}, '', `?${params.toString()}`);
              window.dispatchEvent(new PopstateEvent('popstate'));
            }}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            查看全部 {occupation.tasks.length} 个任务
          </button>
        </div>
      )}
    </div>
  );
}
