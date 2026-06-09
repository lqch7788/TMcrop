/**
 * 临时任务验收确认弹窗组件
 * 功能：查看任务操作记录、通过验收、驳回返工
 * 与农事任务验收弹窗保持一致的 UI/UX
 */

import { useState } from 'react';
import { Button } from '@/components/ui';
import { AlertTriangle, Camera, Clock, FileText, MapPin, Mic, User, X } from 'lucide-react';

// 操作类型配置
const TEMP_TASK_ACTION_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  create: { bg: 'bg-blue-100', color: 'text-blue-700', label: '创建任务' },
  accept: { bg: 'bg-blue-100', color: 'text-blue-700', label: '接受任务' },
  progress: { bg: 'bg-blue-100', color: 'text-blue-700', label: '进度更新' },
  submit_progress: { bg: 'bg-blue-100', color: 'text-blue-700', label: '提交进度' },
  submit: { bg: 'bg-blue-100', color: 'text-blue-700', label: '提交验收' },
  complete: { bg: 'bg-green-100', color: 'text-green-700', label: '验收通过' },
  reject: { bg: 'bg-red-100', color: 'text-red-700', label: '验收驳回' },
  accept_confirm: { bg: 'bg-green-100', color: 'text-green-700', label: '审核通过' },
  withdraw: { bg: 'bg-gray-100', color: 'text-gray-700', label: '撤回任务' },
  cancel: { bg: 'bg-gray-100', color: 'text-gray-700', label: '取消任务' },
  reassign: { bg: 'bg-orange-100', color: 'text-orange-700', label: '重新派发' },
  overtime_continue: { bg: 'bg-orange-100', color: 'text-orange-700', label: '超时继续' },
  overtime_abandon: { bg: 'bg-red-100', color: 'text-red-700', label: '超时放弃' },
  status_change: { bg: 'bg-purple-100', color: 'text-purple-700', label: '状态变更' },
};

// 状态配置
const TEMP_TASK_STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'bg-gray-100', color: 'text-gray-700', label: '草稿' },
  pending: { bg: 'bg-gray-100', color: 'text-gray-700', label: '待接受' },
  accepted: { bg: 'bg-blue-100', color: 'text-blue-700', label: '已接受' },
  in_progress: { bg: 'bg-blue-100', color: 'text-blue-700', label: '进行中' },
  waiting_acceptance: { bg: 'bg-amber-100', color: 'text-amber-700', label: '待验收' },
  completed: { bg: 'bg-green-100', color: 'text-green-700', label: '已完成' },
  rejected: { bg: 'bg-red-100', color: 'text-red-700', label: '已拒绝' },
  cancelled: { bg: 'bg-gray-100', color: 'text-gray-500', label: '已取消' },
  abandoned: { bg: 'bg-red-50', color: 'text-red-400', label: '已放弃' },
  failed: { bg: 'bg-purple-100', color: 'text-purple-700', label: '任务失败' },
};

interface VerifyTempTaskModalProps {
  isOpen: boolean;
  task: any;
  records?: any[];
  isLoadingRecords?: boolean;
  onConfirm: (remarks?: string) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}

export function VerifyTempTaskModal({
  isOpen,
  task,
  records = [],
  isLoadingRecords = false,
  onConfirm,
  onReject,
  onClose,
}: VerifyTempTaskModalProps) {
  const [mode, setMode] = useState<'confirm' | 'reject'>('confirm');
  const [remarks, setRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  if (!isOpen || !task) return null;

  // 防御性处理：过滤无效日期记录（兼容驼峰和下划线两种字段名）
  const validRecords = records.filter((r: any) => {
    const actionTime = r.actionTime || r.action_time;
    return actionTime && !isNaN(new Date(actionTime).getTime());
  });

  // 按时间倒序排列记录
  const sortedRecords = [...validRecords].sort(
    (a: any, b: any) => {
      const aTime = new Date(a.actionTime || a.action_time).getTime();
      const bTime = new Date(b.actionTime || b.action_time).getTime();
      return bTime - aTime;
    }
  );

  // 安全格式化日期
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString('zh-CN');
    } catch {
      return '-';
    }
  };

  // 解析反馈内容
  const parseFeedback = (feedbackStr: string): any => {
    if (!feedbackStr) return null;
    try {
      return typeof feedbackStr === 'string' ? JSON.parse(feedbackStr) : feedbackStr;
    } catch {
      return null;
    }
  };

  const handleConfirm = () => {
    if (mode === 'confirm') {
      onConfirm(remarks || undefined);
    } else {
      if (!rejectReason.trim()) return;
      onReject(rejectReason);
    }
    setRemarks('');
    setRejectReason('');
    setMode('confirm');
  };

  const handleClose = () => {
    setRemarks('');
    setRejectReason('');
    setMode('confirm');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 bg-emerald-500 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">任务验收 - {task.taskCode}</h2>
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-emerald-600">
              ×
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 任务基本信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{task.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">执行人</span>
                  <p className="font-medium">{task.assigneeName}</p>
                </div>
                <div>
                  <span className="text-gray-500">任务类型</span>
                  <p className="font-medium">{task.tempTaskType || '其他'}</p>
                </div>
                <div>
                  <span className="text-gray-500">当前进度</span>
                  <p className="font-medium">{task.progress || 0}%</p>
                </div>
                <div>
                  <span className="text-gray-500">驳回次数</span>
                  <p className="font-medium">{task.rejectCount || 0}次</p>
                </div>
              </div>
            </div>

            {/* 操作记录时间线 */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                操作记录
              </h4>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {isLoadingRecords ? (
                  <p className="text-gray-500 text-sm text-center py-8">正在加载操作记录...</p>
                ) : sortedRecords.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">暂无操作记录</p>
                ) : (
                  sortedRecords.map((record: any, index: number) => {
                    const actionConfig = TEMP_TASK_ACTION_CONFIG[record.action] || { bg: 'bg-gray-100', color: 'text-gray-700', label: record.actionName || record.action_name || record.action };
                    const statusConfig = TEMP_TASK_STATUS_CONFIG[record.toStatus || record.to_status] || { bg: 'bg-gray-100', color: 'text-gray-700', label: record.toStatus || record.to_status };
                    const isLatest = index === 0;
                    const feedback = parseFeedback(record.feedback);

                    return (
                      <div
                        key={record.id}
                        className={`relative pl-6 pb-4 ${
                          index !== sortedRecords.length - 1 ? 'border-l-2 border-gray-200' : ''
                        }`}
                      >
                        {/* 时间线节点 */}
                        <div
                          className={`absolute left-0 top-0 w-3 h-3 rounded-full -translate-x-[7px] ${
                            isLatest ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        />

                        {/* 记录内容 */}
                        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  actionConfig.bg
                                } ${actionConfig.color}`}
                              >
                                {actionConfig.label}
                              </span>
                              {(record.fromStatus || record.from_status) && (
                                <>
                                  <span className="text-gray-400 text-xs">→</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      statusConfig.bg
                                    } ${statusConfig.color}`}
                                  >
                                    {statusConfig.label}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(record.actionTime || record.action_time)}
                            </span>
                          </div>

                          {/* 操作人 */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <User className="w-3 h-3" />
                            <span>{record.operatorName || record.operator_name || '-'}</span>
                          </div>

                          {/* 进度信息 */}
                          {record.progress !== undefined && record.progress !== null && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <FileText className="w-3 h-3" />
                              <span>进度：{record.progress}%</span>
                            </div>
                          )}

                          {/* 反馈内容 */}
                          {feedback && (
                            <div className="mt-3 space-y-2">
                              {feedback.text && (
                                <div className="bg-blue-50 rounded p-2 text-sm">
                                  <p className="text-gray-700">{feedback.text}</p>
                                </div>
                              )}
                              {feedback.images && feedback.images.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {feedback.images.map((img: string, i: number) => (
                                    <div
                                      key={i}
                                      className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center"
                                    >
                                      <Camera className="w-6 h-6 text-gray-400" />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {feedback.gpsLocation && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-3 h-3" />
                                  <span>
                                    GPS: {feedback.gpsLocation.lat?.toFixed(4) || '-'},{' '}
                                    {feedback.gpsLocation.lng?.toFixed(4) || '-'}
                                  </span>
                                </div>
                              )}
                              {feedback.voiceNote && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mic className="w-3 h-3" />
                                  <span>语音备注</span>
                                </div>
                              )}
                              {feedback.materials && feedback.materials.length > 0 && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">物料：</span>
                                  {feedback.materials.map((m: any, i: number) => (
                                    <span key={i} className="mr-2">
                                      {m.name}×{m.qty}
                                    </span>
                                  ))}
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
                            <p className="mt-2 text-sm text-red-600 bg-red-50 rounded p-2">
                              原因：{record.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 验收操作区 */}
            <div className="border-t border-gray-200 pt-4 space-y-4">
              {/* 模式切换 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('confirm')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    mode === 'confirm'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  验收通过
                </button>
                <button
                  onClick={() => setMode('reject')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    mode === 'reject'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  驳回返工
                </button>
              </div>

              {/* 验收通过：备注（选填） */}
              {mode === 'confirm' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    验收备注 <span className="text-gray-400">(选填)</span>
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="请输入验收备注..."
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows={3}
                  />
                </div>
              )}

              {/* 驳回：原因（必填） */}
              {mode === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    驳回原因 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="请输入驳回原因..."
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                  />
                </div>
              )}

              {/* 警示信息 */}
              <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                mode === 'confirm'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    {mode === 'confirm' ? '确认验收通过后，任务将标记为已完成' : '驳回后任务将返回给执行人重新处理'}
                  </p>
                  <p className="text-sm mt-1 opacity-80">
                    {mode === 'confirm' ? '此操作不可撤销' : '请填写具体的驳回原因'}
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={handleClose}>
                  <X className="w-4 h-4" /> 取消
                </Button>
                <Button
                  variant={mode === 'confirm' ? 'default' : 'destructive'}
                  onClick={handleConfirm}
                  disabled={mode === 'reject' && !rejectReason.trim()}
                >
                  {mode === 'confirm' ? '确认验收通过' : '确认驳回'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
