/**
 * 计划实例表格（2026-10-21 P3 / 2026-10-22 审核返修）
 *
 * 一次拉取计划的全部实例任务，排班与记录标记由后端批量 join 好（无 N+1）。
 * 「未排班原因」直接显示在排班状态列 —— 计划的价值就在于「谁、什么时候没去」看得见。
 *
 * 审核返修（2026-10-22）：
 *   · 删除本地 STATUS_STYLE / STATUS_TEXT —— 原实现自建了一套状态颜色与中文
 *     （in_progress 叫「执行中」、waiting_acceptance 用紫色…），与全局 STATUS_MAP
 *     （「处理中」/橙色）冲突，同一条任务在两个页面显示不同颜色和文案。
 *     现统一复用 constants_taskDispatch 的 STATUS_MAP。
 *   · 表头/行高/hover 对齐同页的 InspectionTable（蓝渐变表头、px-4 py-3、hover:bg-blue-100）。
 *   · 徽章改用模块既有的 span 写法（12px 无边框），不用 Badge（14px 加粗带边框）。
 */
import React from 'react';
import { Button } from '@/components/ui';
import { STATUS_MAP } from '../constants_taskDispatch';
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

export function InspectionPlanOccurrenceTable({
  occurrences, onViewTask, onSubmitRecord, onViewRecord, onScheduleTask, compact,
}: Props) {
  if (!occurrences || occurrences.length === 0) {
    return (
      <div className="text-center text-sm text-gray-400 py-8">
        暂无实例任务。点击「生成排期」按计划频率生成未来窗口的任务。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {/* 表头与同页 InspectionTable 保持一致：蓝渐变 + 白字 */}
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">执行日</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">任务编号</th>
            {!compact && <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">排班</th>}
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">记录</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
            <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {occurrences.map((o) => {
            const canSubmit = ['pending', 'accepted', 'in_progress'].includes(o.status);
            const hasRecord = !!o.inspectionRecordId;
            const statusCfg = STATUS_MAP[o.status] || { label: o.status, color: 'text-gray-600', bg: 'bg-gray-100' };
            return (
              <tr key={o.taskId} className="hover:bg-blue-100 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">
                  {o.planOccurrenceDate}
                  {o.planTime ? <span className="ml-1 text-xs text-gray-500">{o.planTime}</span> : null}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-800 font-medium px-0"
                    onClick={() => onViewTask?.(o.taskId)}
                  >
                    {o.taskCode}
                  </Button>
                </td>
                {!compact && (
                  <td className="px-4 py-3 whitespace-nowrap">
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
                <td className="px-4 py-3 whitespace-nowrap">
                  {hasRecord ? (
                    <button
                      type="button"
                      className="text-emerald-600 hover:text-emerald-800 text-xs underline"
                      onClick={() => onViewRecord?.(o.inspectionRecordId!)}
                    >
                      {o.inspectionRecordCode}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">未提交</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {/* 复用全局状态映射：颜色与中文与「我的任务 / 农事任务中心」完全一致 */}
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {!hasRecord && canSubmit ? (
                    <Button size="sm" variant="outline" onClick={() => onSubmitRecord?.(o.taskId)}>
                      填写记录
                    </Button>
                  ) : hasRecord ? (
                    <Button size="sm" variant="ghost" onClick={() => onViewRecord?.(o.inspectionRecordId!)}>
                      查看记录
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-300">-</span>
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