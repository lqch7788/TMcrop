/**
 * 基础设置 Store - Zustand 替代 SettingsContext
 * 提供部门、仓库、温室等基础数据的全局状态管理
 */
import { create } from 'zustand';
import * as departmentService from '../services/departmentService';
import * as warehouseService from '../services/warehouseService';
import * as greenhouseService from '../services/greenhouseService';
import type { Department } from '../services/departmentService';
import type { Warehouse } from '../services/warehouseService';
import type { Greenhouse } from '../services/greenhouseService';

interface SettingsStore {
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

export const useSettingsStore = create<SettingsStore>((set) => ({
  departments: [],
  warehouses: [],
  greenhouses: [],
  loading: false,
  error: null,

  loadDepartments: async () => {
    try {
      set({ loading: true, error: null });
      const data = await departmentService.getDepartments();
      set({ departments: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载部门失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadWarehouses: async () => {
    try {
      set({ loading: true, error: null });
      const data = await warehouseService.getWarehouses();
      set({ warehouses: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载仓库失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadGreenhouses: async () => {
    try {
      set({ loading: true, error: null });
      const data = await greenhouseService.getGreenhouses();
      set({ greenhouses: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载温室失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
