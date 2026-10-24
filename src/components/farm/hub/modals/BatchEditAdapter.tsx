/**
 * 批量编辑弹窗适配器
 * 将任务ID数组转换为 BatchEditModal 所需的接口
 */

import React, { useState, useMemo } from 'react';
import { BatchEditModal } from '../../taskDispatch/modals/BatchEditModal'; // 使用任务专用的批量编辑弹窗
import { Task, useTasks } from '../../../../hooks/useTasks';
import { ALL_TASK_TYPE_OPTIONS } from '../../../../types/farm/common';
import { useUserStore, useGreenhouseStore } from '../../../../stores';

// 任务类型选项（含历史类型，保证编辑存量任务时下拉能回显）
const taskTypes = ALL_TASK_TYPE_OPTIONS;

// 2026-10-11：删除 getBatchCodes() 及 batchCodes prop —— BatchEditModal 既无此 prop 也无对应表单控件，
//   传过去会被整段忽略（类型报错 TS2322）。若后续要做「批量改关联批次」，需先在弹窗内实现该字段。

// 获取员工选项（2026-10-24 对齐 FarmTaskHub.tsx:63-72：执行人候选统一用登录账号，
//   不再读 useWorkerStore 人事档案）
function getStaff() {
  const users = useUserStore.getState().users;
  return (Array.isArray(users) ? users : []).map(u => ({
    id: u.id || u.oid || '',
    name: u.name || u.real_name || u.username || '',
    status: 'active',
  })).filter(s => s.id && s.name);
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

  // 从Store获取员工选项（响应式）
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
    />
  );
}
