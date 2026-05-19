/**
 * 撤回/取消弹窗组件
 * 功能：管理员撤回待接受任务或取消进行中任务
 */

import { useState } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '@/components/ui/button';
import { RotateCcw, XCircle, AlertTriangle } from 'lucide-react';
import { Task } from '../../../../types/task';

type WithdrawCancelType = 'withdraw' | 'cancel';

interface WithdrawCancelModalProps {
  isOpen: boolean;
  task: Task | null;
  type: WithdrawCancelType;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function WithdrawCancelModal({
  isOpen,
  task,
  type,
  onConfirm,
  onClose,
}: WithdrawCancelModalProps) {
  const [reason, setReason] = useState('');

  if (!task) return null;

  const isWithdraw = type === 'withdraw';
  const title = isWithdraw ? '撤回任务' : '取消任务';
  const Icon = isWithdraw ? RotateCcw : XCircle;
  const colorClass = isWithdraw ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50';
  const buttonClass = isWithdraw ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600';

  const getStatusLabel = () => {
    if (isWithdraw) return '待接受';
    return task.status === 'accepted' ? '已接受' : '处理中';
  };

  const handleSubmit = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-5">
        {/* 警示信息 */}
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${colorClass} border-opacity-20`}>
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              {isWithdraw ? '撤回后将取消该任务的派发，执行人将无法再接受此任务' : '取消后任务将终止，执行人将无法继续执行'}
            </p>
            <p className="text-sm mt-1 opacity-80">
              此操作需要填写原因
            </p>
          </div>
        </div>

        {/* 任务信息 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="font-medium text-gray-900">{task.title}</p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-500">
            <p>任务编号：{task.taskCode}</p>
            <p>执行人：{task.assigneeName}</p>
            <p>当前状态：{getStatusLabel()}</p>
            <p>派发人：{task.assignerName}</p>
          </div>
        </div>

        {/* 操作说明 */}
        <div className={`p-3 rounded-lg ${isWithdraw ? 'bg-blue-50' : 'bg-red-50'}`}>
          <p className="text-sm font-medium mb-1">
            {isWithdraw ? '撤回操作' : '取消操作'}适用于：
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            {isWithdraw ? (
              <>
                <li>任务派发错误，需要重新派发</li>
                <li>任务内容有误，需要修改后重新派发</li>
                <li>执行人不可用，需要更换执行人</li>
              </>
            ) : (
              <>
                <li>任务因外部原因无法继续执行</li>
                <li>任务目标已达成，无需继续执行</li>
                <li>紧急情况需要终止任务</li>
              </>
            )}
          </ul>
        </div>

        {/* 原因输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            操作原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`请输入${isWithdraw ? '撤回' : '取消'}原因...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setReason('');
              onClose();
            }}
          >
            取消
          </Button>
          <Button
            variant={isWithdraw ? 'blue' : 'destructive'}
            size="sm"
            onClick={handleSubmit}
            disabled={!reason.trim()}
          >
            确认{title}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
