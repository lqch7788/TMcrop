/**
 * 基础设置 Context
 * 提供部门、仓库、温室等基础数据的全局状态管理
 * 已迁移到 Zustand Store (src/stores/useSettingsStore.ts)
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

interface SettingsContextValue {
  departments: ReturnType<typeof useSettingsStore>['departments'];
  loadDepartments: () => Promise<void>;
  warehouses: ReturnType<typeof useSettingsStore>['warehouses'];
  loadWarehouses: () => Promise<void>;
  greenhouses: ReturnType<typeof useSettingsStore>['greenhouses'];
  loadGreenhouses: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // 2026-07-29 死循环修复：改为 selector 单独订阅字段，避免 store 任意字段变化触发整 Provider 重渲染
  const departments = useSettingsStore((s) => s.departments);
  const warehouses = useSettingsStore((s) => s.warehouses);
  const greenhouses = useSettingsStore((s) => s.greenhouses);
  const loading = useSettingsStore((s) => s.loading);
  const error = useSettingsStore((s) => s.error);
  const loadDepartments = useSettingsStore((s) => s.loadDepartments);
  const loadWarehouses = useSettingsStore((s) => s.loadWarehouses);
  const loadGreenhouses = useSettingsStore((s) => s.loadGreenhouses);

  const value: SettingsContextValue = {
    departments,
    loadDepartments,
    warehouses,
    loadWarehouses,
    greenhouses,
    loadGreenhouses,
    loading,
    error,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

export { SettingsContext };
