/**
 * 超时处理弹窗组件
 * 功能：执行人超时后选择继续执行或放弃
 */

import { useState } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { AlertTriangle, Clock, PlayCircle, XCircle } from 'lucide-react';
import { Task, TaskTimeout } from '../../../../types/task';
import { DEADLINE_CONFIG } from '../../../../config/taskConfig';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { DatePicker } from '@/components/ui';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface OvertimeHandleModalProps {
  isOpen: boolean;
  task: Task | null;
  timeout: TaskTimeout | null;
  onContinue: (reason: string, newDeadline: string) => void;
  onAbandon: (reason: string) => void;
  onClose: () => void;
}

export function OvertimeHandleModal({
  isOpen,
  task,
  timeout,
  onContinue,
  onAbandon,
  onClose,
}: OvertimeHandleModalProps) {
  const [handleType, setHandleType] = useState<'continue' | 'abandon' | null>(null);
  const [reason, setReason] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  if (!task || !timeout) return null;

  const handleSubmit = () => {
    if (handleType === 'continue') {
      if (reason.trim() && newDeadline) {
        onContinue(reason, newDeadline);
        resetForm();
      }
    } else if (handleType === 'abandon') {
      if (reason.trim()) {
        onAbandon(reason);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setHandleType(null);
    setReason('');
    setNewDeadline('');
  };

  const getTimeoutLabel = () => {
    switch (timeout.type) {
      case 'accept':
        return '接受超时';
      case 'execution':
        return '执行超时';
      case 'acceptance':
        return '验收超时';
      default:
        return '超时';
    }
  };

  const getSeverityColor = () => {
    return timeout.severity === 'critical'
      ? 'text-red-600 bg-red-50 border-red-200'
      : 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const canExtend = task.deadlineExtensions.length < DEADLINE_CONFIG.maxExtensions;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="超时处理"
      size="md"
      showFooter={false}
    >
      <div className="space-y-5">
        {/* 超时警示 */}
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${getSeverityColor()}`}>
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              任务{getTimeoutLabel()}
            </p>
            <p className="text-sm mt-1 opacity-80">
              {timeout.severity === 'critical' ? '已超时，请及时处理' : '即将超时，请注意'}
            </p>
            <p className="text-xs mt-1 opacity-60">
              开始时间：{new Date(timeout.startedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        {/* 任务信息 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="font-medium text-gray-900">{task.title}</p>
          <p className="text-sm text-gray-500 mt-1">
            任务编号：{task.taskCode} · 执行人：{task.assigneeName}
          </p>
          <p className="text-sm text-gray-500">
            原截止日期：{task.dueDate || '未设置'}
          </p>
          <p className="text-sm text-gray-500">
            延期次数：{task.deadlineExtensions.length} / {DEADLINE_CONFIG.maxExtensions}
          </p>
        </div>

        {/* 处理方式选择 */}
        <div>
          <Label className="text-gray-700 mb-2">
            选择处理方式
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setHandleType('continue')}
              variant="outline"
              size="lg"
              className={`p-4 flex-col h-auto ${
                handleType === 'continue'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <PlayCircle className={`w-6 h-6 mx-auto mb-2 ${
                handleType === 'continue' ? 'text-emerald-500' : 'text-gray-400'
              }`} />
              <p className={`font-medium ${
                handleType === 'continue' ? 'text-emerald-700' : 'text-gray-700'
              }`}>
                继续执行
              </p>
              <p className="text-xs text-gray-500 mt-1">
                填写原因并延期
              </p>
            </Button>

            <Button
              onClick={() => setHandleType('abandon')}
              variant="outline"
              size="lg"
              className={`p-4 flex-col h-auto ${
                handleType === 'abandon'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <XCircle className={`w-6 h-6 mx-auto mb-2 ${
                handleType === 'abandon' ? 'text-red-500' : 'text-gray-400'
              }`} />
              <p className={`font-medium ${
                handleType === 'abandon' ? 'text-red-700' : 'text-gray-700'
              }`}>
                放弃执行
              </p>
              <p className="text-xs text-gray-500 mt-1">
                需重新派发
              </p>
            </Button>
          </div>
        </div>

        {/* 继续执行表单 */}
        {handleType === 'continue' && (
          <div className="space-y-3">
            <div>
              <Label className="text-gray-700">
                超时原因 <span className="text-red-500">*</span>
              </Label>
              <TextArea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请说明超时原因..."
                className={deepInputClass}
                rows={2}
              />
            </div>

            <div>
              <Label className="text-gray-700">
                新截止日期 <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                selected={newDeadline ? new Date(newDeadline) : undefined}
                onChange={(date) => setNewDeadline(date.toISOString().split('T')[0])}
                minDate={new Date()}
                className={deepInputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                每次最多延期 {DEADLINE_CONFIG.maxExtensionHours} 小时
              </p>
            </div>

            {!canExtend && (
              <p className="text-sm text-red-600">
                已达最大延期次数（{DEADLINE_CONFIG.maxExtensions}次），无法继续延期
              </p>
            )}
          </div>
        )}

        {/* 放弃执行表单 */}
        {handleType === 'abandon' && (
          <div>
            <Label className="text-gray-700">
              放弃原因 <span className="text-red-500">*</span>
            </Label>
            <TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请说明放弃执行的原因..."
              className={deepInputClass}
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              放弃后任务将变为"已放弃"状态，需要管理员重新派发
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            onClick={() => {
              resetForm();
              onClose();
            }}
            variant="secondary"
            size="sm"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !handleType ||
              !reason.trim() ||
              (handleType === 'continue' && !newDeadline) ||
              (handleType === 'continue' && !canExtend)
            }
            variant={handleType === 'abandon' ? "destructive" : "default"}
            size="sm"
          >
            确认{handleType === 'continue' ? '继续执行' : '放弃执行'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
