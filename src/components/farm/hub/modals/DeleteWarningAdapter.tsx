/**
 * 删除确认弹窗适配器
 * 将任务ID数组转换为 DeleteWarningModal 所需的接口
 */

import React from 'react';
import { DeleteWarningModal } from './DeleteWarningModal';
import type { useTasks as UseTasksType } from '../../../../hooks/useTasks';

interface DeleteWarningAdapterProps {
  taskIds: string[];
  onClose: () => void;
  onConfirmed: () => void;
  // 外部传入的 tasksHook，避免创建新的 useTasks 实例
  tasksHook: ReturnType<typeof UseTasksType>;
}

export function DeleteWarningAdapter({ taskIds, onClose, onConfirmed, tasksHook }: DeleteWarningAdapterProps) {
  const handleConfirm = async () => {
    // logger.info('[DeleteWarningAdapter] 开始删除任务:', taskIds);
    // 等待所有删除操作完成
    for (const id of taskIds) {
      await tasksHook.deleteTask(id);
      // logger.info('[DeleteWarningAdapter] 删除任务完成:', id);
    }
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
