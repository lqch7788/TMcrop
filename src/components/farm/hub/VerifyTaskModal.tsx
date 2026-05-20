/**
 * 农事任务中心 - 验收弹窗
 * 样式与现有弹窗统一
 */

import React, { useState, useEffect } from 'react';
import { Task } from '../../../hooks/useTasks';
import { useFarmTaskStore } from '@/stores';
import { X } from 'lucide-react';
import { Button, Label } from '@/components/ui';
import { Input } from '../../ui/input';
import { TextArea } from '../../ui/TextArea';

interface TaskRecord {
  id: string;
  taskId?: string;
  actionTime: string;
  operatorName: string;
  action: string;
  content: string;
  progress?: number;
}

interface VerifyTaskModalProps {
  taskId: string;
  onClose: () => void;
  onVerified: () => void;
  // V2.0: 任务数据从外部传入（避免直接读 localStorage）
  tasks?: any[];
  getTaskRecordsByTaskId?: (taskId: string) => TaskRecord[];
  // 验收回调
  onAcceptCompletion?: (taskId: string, feedback: string) => void;
  onRejectForRework?: (taskId: string, feedback: string) => void;
}

export function VerifyTaskModal({ taskId, onClose, onVerified, tasks, getTaskRecordsByTaskId, onAcceptCompletion, onRejectForRework }: VerifyTaskModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [records, setRecords] = useState<TaskRecord[]>([]);
  const [verifyResult, setVerifyResult] = useState<'pass' | 'reject' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      // 加载任务数据（优先从外部传入的 tasks，否则从 FarmTaskStore）
      const foundTask = (tasks || useFarmTaskStore.getState().tasks).find((t: any) => t.id === taskId);
      if (foundTask) setTask(foundTask as Task);

      // V2.0: 从外部传入的方法获取记录（替代 localStorage）
      if (getTaskRecordsByTaskId) {
        setRecords(getTaskRecordsByTaskId(taskId));
      }
    } catch (error) {
      // 加载数据失败，无需额外处理
    }
  }, [taskId, tasks, getTaskRecordsByTaskId]);

  const handleSubmit = async () => {
    if (!task || !verifyResult) return;
    setIsSubmitting(true);
    try {
      // V2.0: 通过回调函数处理验收逻辑（替代直接的 localStorage 读写）
      if (verifyResult === 'pass') {
        if (onAcceptCompletion) {
          onAcceptCompletion(taskId, feedback);
        } else {
          await useFarmTaskStore.getState().updateTask(taskId, {
            status: 'completed' as any,
            completedAt: new Date().toISOString(),
            verifyFeedback: feedback,
          } as any);
        }
      } else {
        if (onRejectForRework) {
          onRejectForRework(taskId, feedback);
        } else {
          await useFarmTaskStore.getState().updateTask(taskId, {
            status: 'in_progress' as any,
            verifyFeedback: feedback,
          } as any);
        }
      }

      onVerified();
    } catch (error) {
      // 提交验收失败
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl p-8">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 flex-shrink-0 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">任务验收</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 验收信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">验收信息</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">任务编号:</span>
                <span className="ml-2 text-gray-900">{task.taskCode}</span>
              </div>
              <div>
                <span className="text-gray-500">任务标题:</span>
                <span className="ml-2 text-gray-900">{task.title}</span>
              </div>
              <div>
                <span className="text-gray-500">执行人:</span>
                <span className="ml-2 text-gray-900">{task.assigneeName || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">执行进度:</span>
                <span className="ml-2 text-gray-900">{task.progress || 0}%</span>
              </div>
            </div>
          </div>

          {/* 执行反馈摘要 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">执行反馈摘要</h4>
            <div className="space-y-2 text-sm">
              {records.filter(r => r.action === 'progress').slice(0, 3).map((record) => (
                <div key={record.id} className="flex items-start gap-2">
                  <span className="text-gray-400 whitespace-nowrap">
                    {new Date(record.actionTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-gray-600">{record.content}</span>
                </div>
              ))}
              {records.filter(r => r.action === 'progress').length === 0 && (
                <p className="text-gray-400">暂无执行反馈记录</p>
              )}
            </div>
            {task.feedback && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">{task.feedback}</p>
              </div>
            )}
          </div>

          {/* 验收结果 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">验收结果</h4>
            <div className="space-y-3">
              <Label className="flex items-center gap-3 cursor-pointer">
                <Input
                  type="radio"
                  name="verifyResult"
                  value="pass"
                  checked={verifyResult === 'pass'}
                  onChange={() => setVerifyResult('pass')}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-sm text-gray-700">验收通过</span>
              </Label>
              <Label className="flex items-center gap-3 cursor-pointer">
                <Input
                  type="radio"
                  name="verifyResult"
                  value="reject"
                  checked={verifyResult === 'reject'}
                  onChange={() => setVerifyResult('reject')}
                  className="w-4 h-4 text-red-600"
                />
                <span className="text-sm text-gray-700">验收驳回（需返工）</span>
              </Label>
            </div>
          </div>

          {/* 验收意见 */}
          {verifyResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                验收意见 {verifyResult === 'reject' && <span className="text-red-500">*</span>}
              </h4>
              <TextArea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={verifyResult === 'pass' ? '选填：可添加验收备注' : '请输入驳回原因...'}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            variant={verifyResult === 'pass' ? 'default' : 'destructive'}
            onClick={handleSubmit}
            disabled={!verifyResult || (verifyResult === 'reject' && !feedback.trim()) || isSubmitting}
          >
            {isSubmitting ? '提交中...' : verifyResult === 'pass' ? '验收通过' : '驳回'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VerifyTaskModal;
