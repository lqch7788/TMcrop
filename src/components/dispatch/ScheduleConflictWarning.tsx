/**
 * ScheduleConflictWarning — 排班冲突软警告弹窗
 *
 * 当用户尝试派发任务给未排班/无排班记录员工时弹出二次确认。
 * 显示员工姓名、冲突类型、当前已派任务列表（最多 5 条）。
 */

import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui';

export interface ScheduleConflictWarningProps {
  isOpen: boolean;
  workerName: string;
  scheduleStatus: 'off_duty' | 'no_schedule';
  assignedTaskCount: number;
  totalAssignedHours: number;
  tasks: Array<{ taskId: string; title: string; priority: string; status: string }>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ScheduleConflictWarning({
  isOpen,
  workerName,
  scheduleStatus,
  assignedTaskCount,
  totalAssignedHours,
  tasks,
  onConfirm,
  onCancel,
}: ScheduleConflictWarningProps) {
  const isOffDuty = scheduleStatus === 'off_duty';
  const titleColor = isOffDuty ? 'text-red-600' : 'text-amber-600';
  const iconBg = isOffDuty ? 'bg-red-500' : 'bg-amber-500';
  const description = isOffDuty
    ? '该员工今日未排班，确认派发将占用额外劳动力资源'
    : '该员工无排班记录，确认派发将占用额外劳动力资源';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="排班冲突警告"
      size="sm"
      showFooter={false}
    >
      <div className="p-4 space-y-4">
        {/* 标题区 */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${titleColor}`}>排班冲突警告</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>

        {/* 员工信息 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">员工姓名</span>
            <span className="font-medium text-gray-900">{workerName}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">已派任务</span>
            <span className="font-medium text-gray-900">{assignedTaskCount} 个</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">已用工时</span>
            <span className="font-medium text-gray-900">{totalAssignedHours} 小时</span>
          </div>
        </div>

        {/* 任务列表（最多 5 条） */}
        {tasks.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">当前已派任务（最多显示 5 条）：</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {tasks.slice(0, 5).map((t) => (
                <div key={t.taskId} className="flex items-center justify-between text-xs bg-white border border-gray-100 rounded px-2 py-1">
                  <span className="truncate flex-1">{t.title}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                    t.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    t.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{t.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-white ${isOffDuty ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            确认派发
          </button>
        </div>
      </div>
    </Modal>
  );
}
