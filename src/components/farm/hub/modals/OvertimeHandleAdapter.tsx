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

  // 构造超时信息（实际应从 useTasks 获取）
  const mockTimeout: TaskTimeout = {
    id: 'timeout-1',
    taskId: localTask?.id || '',
    type: localTask?.status === 'accepted' ? 'accept' : 'execution',
    startedAt: new Date().getTime() - 3600000,
    severity: 'critical',
  };

  const handleContinue = (reason: string, newDeadline: string) => {
    if (localTask) {
      console.log('[OvertimeHandleAdapter] 继续执行:', { task: localTask, reason, newDeadline });
      // 调用 useTasks 的 handleOvertime 处理继续执行
      tasksHook.handleOvertime(localTask.id, 'continue', { reason, newDeadline });
      onContinue(localTask.id, reason, newDeadline);
    }
  };

  const handleAbandon = (reason: string) => {
    if (localTask) {
      console.log('[OvertimeHandleAdapter] 放弃执行:', { task: localTask, reason });
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
