/**
 * 删除确认弹窗适配器
 * 将任务ID数组转换为 DeleteWarningModal 所需的接口
 */

import React from 'react';
import { DeleteWarningModal } from './DeleteWarningModal';
import { useTasks } from '../../../../hooks/useTasks';

interface DeleteWarningAdapterProps {
  taskIds: string[];
  onClose: () => void;
  onConfirmed: () => void;
}

export function DeleteWarningAdapter({ taskIds, onClose, onConfirmed }: DeleteWarningAdapterProps) {
  const tasksHook = useTasks();

  const handleConfirm = () => {
    taskIds.forEach(id => {
      tasksHook.deleteTask(id);
    });
    onConfirmed();
  };

  return (
    <DeleteWarningModal
      isOpen={true}
      selectedCount={taskIds.length}
      onConfirm={handleConfirm}
      onClose={onClose}
    />
  );
}
