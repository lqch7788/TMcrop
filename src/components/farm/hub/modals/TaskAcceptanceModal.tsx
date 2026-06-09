/**
 * 任务验收弹窗组件
 * 功能：查看任务操作记录、通过验收、驳回返工
 * 样式与临时任务验收弹窗 VerifyTempTaskModal 保持一致
 */

import { useState } from 'react';
import { Button } from '@/components/ui';
import { AlertTriangle, Camera, Clock, FileText, MapPin, Mic, User, X } from 'lucide-react';
import { Task, TaskRecord, TASK_ACTION_CONFIG, TASK_STATUS_CONFIG } from '../../../../types/task';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface TaskAcceptanceModalProps {
  isOpen: boolean;
  task: Task | null;
  taskRecords: TaskRecord[];
  isLoadingRecords?: boolean;
  onAccept: (comments?: string) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}

export function TaskAcceptanceModal({
  isOpen,
  task,
  taskRecords,
  isLoadingRecords = false,
  onAccept,
  onReject,
  onClose,
}: TaskAcceptanceModalProps) {
  const [mode, setMode] = useState<'confirm' | 'reject'>('confirm');
  const [remarks, setRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  if (!isOpen || !task) return null;

  // 防御性处理：过滤无效日期记录
  const validRecords = taskRecords.filter(r => r.actionTime && !isNaN(new Date(r.actionTime).getTime()));

  // 按时间倒序排列记录
  const sortedRecords = [...validRecords].sort(
    (a, b) => new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime()
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

  // 解析反馈内容（兼容字符串和已解析的对象）
  const parseFeedback = (feedback: string | object | null | undefined): any => {
    if (!feedback) return null;
    // 如果已经是对象，直接返回
    if (typeof feedback === 'object') return feedback;
    // 如果是字符串，尝试解析为 JSON
    try {
      return JSON.parse(feedback);
    } catch {
      return null;
    }
  };

  const handleConfirm = () => {
    if (mode === 'confirm') {
      onAccept(remarks || undefined);
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
          {/* 顶部标题栏 - 绿色底色 */}
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
                  <p className="font-medium">{task.typeName}</p>
                </div>
                <div>
                  <span className="text-gray-500">当前进度</span>
                  <p className="font-medium">{task.progress}%</p>
                </div>
                <div>
                  <span className="text-gray-500">返工次数</span>
                  <p className="font-medium">{task.reworkCount}次</p>
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
                  sortedRecords.map((record, index) => {
                    const actionConfig = TASK_ACTION_CONFIG[record.action];
                    const statusConfig = TASK_STATUS_CONFIG[record.toStatus];
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
                            <span className="text-xs text-gray-500">
                              {formatDate(record.actionTime)}
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
                                  <span className="text-emerald-600 ml-1">
                                    (+{record.progressIncrement}%)
                                  </span>
                                )}
                              </span>
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
                                  {feedback.materials.map((m: { name: string; qty: number }, i: number) => (
                                    <span key={i} className="mr-2">
                                      {m.name}×{m.qty}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {feedback.materialCode && (
                                <div className="text-sm text-purple-600">
                                  <span className="font-medium">物资编码：</span>
                                  <span className="font-mono">{feedback.materialCode}</span>
                                </div>
                              )}
                              {(feedback.workloadDays !== undefined || feedback.workloadHours !== undefined || feedback.workers !== undefined) && (
                                <div className="text-sm text-cyan-600">
                                  <span className="font-medium">工作量：</span>
                                  {feedback.workloadDays !== undefined && <span>{feedback.workloadDays}天</span>}
                                  {feedback.workloadDays !== undefined && feedback.workloadHours !== undefined && <span> + </span>}
                                  {feedback.workloadHours !== undefined && <span>{feedback.workloadHours}小时</span>}
                                  {feedback.workers !== undefined && <span>，{feedback.workers}人</span>}
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

            {/* 验收操作区 - 与临时任务验收弹窗一致的 Tab 切换布局 */}
            <div className="border-t border-gray-200 pt-4 space-y-4">
              {/* 模式切换 Tab */}
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
                    className={deepInputClass}
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
                    className={deepInputClass}
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
                  onClick={handleConfirm}
                  disabled={mode === 'reject' && !rejectReason.trim()}
                  className={mode === 'confirm' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}
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
