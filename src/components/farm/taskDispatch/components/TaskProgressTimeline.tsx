/**
 * 任务进度时间线组件
 * 功能：展示任务的所有操作记录时间线
 */

import { Clock, User, MapPin, Camera, Mic, FileText, Package, CheckCircle } from 'lucide-react';
import { TaskRecord, TASK_ACTION_CONFIG, TASK_STATUS_CONFIG } from '../../../../types/task';

interface TaskProgressTimelineProps {
  records: TaskRecord[];
  maxHeight?: string;
  showTaskInfo?: boolean;
  taskCode?: string;
  taskTitle?: string;
}

export function TaskProgressTimeline({
  records,
  maxHeight = '400px',
  showTaskInfo = false,
  taskCode,
  taskTitle,
}: TaskProgressTimelineProps) {
  // 按时间倒序排列
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime()
  );

  return (
    <div className="space-y-4">
      {/* 任务信息头部 */}
      {showTaskInfo && taskCode && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="font-medium text-gray-900">{taskTitle || '任务详情'}</p>
          <p className="text-sm text-gray-500">任务编号：{taskCode}</p>
        </div>
      )}

      {/* 时间线 */}
      <div className="space-y-4 max-h-[${maxHeight}] overflow-y-auto">
        {sortedRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无操作记录</p>
          </div>
        ) : (
          sortedRecords.map((record, index) => {
            const actionConfig = TASK_ACTION_CONFIG[record.action];
            const statusConfig = TASK_STATUS_CONFIG[record.toStatus];
            const isLatest = index === 0;

            return (
              <div
                key={record.id}
                className={`relative pl-6 ${
                  index !== sortedRecords.length - 1 ? 'border-l-2 border-gray-200 pb-4' : 'pb-0'
                }`}
              >
                {/* 时间线节点 */}
                <div
                  className={`absolute left-0 top-0 w-3 h-3 rounded-full -translate-x-[7px] ${
                    isLatest ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-gray-300'
                  }`}
                />

                {/* 记录卡片 */}
                <div
                  className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                    isLatest ? 'border-emerald-200' : 'border-gray-100'
                  }`}
                >
                  {/* 头部：状态标签 + 时间 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          actionConfig?.bg || 'bg-gray-100'
                        } ${actionConfig?.color || 'text-gray-600'}`}
                      >
                        {actionConfig?.label || record.action}
                      </span>
                      {record.fromStatus && (
                        <>
                          <span className="text-gray-400 text-xs">→</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              statusConfig?.bg || 'bg-gray-100'
                            } ${statusConfig?.color || 'text-gray-600'}`}
                          >
                            {statusConfig?.label || record.toStatus}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(record.actionTime).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* 操作人 */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <User className="w-3 h-3" />
                    <span>{record.operatorName}</span>
                  </div>

                  {/* 进度信息 */}
                  {record.progress !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <FileText className="w-3 h-3" />
                      <span>
                        进度：{record.progress}%
                        {record.progressIncrement !== undefined && record.progressIncrement > 0 && (
                          <span className="text-emerald-600 ml-1">(+{record.progressIncrement}%)</span>
                        )}
                        {record.progressIncrement !== undefined && record.progressIncrement < 0 && (
                          <span className="text-red-600 ml-1">({record.progressIncrement}%)</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* 反馈内容 */}
                  {record.feedback && (
                    <div className="mt-3 space-y-2">
                      {record.feedback.text && (
                        <div className="bg-blue-50 rounded p-2 text-sm">
                          <p className="text-gray-700">{record.feedback.text}</p>
                        </div>
                      )}

                      {record.feedback.images && record.feedback.images.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {record.feedback.images.map((img, i) => (
                            <div
                              key={i}
                              className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                              title={`照片 ${i + 1}`}
                            >
                              <Camera className="w-5 h-5 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      )}

                      {record.feedback.gpsLocation && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-3 h-3 text-blue-500" />
                          <span>
                            GPS: {record.feedback.gpsLocation.lat.toFixed(4)},{' '}
                            {record.feedback.gpsLocation.lng.toFixed(4)}
                          </span>
                        </div>
                      )}

                      {record.feedback.voiceNote && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mic className="w-3 h-3 text-purple-500" />
                          <span>语音备注</span>
                        </div>
                      )}

                      {record.feedback.materials && record.feedback.materials.length > 0 && (
                        <div className="bg-amber-50 rounded p-2">
                          <div className="flex items-center gap-2 text-sm text-amber-700 mb-1">
                            <Package className="w-3 h-3" />
                            <span className="font-medium">物料使用</span>
                          </div>
                          <div className="text-sm text-amber-600">
                            {record.feedback.materials.map((m, i) => (
                              <span key={i} className="mr-3">
                                {m.name}×{m.qty}
                                {m.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.feedback.laborCost !== undefined && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">人工费：</span>
                          ¥{record.feedback.laborCost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 备注/原因 */}
                  {record.comment && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                      {record.comment}
                    </p>
                  )}
                  {record.reason && (
                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded p-2 border border-red-100">
                      <span className="font-medium">原因：</span>
                      {record.reason}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
