/**
 * 删除确认弹窗适配器
 * 将任务ID数组转换为 DeleteWarningModal 所需的接口
 */

import React from 'react';
import { DeleteWarningModal } from './DeleteWarningModal';
import { showAlert } from '@/lib/dialogService';
import type { useTasks as UseTasksType } from '../../../../hooks/useTasks';

interface DeleteWarningAdapterProps {
  taskIds: string[];
  onClose: () => void;
  onConfirmed: () => void;
  // 外部传入的 tasksHook，避免创建新的 useTasks 实例
  tasksHook: ReturnType<typeof UseTasksType>;
}

export function DeleteWarningAdapter({ taskIds, onClose, onConfirmed, tasksHook }: DeleteWarningAdapterProps) {
  /**
   * 批量删除。
   *
   * 2026-10-20 修复：原先循环里没有任何 try/catch，而 deleteTask 失败会 throw。
   * 只要中途有一条 500，循环就中断、onConfirmed() 不执行 ——
   * 确认弹窗永远停在那里，用户既不知道删到哪一步、也没有任何错误提示，
   * 前面已删的删了、后面未删的没删，只能刷新页面猜。
   * 现在：逐条捕获并汇总，无论成败都关闭弹窗并刷新。
   */
  const handleConfirm = async () => {
    let succeeded = 0;
    const failures: string[] = [];
    for (const id of taskIds) {
      try {
        await tasksHook.deleteTask(id);
        succeeded++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[DeleteWarningAdapter] 删除任务失败:', id, error);
        failures.push(`${id}：${msg}`);
      }
    }
    if (failures.length > 0) {
      showAlert(
        `删除完成：成功 ${succeeded} 条，失败 ${failures.length} 条。\n` +
        `失败明细：${failures.slice(0, 5).join('；')}${failures.length > 5 ? ` 等 ${failures.length} 条` : ''}`,
      );
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
