/**
 * 基础设置 Context
 * 提供部门、仓库、温室等基础数据的全局状态管理
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import * as departmentService from '../services/departmentService';
import * as warehouseService from '../services/warehouseService';
import * as greenhouseService from '../services/greenhouseService';
import type { Department } from '../services/departmentService';
import type { Warehouse } from '../services/warehouseService';
import type { Greenhouse } from '../services/greenhouseService';

interface SettingsContextValue {
  // 部门相关
  departments: Department[];
  loadDepartments: () => Promise<void>;

  // 仓库相关
  warehouses: Warehouse[];
  loadWarehouses: () => Promise<void>;

  // 温室相关
  greenhouses: Greenhouse[];
  loadGreenhouses: () => Promise<void>;

  // 加载状态
  loading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 部门管理
  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载部门失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 仓库管理
  const loadWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载仓库失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 温室管理
  const loadGreenhouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await greenhouseService.getGreenhouses();
      setGreenhouses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载温室失败');
    } finally {
      setLoading(false);
    }
  }, []);

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
