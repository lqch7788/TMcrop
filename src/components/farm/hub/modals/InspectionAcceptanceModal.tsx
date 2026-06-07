/**
 * 巡查问题验收弹窗组件
 * 功能：查看问题处理流转记录、通过验收、驳回返工
 * 样式与农事任务验收弹窗 TaskAcceptanceModal 保持一致
 */

import { useState } from 'react';
import { Button } from '@/components/ui';
import { AlertTriangle, Clock, User, Camera, MapPin, Mic, FileText } from 'lucide-react';
import type { ProblemFlowRecord } from '../../../../hooks/useProblemDispatch';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface InspectionAcceptanceModalProps {
  isOpen: boolean;
  problem: any;  // 问题数据
  records: ProblemFlowRecord[];  // 流转记录
  isLoadingRecords?: boolean;
  onAccept: (comments?: string) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}

// 动作配置
const INSPECTION_ACTION_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  report: { bg: 'bg-purple-100', color: 'text-purple-700', label: '上报问题' },
  dispatch: { bg: 'bg-blue-100', color: 'text-blue-700', label: '分派任务' },
  accept: { bg: 'bg-blue-100', color: 'text-blue-700', label: '接单' },
  reject: { bg: 'bg-red-100', color: 'text-red-700', label: '拒绝任务' },
  start: { bg: 'bg-blue-100', color: 'text-blue-700', label: '开始处理' },
  submit: { bg: 'bg-amber-100', color: 'text-amber-700', label: '提交反馈' },
  approve: { bg: 'bg-green-100', color: 'text-green-700', label: '验收通过' },
  reject_acceptance: { bg: 'bg-red-100', color: 'text-red-700', label: '验收返工' },
  complete: { bg: 'bg-emerald-100', color: 'text-emerald-700', label: '完成' },
  comment: { bg: 'bg-gray-100', color: 'text-gray-700', label: '添加备注' },
  progress: { bg: 'bg-blue-100', color: 'text-blue-700', label: '进度更新' },
};

// 状态配置
const INSPECTION_STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  待处理: { bg: 'bg-yellow-100', color: 'text-yellow-700', label: '待处理' },
  处理中: { bg: 'bg-blue-100', color: 'text-blue-700', label: '处理中' },
  待验收: { bg: 'bg-amber-100', color: 'text-amber-700', label: '待验收' },
  已处理: { bg: 'bg-green-100', color: 'text-green-700', label: '已处理' },
  已拒绝: { bg: 'bg-red-100', color: 'text-red-700', label: '已拒绝' },
  已完成: { bg: 'bg-emerald-100', color: 'text-emerald-700', label: '已完成' },
};

export function InspectionAcceptanceModal({
  isOpen,
  problem,
  records,
  isLoadingRecords = false,
  onAccept,
  onReject,
  onClose,
}: InspectionAcceptanceModalProps) {
  const [mode, setMode] = useState<'confirm' | 'reject'>('confirm');
  const [remarks, setRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  if (!isOpen || !problem) return null;

  // 防御性处理：过滤无效日期记录
  const validRecords = records.filter(r => r.actionTime && !isNaN(new Date(r.actionTime).getTime()));

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

  // 解析反馈数据（兼容字符串和对象，并规范化嵌套的 workloadConfirm）
  const parseFeedback = (feedback: any): any => {
    if (!feedback) return null;
    let parsed = feedback;
    if (typeof feedback === 'string') {
      try {
        parsed = JSON.parse(feedback);
      } catch {
        return null;
      }
    }
    if (typeof parsed !== 'object') return null;
    // 规范化 workloadConfirm 嵌套结构（后端返回的是嵌套结构）
    if (parsed.workloadConfirm && typeof parsed.workloadConfirm === 'object') {
      parsed.workloadDays = parsed.workloadConfirm.days ?? parsed.workloadDays;
      parsed.workloadHours = parsed.workloadConfirm.hours ?? parsed.workloadHours;
      parsed.workers = parsed.workloadConfirm.workers ?? parsed.workers;
    }
    return parsed;
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

  // 获取问题类型标签
  const getProblemTypeLabel = () => {
    const sourceModule = problem.sourceModule;
    switch (sourceModule) {
      case 'inspection':
        return '巡查问题';
      case 'tempTask':
        return '临时任务问题';
      case 'farmTask':
        return '农事任务问题';
      default:
        return '问题';
    }
  };

  // 获取问题状态标签
  const getProblemStatusBadge = (status: string) => {
    const config = INSPECTION_STATUS_CONFIG[status];
    if (!config) {
      return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{status}</span>;
    }
    return (
      <span className={`px-2 py-0.5 ${config.bg} ${config.color} text-xs rounded`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 顶部标题栏 - 绿色底色 */}
          <div className="flex items-center justify-between px-6 py-4 bg-emerald-500 flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">
              问题验收 - {problem.problemCode || problem.problem_code}
            </h2>
            <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-emerald-600">
              ×
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 问题基本信息 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{problem.issueText || problem.remarks || '问题处理'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">问题类型</span>
                  <p className="font-medium">{getProblemTypeLabel()}</p>
                </div>
                <div>
                  <span className="text-gray-500">处理人</span>
                  <p className="font-medium">{problem.handler || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500">问题状态</span>
                  <p className="font-medium">{getProblemStatusBadge(problem.status)}</p>
                </div>
                <div>
                  <span className="text-gray-500">返工次数</span>
                  <p className="font-medium">{(problem.reworkCount || 0)}次</p>
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
                    const actionConfig = INSPECTION_ACTION_CONFIG[record.action] || { bg: 'bg-gray-100', color: 'text-gray-700', label: record.action || record.actionName };
                    const statusConfig = INSPECTION_STATUS_CONFIG[record.toStatus] || { bg: 'bg-gray-100', color: 'text-gray-700', label: record.toStatus };
                    const isLatest = index === 0;
                    const feedbackData = parseFeedback(record.feedbackData);

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
                                className={`px-2 py-0.5 rounded text-xs font-medium ${actionConfig.bg} ${actionConfig.color}`}
                              >
                                {actionConfig.label}
                              </span>
                              {record.fromStatus && (
                                <>
                                  <span className="text-gray-400 text-xs">→</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                                  >
                                    {statusConfig.label}
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
                          {record.progress !== undefined && record.progress !== null && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <FileText className="w-3 h-3" />
                              <span>进度：{record.progress}%</span>
                            </div>
                          )}

                          {/* 反馈内容 */}
                          {feedbackData && (
                            <div className="mt-3 space-y-2">
                              {/* GPS位置 */}
                              {feedbackData.gpsLocation && (
                                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded p-2">
                                  <MapPin className="w-3 h-3" />
                                  <span>
                                    GPS: {feedbackData.gpsLocation.lat?.toFixed(6) || '-'},{' '}
                                    {feedbackData.gpsLocation.lng?.toFixed(6) || '-'}
                                  </span>
                                </div>
                              )}

                              {/* 作业前照片 */}
                              {feedbackData.photosBefore && feedbackData.photosBefore.length > 0 && (
                                <div className="text-sm text-blue-600 bg-blue-50 rounded p-2">
                                  <span className="flex items-center gap-1 mb-1">
                                    <Camera className="w-3 h-3" />
                                    <span>作业前照片：{feedbackData.photosBefore.length}张</span>
                                  </span>
                                  <div className="flex gap-1 flex-wrap">
                                    {feedbackData.photosBefore.map((img: string, i: number) => (
                                      <div
                                        key={i}
                                        className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center"
                                      >
                                        <Camera className="w-5 h-5 text-gray-400" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 作业后照片 */}
                              {feedbackData.photosAfter && feedbackData.photosAfter.length > 0 && (
                                <div className="text-sm text-orange-600 bg-orange-50 rounded p-2">
                                  <span className="flex items-center gap-1 mb-1">
                                    <Camera className="w-3 h-3" />
                                    <span>作业后照片：{feedbackData.photosAfter.length}张</span>
                                  </span>
                                  <div className="flex gap-1 flex-wrap">
                                    {feedbackData.photosAfter.map((img: string, i: number) => (
                                      <div
                                        key={i}
                                        className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center"
                                      >
                                        <Camera className="w-5 h-5 text-gray-400" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 物资编码 */}
                              {feedbackData.materialCode && (
                                <div className="text-sm text-purple-600 bg-purple-50 rounded p-2">
                                  <span className="font-medium">物资编码：</span>
                                  <span className="font-mono">{feedbackData.materialCode}</span>
                                </div>
                              )}

                              {/* 语音备注 */}
                              {feedbackData.voiceNote && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-2">
                                  <Mic className="w-3 h-3" />
                                  <span>语音备注</span>
                                </div>
                              )}

                              {/* 工作量 */}
                              {(feedbackData.workloadDays !== undefined || feedbackData.workloadHours !== undefined || feedbackData.workers !== undefined) && (
                                <div className="text-sm text-cyan-600 bg-cyan-50 rounded p-2">
                                  <span className="font-medium">工作量：</span>
                                  {feedbackData.workloadDays !== undefined && <span>{feedbackData.workloadDays}天</span>}
                                  {feedbackData.workloadDays !== undefined && feedbackData.workloadHours !== undefined && <span> + </span>}
                                  {feedbackData.workloadHours !== undefined && <span>{feedbackData.workloadHours}小时</span>}
                                  {feedbackData.workers !== undefined && <span>，{feedbackData.workers}人</span>}
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

            {/* 验收操作区 - 与农事任务验收弹窗一致的 Tab 切换布局 */}
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
                    {mode === 'confirm' ? '确认验收通过后，问题将标记为已处理' : '驳回后问题将返回给处理人重新处理'}
                  </p>
                  <p className="text-sm mt-1 opacity-80">
                    {mode === 'confirm' ? '此操作不可撤销' : '请填写具体的驳回原因'}
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={handleClose}>
                  取消
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
