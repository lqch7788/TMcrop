/**
 * 批量编辑弹窗适配器
 * 将任务ID数组转换为 BatchEditModal 所需的接口
 */

import React, { useState, useMemo } from 'react';
import { BatchEditModal } from '../../taskDispatch/modals/BatchEditModal'; // 使用任务专用的批量编辑弹窗
import { Task, useTasks } from '../../../../hooks/useTasks';
import { FARM_OPERATION_TYPES } from '../../../../types/farm/common';
import { useProductionPlanStore, useWorkerStore, useGreenhouseStore } from '../../../../stores';

// 任务类型选项
const taskTypes = FARM_OPERATION_TYPES.map(t => ({
  value: t.value,
  label: t.label,
}));

// 获取批次选项（从Store读取）
function getBatchCodes() {
  return useProductionPlanStore.getState().batches.map(b => ({
    value: b.batchCode,
    label: b.batchCode,
  }));
}

// 获取员工选项（从Store读取）
function getStaff() {
  const w = useWorkerStore.getState().workers;
  return (Array.isArray(w) ? w : []).map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
  }));
}

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

  // 从Store获取批次和员工选项（响应式）
  const batchCodes = useMemo(() => getBatchCodes(), []);
  const staff = useMemo(() => getStaff(), []);

  // 任务区域字段（从温室 Store 动态计算，替换硬编码 farmMockData.taskDispatchFields）
  const fields = useMemo(() => {
    const greenhouses = useGreenhouseStore.getState().greenhouses;
    return greenhouses.map(g => ({
      id: Number(g.id) || 0,
      name: g.name,
      type: g.greenhouseType || '',
      crop: g.crop || '',
      area: g.area || 0,
    }));
  }, []);

  // 直接用 taskIds 获取选中的任务（不依赖索引）
  const selectedTasks = taskIds
    .map(id => tasks.find(t => t.id === id))
    .filter(Boolean) as Task[];

  // 生成基于 selectedTasks 的索引数组 [0, 1, 2, ...]
  const selectedRows = selectedTasks.map((_, idx) => idx);

  const handleConfirm = () => {
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
