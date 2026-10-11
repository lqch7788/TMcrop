/**
 * 超时处理弹窗适配器
 * 将 Task 对象转换为 OvertimeHandleModal 所需的接口
 */

import React, { useState } from 'react';
import { OvertimeHandleModal } from './OvertimeHandleModal';
import { Task, TaskTimeout } from '../../../../types/task';
import { useTasks } from '../../../../hooks/useTasks';

interface OvertimeHandleAdapterProps {
  task: Task | null;
  onClose: () => void;
  onContinue: (taskId: string, reason: string, newDeadline: string) => void;
  onAbandon: (taskId: string, reason: string) => void;
}

export function OvertimeHandleAdapter({
  task,
  onClose,
  onContinue,
  onAbandon
}: OvertimeHandleAdapterProps) {
  const tasksHook = useTasks();
  const [localTask, setLocalTask] = useState<Task | null>(task);

  // 构造超时信息（实际应从 useTasks 获取，但这里基于任务状态推断）
  // 2026-10-11：按 TaskTimeout 真实形状修正 —— startedAt 是字符串（弹窗用 new Date(x).toLocaleString 渲染）、
  //   severity 仅取 warning/critical（原 medium/high 不在类型内）、deadline 为必填。
  const mockTimeout: TaskTimeout = {
    type: localTask?.status === 'accepted' ? 'accept' : 'execution',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    deadline: localTask?.dueDate || '',
    severity: localTask?.priority === 'urgent' ? 'critical' : 'warning',
  };

  const handleContinue = (reason: string, newDeadline: string) => {
    if (localTask) {
      // 调用 useTasks 的 handleOvertime 处理继续执行
      tasksHook.handleOvertime(localTask.id, 'continue', { reason, newDeadline });
      onContinue(localTask.id, reason, newDeadline);
    }
  };

  const handleAbandon = (reason: string) => {
    if (localTask) {
      // 调用 useTasks 的 handleOvertime 处理放弃执行
      tasksHook.handleOvertime(localTask.id, 'abandon', { reason });
      onAbandon(localTask.id, reason);
    }
  };

  if (!localTask) return null;

  return (
    <OvertimeHandleModal
      isOpen={true}
      task={localTask}
      timeout={mockTimeout}
      onContinue={handleContinue}
      onAbandon={handleAbandon}
      onClose={onClose}
    />
  );
}
