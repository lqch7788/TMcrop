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
  submit: { icon: Upload, color: 'text-amber-500', bgColor: 'bg-amber-500', label: '提交验收' },
  reject: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500', label: '验收驳回' },
  complete: { icon: CheckCircle, color: 'text-emerald-500', bgColor: 'bg-emerald-500', label: '验收通过' },
  overtime_continue: { icon: Play, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '超时继续' },
  overtime_abandon: { icon: Square, color: 'text-red-500', bgColor: 'bg-red-500', label: '超时放弃' },
  reassign: { icon: Send, color: 'text-purple-500', bgColor: 'bg-purple-500', label: '重新派发' },
  remind: { icon: Bell, color: 'text-orange-500', bgColor: 'bg-orange-500', label: '催办提醒' },
  extend_deadline: { icon: Calendar, color: 'text-gray-500', bgColor: 'bg-gray-500', label: '延期' },
  continue: { icon: Play, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '继续执行' },
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
            const IconComponent = config.icon;
            const isLast = index === sortedRecords.length - 1;

            return (
              <div key={record.id} className="relative flex gap-4 pl-10">
                {/* 图标节点 */}
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium z-10 ${config.bgColor}`}
                >
                  <IconComponent className="w-3 h-3" />
                </div>

                {/* 内容 */}
                <div className={`flex-1 pb-6 ${isLast ? '' : 'border-b border-gray-100'}`}>
                  {/* 头部：操作人和操作类型 */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {record.operatorName}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${config.color} bg-opacity-10 ${config.bgColor}`}
                        style={{ backgroundColor: `${config.color}15` }}
                      >
                        {record.actionName || config.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTime(record.actionTime)}
                    </span>
                  </div>

                  {/* 状态变化 */}
                  {showStatusChange && (record.fromStatus || record.toStatus) && (
                    <div className="flex items-center gap-1 mb-2">
                      {record.fromStatus && (
                        <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(record.fromStatus)} bg-opacity-10`}
                          style={{ backgroundColor: `${TASK_STATUS_CONFIG[record.fromStatus as TaskStatus]?.bg || '#f3f4f6'}` }}>
                          {getStatusLabel(record.fromStatus)}
                        </span>
                      )}
                      <span className="text-gray-400">→</span>
                      {record.toStatus && (
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${getStatusColor(record.toStatus)}`}
                          style={{ backgroundColor: `${TASK_STATUS_CONFIG[record.toStatus as TaskStatus]?.bg || '#f3f4f6'}` }}
                        >
                          {getStatusLabel(record.toStatus)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 进度显示 */}
                  {record.progress !== undefined && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 max-w-[120px] bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${record.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{record.progress}%</span>
                      {record.progressIncrement !== undefined && record.progressIncrement > 0 && (
                        <span className="text-xs text-green-500">+{record.progressIncrement}%</span>
                      )}
                    </div>
                  )}

                  {/* 备注/驳回原因 */}
                  {(record.comment || record.reason) && (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2 mb-2">
                      {record.reason && (
                        <div className="text-red-600 mb-1">
                          <span className="font-medium">驳回原因：</span>
                          {record.reason}
                        </div>
                      )}
                      {record.comment && <div>{record.comment}</div>}
                    </div>
                  )}

                  {/* 反馈数据展示（位置、照片、语音等） */}
                  {showFeedback && record.feedback && (
                    <div className="mt-2 space-y-2">
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
