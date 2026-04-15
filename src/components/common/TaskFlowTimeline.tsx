/**
 * 流转记录时间线组件
 * 用于展示问题的完整处理流程
 */

import { CheckCircle, XCircle, Clock, User, MessageSquare, Send, Play, Upload, ThumbsUp } from 'lucide-react';
import type { ProblemFlowRecord } from '../../hooks/useProblemDispatch';

// 流转动作配置
const ACTION_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  report: { icon: Clock, color: 'text-gray-500', label: '上报问题' },
  dispatch: { icon: Send, color: 'text-blue-500', label: '分派任务' },
  accept: { icon: CheckCircle, color: 'text-green-500', label: '接单确认' },
  reject: { icon: XCircle, color: 'text-red-500', label: '拒绝任务' },
  start: { icon: Play, color: 'text-blue-500', label: '开始处理' },
  submit: { icon: Upload, color: 'text-amber-500', label: '提交反馈' },
  approve: { icon: ThumbsUp, color: 'text-green-500', label: '验收通过' },
  complete: { icon: CheckCircle, color: 'text-emerald-500', label: '完成' },
  comment: { icon: MessageSquare, color: 'text-gray-500', label: '备注' },
};

interface TaskFlowTimelineProps {
  records: ProblemFlowRecord[];
  showStatusChange?: boolean;
}

export function TaskFlowTimeline({ records, showStatusChange = true }: TaskFlowTimelineProps) {
  if (!records || records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        暂无流转记录
      </div>
    );
  }

  // 按时间排序
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.actionTime).getTime() - new Date(b.actionTime).getTime()
  );

  // 格式化时间
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">流转记录</h4>
      <div className="relative">
        {/* 时间线 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {sortedRecords.map((record, index) => {
            const config = ACTION_CONFIG[record.action] || ACTION_CONFIG.comment;
            const IconComponent = config.icon;
            const isLast = index === sortedRecords.length - 1;

            return (
              <div key={record.id} className="relative flex gap-4 pl-10">
                {/* 图标 */}
                <div className={`absolute left-2 w-5 h-5 rounded-full bg-white border-2 ${config.color} flex items-center justify-center z-10`}>
                  <IconComponent className="w-3 h-3" />
                </div>

                {/* 内容 */}
                <div className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {record.operatorName}
                    </span>
                    <span className={`text-xs ${config.color}`}>
                      {config.label}
                    </span>
                  </div>

                  {showStatusChange && record.fromStatus && record.toStatus && record.fromStatus !== record.toStatus && (
                    <div className="text-xs text-gray-500 mb-1">
                      {record.fromStatus} → {record.toStatus}
                    </div>
                  )}

                  {record.comment && (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mt-1">
                      {record.comment}
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-1">
                    {formatTime(record.actionTime)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
