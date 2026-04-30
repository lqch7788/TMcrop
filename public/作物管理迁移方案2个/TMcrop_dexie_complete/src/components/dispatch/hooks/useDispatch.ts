/**
 * 派发业务逻辑 Hook
 * 提供统一的派发相关业务逻辑
 */

import { useCallback } from 'react';
import { useTasks } from '../../../hooks/useTasks';
import { useSmartRecommend } from './useSmartRecommend';
import type { DispatchMode, DispatchTaskInput } from '../types/dispatch';

/**
 * 派发业务逻辑 Hook
 */
export function useDispatch() {
  const { createTask, updateTask, deleteTask, publishTask, tasks: unifiedTasks } = useTasks();
  const { getRecommendations, getTopRecommendation } = useSmartRecommend({ mode: 'smart' });

  // 根据模式创建任务
  const createTaskByMode = useCallback(
    (data: DispatchTaskInput, mode: DispatchMode) => {
      return createTask(data, mode);
    },
    [createTask]
  );

  // 获取某模式的任务列表
  const getTasksByMode = useCallback(
    (mode: DispatchMode) => {
      return unifiedTasks.filter((task) => task.dispatchMode === mode);
    },
    [unifiedTasks]
  );

  return {
    // 基础CRUD
    createTask: createTaskByMode,
    updateTask,
    deleteTask,
    publishTask,

    // 模式筛选
    getTasksByMode,

    // 智能推荐
    getRecommendations,
    getTopRecommendation,
  };
}
