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
  Edit,
} from 'lucide-react';
import { TASK_STATUS_CONFIG } from '../../hooks/useTasks';
import { PRIORITY_MAP } from '../farm/taskDispatch/constants/taskDispatchConstants';
import { resolveTaskTypeLabel } from '../../types/farm/common';
import type { TaskRecord, TaskStatus } from '../../types/task';

/**
 * 把流转记录 changeDiff 里的原始枚举值翻成中文（2026-10-24）
 *
 * 后端写记录时存的是 DB 原值：status 存 'pending'/'accepted'，priority 存
 * 'normal'/'high'。原实现直接渲染，详情弹窗的「本次变更」会露出英文
 * （实测：「状态：pending→accepted」「优先级：normal→high」）。
 */
function translateDiffValue(column: string, value: string): string {
  if (!value) return '';
  if (column === 'status') return TASK_STATUS_CONFIG[value as TaskStatus]?.label || value;
  if (column === 'priority') return PRIORITY_MAP[value]?.label || value;
  if (column === 'task_type') return resolveTaskTypeLabel(value);
  return value;
}

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
  // 2026-10-21（追溯增强 第二批）：编辑类操作 —— 此前 PUT /:id 完全不写记录
  update: { icon: Edit, color: 'text-amber-500', bgColor: 'bg-amber-500', label: '修改任务' },
  status_change: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500', label: '状态变更' },
  batch_update: { icon: Edit, color: 'text-amber-500', bgColor: 'bg-amber-500', label: '批量修改' },
};

interface TaskRecordTimelineProps {
  records: TaskRecord[];
  showStatusChange?: boolean;
  showFeedback?: boolean;
  /** 2026-10-21：任务截止日期（YYYY-MM-DD 或 ISO）。传入后可为逾期操作打标记 */
  taskDueDate?: string;
  /** 2026-10-21：任务当前执行人。与记录里的执行人快照不一致时提示"任务已重派" */
  currentAssigneeName?: string;
}

export function TaskRecordTimeline({
  records,
  showStatusChange = true,
  showFeedback = true,
  taskDueDate,
  currentAssigneeName,
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

  /**
   * 2026-10-21：格式化"距上一次操作的间隔"。
   * 用于识别流程卡点 —— 例如"接单后隔了 3 天才开始执行"。
   * < 1 分钟不显示（避免噪音）。
   */
  const formatGap = (prevIso: string | undefined, currIso: string): string | null => {
    if (!prevIso) return null;
    const diffMs = new Date(currIso).getTime() - new Date(prevIso).getTime();
    if (!Number.isFinite(diffMs) || diffMs < 60_000) return null;
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 60) return `${mins}分钟`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时${mins % 60 ? `${mins % 60}分` : ''}`;
    const days = Math.floor(hours / 24);
    return `${days}天${hours % 24 ? `${hours % 24}小时` : ''}`;
  };

  /**
   * 2026-10-21：判断该条操作是否发生在任务截止日期之后（逾期操作）。
   *
   * 时区注意：`new Date('2026-10-19')` 会按 **UTC** 解析为当日 00:00，
   * 而操作时间是带 Z 的 UTC ISO 串。若直接 +24h，截止点会变成 UTC 23:59:59，
   * 比本地（UTC+8）当天末晚 8 小时 —— 凌晨 0~8 点的逾期操作会被漏判。
   * 故对纯日期串显式按本地时区拼上 23:59:59.999。
   */
  const isOverdueAction = (actionTime: string): boolean => {
    if (!taskDueDate) return false;
    const due = /^\d{4}-\d{2}-\d{2}$/.test(taskDueDate)
      ? new Date(`${taskDueDate}T23:59:59.999`).getTime()
      : new Date(taskDueDate).getTime();
    const at = new Date(actionTime).getTime();
    if (!Number.isFinite(due) || !Number.isFinite(at)) return false;
    return at > due;
  };

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

                    {/* 状态变化 —— 2026-10-21：状态未变时不渲染（此前更新类记录会显示
                        「待接受 → 待接受」这种无意义信息） */}
                    {showStatusChange && (record.fromStatus || record.toStatus) && record.fromStatus !== record.toStatus && (
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

                    {/* 2026-10-21：逾期操作标记（操作时间晚于任务截止日期） */}
                    {isOverdueAction(record.actionTime) && (
                      <>
                        <span className="text-gray-300 select-none">|</span>
                        <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 font-medium whitespace-nowrap">
                          逾期操作
                        </span>
                      </>
                    )}

                    {/* 2026-10-21：距上一次操作的间隔（识别流程卡点） */}
                    {(() => {
                      const gap = index > 0 ? formatGap(sortedRecords[index - 1].actionTime, record.actionTime) : null;
                      return gap ? (
                        <>
                          <span className="text-gray-300 select-none">|</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap">距上次 {gap}</span>
                        </>
                      ) : null;
                    })()}

                    <span className="text-gray-300 select-none">|</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTime(record.actionTime)}
                    </span>
                  </div>

                  {/* 2026-10-21（追溯增强 第二批）：字段级变更差异 —— 回答"这次操作改了什么" */}
                  {record.changeDiff && !Array.isArray(record.changeDiff) && Object.keys(record.changeDiff).length > 0 && (
                    <div className="mt-2 rounded bg-amber-50 border border-amber-200 px-2 py-1">
                      <div className="text-xs font-medium text-amber-700 mb-1">本次变更</div>
                      <div className="space-y-0.5">
                        {Object.entries(record.changeDiff).map(([col, d]) => (
                          <div key={col} className="text-xs text-gray-700 break-all">
                            <span className="text-gray-500">{d.label || col}：</span>
                            {/* 2026-10-24：from/to 是 DB 原值（pending/normal…），必须翻译成中文 */}
                            <span className="text-gray-500 line-through">{translateDiffValue(col, d.from) || '（空）'}</span>
                            <span className="text-gray-400 mx-1">→</span>
                            <span className="font-medium text-gray-900">{translateDiffValue(col, d.to) || '（空）'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2026-10-21（追溯增强 第二批）：关联单据快照 */}
                  {record.linkedDocuments && record.linkedDocuments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {record.linkedDocuments.map((doc, i) => (
                        <span
                          key={`${doc.type}-${doc.code}-${i}`}
                          className="px-2 py-0.5 text-xs rounded bg-cyan-50 text-cyan-700 border border-cyan-200"
                          title={doc.label || doc.type}
                        >
                          {doc.label || doc.type}：{doc.code}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 2026-10-21：操作时的执行人快照（与当前执行人不同时高亮，提示任务已重派） */}
                  {record.assigneeNameAtAction && record.assigneeNameAtAction !== currentAssigneeName && currentAssigneeName && (
                    <div className="mt-1 text-xs text-gray-400">
                      操作时执行人：<span className="text-gray-600">{record.assigneeNameAtAction}</span>
                      <span className="mx-1">·</span>
                      现执行人：<span className="text-gray-600">{currentAssigneeName}</span>
                    </div>
                  )}

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
