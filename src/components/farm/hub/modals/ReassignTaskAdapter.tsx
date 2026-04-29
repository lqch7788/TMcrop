/**
 * 重新派发任务弹窗适配器
 * 将 Task 对象转换为 ReassignTaskModal 所需的接口
 */

import React, { useState } from 'react';
import { ReassignTaskModal } from './ReassignTaskModal';
import { Task } from '../../../../types/task';
import { useTasks } from '../../../../hooks/useTasks';

interface ReassignTaskAdapterProps {
  task: Task | null;
  onClose: () => void;
  onConfirmed: () => void;
}

export function ReassignTaskAdapter({ task, onClose, onConfirmed }: ReassignTaskAdapterProps) {
  const tasksHook = useTasks();
  const [localTask, setLocalTask] = useState<Task | null>(task);

  const handleConfirm = (newAssigneeId: string, newAssigneeName: string) => {
    if (!localTask) return;
    tasksHook.reassignTask(localTask.id, newAssigneeId, newAssigneeName);
    onConfirmed();
  };

  if (!localTask) return null;

  return (
    <ReassignTaskModal
      isOpen={true}
      task={localTask}
      onConfirm={handleConfirm}
      onClose={onClose}
    />
  );
}
