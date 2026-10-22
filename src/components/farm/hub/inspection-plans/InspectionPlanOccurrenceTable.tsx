/**
 * 计划实例表格（2026-10-21 P3）
 *
 * 一次拉取计划的全部实例任务，排班与记录标记由后端批量 join 好（无 N+1）。
 * 「未排班原因」直接显示在排班状态列 —— 计划的价值就在于「谁、什么时候没去」看得见。
 */
import React from 'react';
import { Badge, Button } from '@/components/ui';
import type { PlanOccurrence } from '@/stores/useInspectionPlanStore';

interface Props {
  occurrences: PlanOccurrence[];
  onViewTask?: (taskId: string) => void;
  onSubmitRecord?: (taskId: string) => void;
  onViewRecord?: (recordId: string) => void;
  /** 2026-10-21 P5：跳到「排班调度 → 任务排班」并预选该任务 */
  onScheduleTask?: (taskId: string, date: string) => void;
  compact?: boolean;
}

/** 任务状态 → 徽章配色 */
const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  accepted: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  waiting_acceptance: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_TEXT: Record<string, string> = {
  pending: '待接受', accepted: '已接受', in_progress: '执行中',
  waiting_acceptance: '待验收', completed: '已完成',
  rejected: '已返工', failed: '已失败', cancelled: '已取消',
};

export function InspectionPlanOccurrenceTable({ occurrences, onViewTask, onSubmitRecord, onViewRecord, onScheduleTask, compact }: Props) {
  if (!occurrences || occurrences.length === 0) {
    return (
      <div className="text-center text-sm text-slate-400 py-8">
        暂无实例任务。点击「生成排期」按计划频率生成未来窗口的任务。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">执行日</th>
            <th className="px-3 py-2 text-left font-medium">任务编号</th>
            {!compact && <th className="px-3 py-2 text-left font-medium">排班</th>}
            <th className="px-3 py-2 text-left font-medium">记录</th>
            <th className="px-3 py-2 text-left font-medium">状态</th>
            <th className="px-3 py-2 text-left font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {occurrences.map((o) => {
            const canSubmit = ['pending', 'accepted', 'in_progress'].includes(o.status);
            const hasRecord = !!o.inspectionRecordId;
            return (
              <tr key={o.taskId} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">
                  {o.planOccurrenceDate}
                  {o.planTime ? <span className="ml-1 text-xs text-slate-500">{o.planTime}</span> : null}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => onViewTask?.(o.taskId)}
                  >
                    {o.taskCode}
                  </button>
                </td>
                {!compact && (
                  <td className="px-3 py-2">
                    {o.schedule ? (
                      <span className="text-xs text-emerald-700">
                        {o.schedule.workerName || '已排班'}
                        {o.schedule.shiftType ? ` / ${o.schedule.shiftType}` : ''}
                      </span>
                    ) : onScheduleTask ? (
                      <button
                        type="button"
                        className="text-xs text-amber-600 hover:text-amber-800 underline"
                        onClick={() => onScheduleTask(o.taskId, o.planOccurrenceDate)}
                        title="跳到排班调度并预选该任务"
                      >
                        未排班 · 去排班
                      </button>
                    ) : (
                      <span className="text-xs text-amber-600">未排班</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-2">
                  {hasRecord ? (
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800 text-xs"
                      onClick={() => onViewRecord?.(o.inspectionRecordId!)}
                    >
                      {o.inspectionRecordCode}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">未提交</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge className={STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-600'}>
                    {STATUS_TEXT[o.status] || o.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {!hasRecord && canSubmit ? (
                    <Button size="sm" variant="outline" onClick={() => onSubmitRecord?.(o.taskId)}>
                      填写记录
                    </Button>
                  ) : hasRecord ? (
                    <Button size="sm" variant="ghost" onClick={() => onViewRecord?.(o.inspectionRecordId!)}>
                      查看记录
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}