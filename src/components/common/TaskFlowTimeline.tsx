/**
 * 问题流转记录时间线组件
 *
 * 2026-10-21：与 TaskRecordTimeline（农事任务详情基准样式）统一：
 *   - 左侧改用数字序号圆节点（原为彩色描边图标）
 *   - 动作标签改为彩色徽章（浅底深字），与任务侧一致
 *   - 状态变化改为徽章对 + 箭头
 *   - 补充 feedbackData 渲染（GPS / 作业前后照片 / 语音 / 工作量 / 物资编码）
 *     —— 此前只渲染文字，巡查详情替换为本组件后会丢失照片等证据
 *   - 保留单行横向排列 + 竖线分隔
 */

import { Image, MapPin, Mic } from 'lucide-react';
import type { ProblemFlowRecord } from '../../hooks/useProblemDispatch';

// 流转动作配置（图标保留供他处复用，颜色沿用任务侧 -500 基底）
const ACTION_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
  report: { color: 'text-purple-500', bgColor: 'bg-purple-500', label: '上报问题' },
  dispatch: { color: 'text-blue-500', bgColor: 'bg-blue-500', label: '分派任务' },
  accept: { color: 'text-green-500', bgColor: 'bg-green-500', label: '接单确认' },
  reject: { color: 'text-red-500', bgColor: 'bg-red-500', label: '拒绝任务' },
  start: { color: 'text-blue-500', bgColor: 'bg-blue-500', label: '开始处理' },
  submit: { color: 'text-amber-500', bgColor: 'bg-amber-500', label: '提交反馈' },
  approve: { color: 'text-green-500', bgColor: 'bg-green-500', label: '验收通过' },
  reject_acceptance: { color: 'text-red-500', bgColor: 'bg-red-500', label: '验收返工' },
  complete: { color: 'text-emerald-500', bgColor: 'bg-emerald-500', label: '完成' },
  comment: { color: 'text-gray-500', bgColor: 'bg-gray-500', label: '备注' },
  progress: { color: 'text-blue-500', bgColor: 'bg-blue-500', label: '进度更新' },
};

/** 问题状态配色（ProblemFlowRecord 的 from/toStatus 是中文枚举，与任务侧英文枚举不同） */
const PROBLEM_STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  待处理: { bg: 'bg-yellow-100', color: 'text-yellow-700', label: '待处理' },
  处理中: { bg: 'bg-blue-100', color: 'text-blue-700', label: '处理中' },
  待验收: { bg: 'bg-amber-100', color: 'text-amber-700', label: '待验收' },
  已处理: { bg: 'bg-green-100', color: 'text-green-700', label: '已处理' },
  已拒绝: { bg: 'bg-red-100', color: 'text-red-700', label: '已拒绝' },
  已完成: { bg: 'bg-emerald-100', color: 'text-emerald-700', label: '已完成' },
};

interface TaskFlowTimelineProps {
  records: ProblemFlowRecord[];
  showStatusChange?: boolean;
  /** 是否展示反馈数据（照片/GPS/语音等），默认展示 */
  showFeedback?: boolean;
}

export function TaskFlowTimeline({
  records,
  showStatusChange = true,
  showFeedback = true,
}: TaskFlowTimelineProps) {
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

  return (
    <div className="space-y-0">
      <h4 className="text-sm font-semibold text-gray-900 mb-4">流转记录（{records.length}条）</h4>

      <div className="relative">
        {/* 时间线 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {sortedRecords.map((record, index) => {
            const config = ACTION_CONFIG[record.action] || ACTION_CONFIG.comment;
            const isLast = index === sortedRecords.length - 1;
            const fb = record.feedbackData;

            return (
              <div key={record.id} className="relative flex gap-4 pl-10">
                {/* 数字序号节点（与 TaskRecordTimeline 一致） */}
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium z-10 ${config.bgColor}`}
                >
                  {index + 1}
                </div>

                <div className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-gray-100'}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium text-gray-900">
                      {record.operatorName || '-'}
                    </span>

                    <span className="text-gray-300 select-none">|</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${config.bgColor.replace('-500', '-100')} ${config.color.replace('-500', '-700')}`}>
                      {config.label}
                    </span>

                    {/* 状态变化 —— 2026-10-21：状态未变时不渲染（避免「处理中 → 处理中」这类噪音） */}
                    {showStatusChange && (record.fromStatus || record.toStatus) && record.fromStatus !== record.toStatus && (
                      <>
                        <span className="text-gray-300 select-none">|</span>
                        <span className="flex items-center gap-1">
                          {record.fromStatus && (
                            <span className={`px-2 py-0.5 text-xs rounded ${PROBLEM_STATUS_CONFIG[record.fromStatus]?.bg || 'bg-gray-100'} ${PROBLEM_STATUS_CONFIG[record.fromStatus]?.color || 'text-gray-600'}`}>
                              {PROBLEM_STATUS_CONFIG[record.fromStatus]?.label || record.fromStatus}
                            </span>
                          )}
                          <span className="text-gray-400">→</span>
                          {record.toStatus && (
                            <span className={`px-2 py-0.5 text-xs rounded ${PROBLEM_STATUS_CONFIG[record.toStatus]?.bg || 'bg-gray-100'} ${PROBLEM_STATUS_CONFIG[record.toStatus]?.color || 'text-gray-600'}`}>
                              {PROBLEM_STATUS_CONFIG[record.toStatus]?.label || record.toStatus}
                            </span>
                          )}
                        </span>
                      </>
                    )}

                    {/* 进度（来自 feedbackData.progress） */}
                    {fb?.progress !== undefined && fb.progress !== null && (
                      <>
                        <span className="text-gray-300 select-none">|</span>
                        <span className="flex items-center gap-2">
                          <span className="w-[90px] bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <span
                              className="block h-full bg-blue-500 rounded-full"
                              style={{ width: `${fb.progress}%` }}
                            />
                          </span>
                          <span className="text-xs text-gray-500">{fb.progress}%</span>
                        </span>
                      </>
                    )}

                    {/* 备注 */}
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

                  {/* 反馈数据（照片 / GPS / 语音 / 物资编码）—— 与任务侧反馈区同构 */}
                  {showFeedback && fb && (fb.gpsLocation || (fb.photosBefore && fb.photosBefore.length > 0) || (fb.photosAfter && fb.photosAfter.length > 0) || fb.voiceNote || fb.materialCode) && (
                    <div className="mt-2 space-y-2">
                      {/* GPS 位置 */}
                      {fb.gpsLocation && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1">
                          <MapPin className="w-3 h-3" />
                          <span>位置打卡：</span>
                          <span className="font-mono">
                            {fb.gpsLocation.lat?.toFixed(6)}, {fb.gpsLocation.lng?.toFixed(6)}
                          </span>
                        </div>
                      )}

                      {/* 作业前照片 */}
                      {fb.photosBefore && fb.photosBefore.length > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                          <div className="flex items-center gap-1 mb-1">
                            <Image className="w-3 h-3" />
                            <span>作业前照片：{fb.photosBefore.length}张</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {fb.photosBefore.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`作业前${idx + 1}`}
                                className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(img, '_blank')}
                                title="点击查看原图"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 作业后照片 */}
                      {fb.photosAfter && fb.photosAfter.length > 0 && (
                        <div className="text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                          <div className="flex items-center gap-1 mb-1">
                            <Image className="w-3 h-3" />
                            <span>作业后照片：{fb.photosAfter.length}张</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {fb.photosAfter.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`作业后${idx + 1}`}
                                className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(img, '_blank')}
                                title="点击查看原图"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 语音备注 */}
                      {fb.voiceNote && (
                        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                          <Mic className="w-3 h-3" />
                          <span>语音备注</span>
                        </div>
                      )}

                      {/* 物资编码 */}
                      {fb.materialCode && (
                        <div className="text-xs text-cyan-600 bg-cyan-50 rounded px-2 py-1">
                          <span>🔗</span>
                          <span>物资编码：</span>
                          <span className="font-mono">{fb.materialCode}</span>
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
