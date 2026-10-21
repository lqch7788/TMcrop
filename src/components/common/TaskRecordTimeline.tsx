/**
 * 任务流转记录时间线组件
 * 用于展示农事任务的完整处理流程
 * 参照 TaskFlowTimeline 设计，但适配 TaskRecord 类型
 */

import React from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Send,
  RotateCcw,
  Play,
  Upload,
  Bell,
  Calendar,
  Square,
  Image,
  MapPin,
  Mic,
} from 'lucide-react';
import { TASK_STATUS_CONFIG } from '../../hooks/useTasks';
import type { TaskRecord, TaskStatus } from '../../types/task';

// 流转动作配置
const TASK_ACTION_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; bgColor: string; label: string }> = {
  publish: { icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '派发任务' },
  withdraw: { icon: RotateCcw, color: 'text-gray-500', bgColor: 'bg-gray-500', label: '撤回任务' },
  cancel: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500', label: '取消任务' },
  accept: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500', label: '接单确认' },
  progress: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '进度更新' },
  submit_progress: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '提交进度' },
  submit: { icon: Upload, color: 'text-amber-500', bgColor: 'bg-amber-500', label: '提交验收' },
  reject: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500', label: '验收驳回' },
  complete: { icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500', label: '验收通过' },
  overtime_continue: { icon: Play, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '超时继续' },
  overtime_abandon: { icon: Square, color: 'text-red-500', bgColor: 'bg-red-500', label: '超时放弃' },
  reassign: { icon: Send, color: 'text-purple-500', bgColor: 'bg-purple-500', label: '重新派发' },
  remind: { icon: Bell, color: 'text-orange-500', bgColor: 'bg-orange-500', label: '催办提醒' },
  extend_deadline: { icon: Calendar, color: 'text-gray-500', bgColor: 'bg-gray-500', label: '延期' },
  continue: { icon: Play, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '继续执行' },
  create: { icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '创建任务' },
};

interface TaskRecordTimelineProps {
  records: TaskRecord[];
  showStatusChange?: boolean;
  showFeedback?: boolean;
}

export function TaskRecordTimeline({
  records,
  showStatusChange = true,
  showFeedback = true,
}: TaskRecordTimelineProps) {
  if (!records || records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无流转记录
      </div>
    );
  }

  // 按时间排序（从早到晚）
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.actionTime).getTime() - new Date(b.actionTime).getTime()
  );

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取状态标签
  const getStatusLabel = (status: string) => {
    const config = TASK_STATUS_CONFIG[status as TaskStatus];
    return config ? config.label : status;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const config = TASK_STATUS_CONFIG[status as TaskStatus];
    return config ? config.color : 'text-gray-600';
  };

  return (
    <div className="space-y-0">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">流转记录（{records.length}条）</h4>

      <div className="relative">
        {/* 时间线 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {sortedRecords.map((record, index) => {
            const config = TASK_ACTION_CONFIG[record.action] || TASK_ACTION_CONFIG.progress;
            const isLast = index === sortedRecords.length - 1;

            return (
              <div key={record.id} className="relative flex gap-4 pl-10">
                {/* 数字序号节点 */}
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium z-10 ${config.bgColor}`}
                >
                  {index + 1}
                </div>

                {/* 内容 —— 2026-10-20：改为横向排列，各字段之间用竖线分隔
                    （此前操作人/动作、状态变化、进度、备注 各占一行，一条记录 4~5 行） */}
                <div className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-gray-100'}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium text-gray-900">
                      {record.operatorName || '-'}
                    </span>

                    <span className="text-gray-300 select-none">|</span>
                    {/* 2026-10-21：操作徽章原本 config.color + config.bgColor 是同色阶（-500/-500），
                        深色字配深色底 → 文字完全看不见。改为浅底深字（背景 -100 + 文字 -700），
                        仅颜色基底（蓝/绿/红等）保持一致。序号的圆形节点不动（深底+白字）。 */}
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${config.bgColor.replace('-500', '-100')} ${config.color.replace('-500', '-700')}`}
                    >
                      {record.actionName || config.label}
                    </span>

                    {/* 状态变化 */}
                    {showStatusChange && (record.fromStatus || record.toStatus) && (
                      <>
                        <span className="text-gray-300 select-none">|</span>
                        <span className="flex items-center gap-1">
                          {record.fromStatus && (
                            /* 2026-10-21：状态徽章 background 字段是 Tailwind className 不是 hex，
                               此前 style={{ backgroundColor }} 被浏览器忽略 → 徽章没底色只剩深字。
                               改为直接 className 拼接底色。 */
                            <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(record.fromStatus)} ${TASK_STATUS_CONFIG[record.fromStatus as TaskStatus]?.bg || 'bg-gray-100'}`}>
                              {getStatusLabel(record.fromStatus)}
                            </span>
                          )}
                          <span className="text-gray-400">→</span>
                          {record.toStatus && (
                            /* 2026-10-21：同 fromStatus 修复（className 拼接底色，不再用无效的 inline style）。 */
                            <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(record.toStatus)} ${TASK_STATUS_CONFIG[record.toStatus as TaskStatus]?.bg || 'bg-gray-100'}`}>
                              {getStatusLabel(record.toStatus)}
                            </span>
                          )}
                        </span>
                      </>
                    )}

                    {/* 进度 */}
                    {record.progress !== undefined && (
                      <>
                        <span className="text-gray-300 select-none">|</span>
                        <span className="flex items-center gap-2">
                          <span className="w-[90px] bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <span
                              className="block h-full bg-blue-500 rounded-full"
                              style={{ width: `${record.progress}%` }}
                            />
                          </span>
                          <span className="text-xs text-gray-500">{record.progress}%</span>
                          {record.progressIncrement !== undefined && record.progressIncrement > 0 && (
                            <span className="text-xs text-green-500">+{record.progressIncrement}%</span>
                          )}
                        </span>
                      </>
                    )}

                    {/* 驳回原因 / 备注 */}
                    {record.reason && (
                      <>
                        <span className="text-gray-300 select-none">|</span>
                        <span className="text-red-600 break-all">
                          <span className="font-medium">驳回原因：</span>
                          {record.reason}
                        </span>
                      </>
                    )}
                    {record.comment && (
                      <>
                        <span className="text-gray-300 select-none">|</span>
                        <span className="text-gray-600 break-all">{record.comment}</span>
                      </>
                    )}

                    <span className="text-gray-300 select-none">|</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTime(record.actionTime)}
                    </span>
                  </div>

                  {/* 反馈数据展示（位置、照片、语音等） */}
                  {showFeedback && record.feedback && (
                    <div className="mt-2 space-y-2">
                      {/* 2026-10-21：处理结果结论（全部完成/部分完成/延迟完成/其他）
                          —— 执行人在提交弹窗选择的结论，此前只存在表单内存、提交后即丢失 */}
                      {record.feedback.resultStatus && (
                        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded px-2 py-1">
                          <span>📋</span>
                          <span>处理结果：</span>
                          <span className="font-medium">{record.feedback.resultStatus}</span>
                        </div>
                      )}

                      {/* GPS位置 */}
                      {record.feedback.gpsLocation && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1">
                          <MapPin className="w-3 h-3" />
                          <span>位置打卡：</span>
                          <span className="font-mono">
                            {record.feedback.gpsLocation.lat.toFixed(6)}, {record.feedback.gpsLocation.lng.toFixed(6)}
                          </span>
                        </div>
                      )}

                      {/* 图片 */}
                      {record.feedback.images && record.feedback.images.length > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                          <div className="flex items-center gap-1 mb-1">
                            <Image className="w-3 h-3" />
                            <span>照片：{record.feedback.images.length}张</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {record.feedback.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`照片${idx + 1}`}
                                className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(img, '_blank')}
                                title="点击查看原图"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 语音 */}
                      {record.feedback.voiceNote && (
                        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                          <Mic className="w-3 h-3" />
                          <span>语音备注</span>
                        </div>
                      )}

                      {/* 物料使用 */}
                      {record.feedback.materials && record.feedback.materials.length > 0 && (
                        <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                          <div className="flex items-center gap-1 mb-1">
                            <span>📦</span>
                            <span>物料使用：</span>
                          </div>
                          {record.feedback.materials.map((m, idx) => (
                            <div key={idx} className="ml-4">
                              {m.name} × {m.qty} {m.unit}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 物资编码/扫码 */}
                      {record.feedback.materialCode && (
                        <div className="text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                          <span>🔗</span>
                          <span>物资编码：</span>
                          <span className="font-mono">{record.feedback.materialCode}</span>
                        </div>
                      )}

                      {/* 工作量 */}
                      {(record.feedback.workloadDays !== undefined || record.feedback.workloadHours !== undefined || record.feedback.workers !== undefined) && (
                        <div className="text-xs text-cyan-600 bg-cyan-50 rounded px-2 py-1">
                          <span>⏱️</span>
                          <span>工作量：</span>
                          {record.feedback.workloadDays !== undefined && <span>{record.feedback.workloadDays}天</span>}
                          {record.feedback.workloadDays !== undefined && record.feedback.workloadHours !== undefined && <span> + </span>}
                          {record.feedback.workloadHours !== undefined && <span>{record.feedback.workloadHours}小时</span>}
                          {record.feedback.workers !== undefined && <span>，{record.feedback.workers}人</span>}
                        </div>
                      )}

                      {/* 文字反馈 */}
                      {record.feedback.text && (
                        <div className="text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                          {record.feedback.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
