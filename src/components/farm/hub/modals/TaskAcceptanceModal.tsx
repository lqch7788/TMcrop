/**
 * 任务验收弹窗组件
 * 功能：查看任务操作记录、通过验收、驳回返工
 */

import { useState } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button, Label } from '@/components/ui';
import { TextArea } from '../../../ui/TextArea';
import { CheckCircle, XCircle, Clock, User, MapPin, Camera, Mic, FileText } from 'lucide-react';
import { Task, TaskRecord, TASK_ACTION_CONFIG, TASK_STATUS_CONFIG } from '../../../../types/task';

interface TaskAcceptanceModalProps {
  isOpen: boolean;
  task: Task | null;
  taskRecords: TaskRecord[];
  onAccept: (comments?: string) => void;
  onReject: (reason: string) => void;
  onClose: () => void;
}

export function TaskAcceptanceModal({
  isOpen,
  task,
  taskRecords,
  onAccept,
  onReject,
  onClose,
}: TaskAcceptanceModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [acceptComments, setAcceptComments] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!task) return null;

  // 按时间倒序排列记录
  const sortedRecords = [...taskRecords].sort(
    (a, b) => new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime()
  );

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(rejectReason);
      setRejectReason('');
      setShowRejectForm(false);
    }
  };

  const handleAccept = () => {
    onAccept(acceptComments || undefined);
    setAcceptComments('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`任务验收 - ${task.taskCode}`}
      size="xl"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* 任务基本信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">{task.title}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-gray-500">执行人</Label>
              <p className="font-medium">{task.assigneeName}</p>
            </div>
            <div>
              <Label className="text-gray-500">任务类型</Label>
              <p className="font-medium">{task.typeName}</p>
            </div>
            <div>
              <Label className="text-gray-500">当前进度</Label>
              <p className="font-medium">{task.progress}%</p>
            </div>
            <div>
              <Label className="text-gray-500">返工次数</Label>
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
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {sortedRecords.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">暂无操作记录</p>
            ) : (
              sortedRecords.map((record, index) => {
                const actionConfig = TASK_ACTION_CONFIG[record.action];
                const statusConfig = TASK_STATUS_CONFIG[record.toStatus];
                const isLatest = index === 0;

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
                          {new Date(record.actionTime).toLocaleString('zh-CN')}
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
                                  className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center"
                                >
                                  <Camera className="w-6 h-6 text-gray-400" />
                                </div>
                              ))}
                            </div>
                          )}
                          {record.feedback.gpsLocation && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span>
                                GPS: {record.feedback.gpsLocation.lat.toFixed(4)},{' '}
                                {record.feedback.gpsLocation.lng.toFixed(4)}
                              </span>
                            </div>
                          )}
                          {record.feedback.voiceNote && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mic className="w-3 h-3" />
                              <span>语音备注</span>
                            </div>
                          )}
                          {record.feedback.materials && record.feedback.materials.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">物料：</span>
                              {record.feedback.materials.map((m, i) => (
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
        <div className="border-t border-gray-200 pt-4">
          {!showRejectForm ? (
            <div className="flex gap-3 justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRejectForm(true)}
                className="bg-red-50 text-red-600 hover:bg-red-100"
              >
                <XCircle className="w-4 h-4" />
                驳回
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAccept}
              >
                <CheckCircle className="w-4 h-4" />
                通过验收
              </Button>
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-4">
              <h5 className="font-medium text-red-700 mb-3">驳回原因（必填）</h5>
              <TextArea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入驳回原因，说明需要返工的具体问题..."
                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
                rows={3}
              />
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectReason('');
                  }}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                >
                  确认驳回
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
