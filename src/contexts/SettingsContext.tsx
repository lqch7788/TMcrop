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
  const store = useSettingsStore();

  const value: SettingsContextValue = {
    departments: store.departments,
    loadDepartments: store.loadDepartments,
    warehouses: store.warehouses,
    loadWarehouses: store.loadWarehouses,
    greenhouses: store.greenhouses,
    loadGreenhouses: store.loadGreenhouses,
    loading: store.loading,
    error: store.error,
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
