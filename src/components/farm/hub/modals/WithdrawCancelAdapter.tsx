/**
 * 撤回/取消任务弹窗适配器
 * 将 Task 对象转换为 WithdrawCancelModal 所需的接口
 */

import React, { useState } from 'react';
import { WithdrawCancelModal } from './WithdrawCancelModal';
import { Task } from '../../../../types/task';
import { useTasks } from '../../../../hooks/useTasks';

interface WithdrawCancelAdapterProps {
  task: Task | null;
  onClose: () => void;
  onConfirmed: () => void;
}

export function WithdrawCancelAdapter({ task, onClose, onConfirmed }: WithdrawCancelAdapterProps) {
  const tasksHook = useTasks();
  const [localTask, setLocalTask] = useState<Task | null>(task);

  // 根据任务状态决定是撤回还是取消
  const type = localTask?.status === 'pending' ? 'withdraw' : 'cancel';

  const handleConfirm = (reason: string) => {
    if (!localTask) return;
    if (type === 'withdraw') {
      tasksHook.withdrawTask(localTask.id, reason);
    } else {
      tasksHook.cancelTask(localTask.id, reason);
    }
    onConfirmed();
  };

  if (!localTask) return null;

  return (
    <WithdrawCancelModal
      isOpen={true}
      task={localTask}
      type={type}
      onConfirm={handleConfirm}
      onClose={onClose}
    />
  );
}
