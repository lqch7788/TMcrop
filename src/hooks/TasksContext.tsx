/**
 * 统一任务管理 Context
 * 确保所有组件共享同一个 useTasks 实例，实现状态同步
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useTasks, UseTasksReturn } from './useTasks';

// 创建 Context
const TasksContext = createContext<UseTasksReturn | null>(null);

// Provider 组件
export function TasksProvider({ children }: { children: ReactNode }) {
  const tasksState = useTasks();

  return (
    <TasksContext.Provider value={tasksState}>
      {children}
    </TasksContext.Provider>
  );
}

// 使用 useTasks 的 hook（从 Context 获取实例）
export function useTasksContext(): UseTasksReturn {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasksContext must be used within TasksProvider');
  }
  return context;
}
