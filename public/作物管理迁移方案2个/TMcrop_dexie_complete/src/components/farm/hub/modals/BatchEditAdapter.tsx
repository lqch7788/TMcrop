/**
 * 批量编辑弹窗适配器
 * 将任务ID数组转换为 BatchEditModal 所需的接口
 */

import React, { useState } from 'react';
import { BatchEditModal } from '../../taskDispatch/modals/BatchEditModal'; // 使用任务专用的批量编辑弹窗
import { Task, useTasks } from '../../../../hooks/useTasks';
import { taskDispatchFields, taskDispatchStaff } from '../../../../data/farmMockData';
import { FARM_OPERATION_TYPES } from '../../../../types/farm/common';
import { cropBatches } from '../../../../data/mockData';

// 转换 fields 格式
const fields = taskDispatchFields.map(f => ({
  id: f.id,
  name: f.name,
  type: f.type,
  crop: f.crop,
  area: f.area,
}));

// 任务类型选项
const taskTypes = FARM_OPERATION_TYPES.map(t => ({
  value: t.value,
  label: t.label,
}));

// 批次选项
const batchCodes = cropBatches.map(b => ({
  value: b.batchCode,
  label: b.batchCode,
}));

// 员工选项（转换为 BatchEditModal 所需的格式）
const staff = taskDispatchStaff.map(s => ({
  id: s.id,
  name: s.name,
  status: s.status,
}));

interface BatchEditAdapterProps {
  taskIds: string[];
  tasks: Task[];
  onClose: () => void;
  onConfirmed: () => void;
}

export function BatchEditAdapter({
  taskIds,
  tasks,
  onClose,
  onConfirmed,
}: BatchEditAdapterProps) {
  const tasksHook = useTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [editedTasks, setEditedTasks] = useState<Record<string, Partial<Task>>>({});
  const [editedTaskIds, setEditedTaskIds] = useState<string[]>([]);

  // 直接用 taskIds 获取选中的任务（不依赖索引）
  const selectedTasks = taskIds
    .map(id => tasks.find(t => t.id === id))
    .filter(Boolean) as Task[];

  // 生成基于 selectedTasks 的索引数组 [0, 1, 2, ...]
  const selectedRows = selectedTasks.map((_, idx) => idx);

  const handleConfirm = () => {
    console.log('[BatchEditAdapter] 确认批量编辑:', { editedTasks, editedTaskIds });
    // 调用实际的批量编辑逻辑
    Object.entries(editedTasks).forEach(([taskId, updates]) => {
      tasksHook.updateTask(taskId, updates);
    });
    onConfirmed();
  };

  return (
    <BatchEditModal
      isOpen={true}
      selectedRows={selectedRows}
      tasks={selectedTasks}
      editedTaskIds={editedTaskIds}
      editedTasks={editedTasks}
      selectedTaskId={selectedTaskId}
      onSelectedTaskIdChange={setSelectedTaskId}
      onEditedTasksChange={setEditedTasks}
      onEditedTaskIdsChange={setEditedTaskIds}
      onClose={onClose}
      onConfirm={handleConfirm}
      fields={fields}
      staff={staff}
      taskTypes={taskTypes}
      batchCodes={batchCodes}
    />
  );
}
