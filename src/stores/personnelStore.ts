/**
 * 人事管理 Store - PersonnelStore
 *
 * Phase 5: 人事管理模块
 *
 * 设计原则：
 * 1. 保留现有mock数据作为种子数据（不删除任何数据）
 * 2. 优先调用API，API失败时降级到本地存储
 * 3. 支持离线队列，联网后自动同步
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

export type Gender = '男' | '女' | '其他';
export type EmployeeStatus = '在职' | '离职' | '休假' | '退休';

export interface PersonnelRecord {
  id: string;
  employee_id: string;
  name: string;
  gender: Gender;
  phone: string;
  email?: string;
  id_card?: string;
  birth_date?: string;
  department: string;
  position: string;
  team?: string;
  hire_date: string;
  contract_end_date?: string;
  salary?: number;
  bank_account?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  address?: string;
  status: EmployeeStatus;
  photo_url?: string;
  remarks?: string;
  version: number;
  create_time: string;
  update_time: string;
}

export interface PersonnelFilters {
  name?: string;
  department?: string;
  position?: string;
  status?: EmployeeStatus;
}

// ========== Store 类型 ==========

interface PersonnelState {
  // 数据
  personnelRecords: PersonnelRecord[];

  // 视图状态
  filters: PersonnelFilters;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 离线状态
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions - 数据获取
  fetchPersonnel: () => Promise<void>;

  // Actions - 增删改
  addPersonnel: (record: Omit<PersonnelRecord, 'id' | 'version' | 'create_time' | 'update_time'>) => Promise<PersonnelRecord | null>;
  updatePersonnel: (id: string, updates: Partial<PersonnelRecord>) => Promise<void>;
  deletePersonnel: (id: string) => Promise<void>;

  // Actions - 筛选
  setFilters: (filters: Partial<PersonnelFilters>) => void;

  // Actions - 同步
  syncPendingChanges: () => Promise<void>;

  // 内部方法
  _initializeSeedData: () => void;
}

// ========== Store 实现 ==========

export const usePersonnelStore = create<PersonnelState>()(
  persist(
    (set, get) => ({
      // 初始状态
      personnelRecords: [],
      filters: {},
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      // ========== 数据获取 ==========

      fetchPersonnel: async () => {
        set({ isLoading: true, error: null });

        try {
          const apiData = await enhancedApiClient.get<{ data: PersonnelRecord[] }>('/personnel', {
            useCache: true,
            cacheStrategy: 'network-first',
          });

          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            set({ personnelRecords: apiData, isLoading: false });
            return;
          }

          const localRecords = get().personnelRecords;
          if (localRecords.length === 0) {
            get()._initializeSeedData();
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[PersonnelStore] API获取失败，使用本地数据:', error);

          const localRecords = get().personnelRecords;
          if (localRecords.length === 0) {
            get()._initializeSeedData();
          }
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ========== 增删改 ==========

      addPersonnel: async (record) => {
        const tempId = `P-${Date.now()}`;
        const now = new Date().toISOString();

        const newRecord: PersonnelRecord = {
          ...record,
          id: tempId,
          version: 1,
          create_time: now,
          update_time: now,
        };

        // 乐观更新本地
        set(state => ({
          personnelRecords: [newRecord, ...state.personnelRecords],
        }));

        try {
          const savedRecord = await enhancedApiClient.post<PersonnelRecord>(
            '/personnel',
            record,
            { offlineQueue: true }
          );

          set(state => ({
            personnelRecords: state.personnelRecords.map(r =>
              r.id === tempId ? savedRecord : r
            ),
          }));

          return savedRecord;
        } catch (error) {
          console.warn('[PersonnelStore] 创建人员API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
          return newRecord;
        }
      },

      updatePersonnel: async (id, updates) => {
        set(state => ({
          personnelRecords: state.personnelRecords.map(r =>
            r.id === id ? { ...r, ...updates, update_time: new Date().toISOString() } : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/personnel/${id}`, updates, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[PersonnelStore] 更新人员API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      deletePersonnel: async (id) => {
        set(state => ({
          personnelRecords: state.personnelRecords.filter(r => r.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/personnel/${id}`, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[PersonnelStore] 删除人员API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      // ========== 筛选 ==========

      setFilters: (filters) => {
        set(state => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      // ========== 同步 ==========

      syncPendingChanges: async () => {
        try {
          await enhancedApiClient.forcSync();
          set({ pendingSyncCount: 0 });
        } catch (error) {
          console.warn('[PersonnelStore] 同步失败:', error);
        }
      },

      // ========== 内部方法 ==========

      _initializeSeedData: () => {
        set({ isLoading: false });
        console.log('[PersonnelStore] 已初始化，使用空数据');
      },
    }),
    {
      name: 'personnel-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        personnelRecords: state.personnelRecords,
        filters: state.filters,
      }),
    }
  )
);

// ========== 辅助函数 ==========

export const getPersonnelByDepartment = (department: string) => {
  return usePersonnelStore.getState().personnelRecords.filter(p => p.department === department);
};

export const getPersonnelByStatus = (status: EmployeeStatus) => {
  return usePersonnelStore.getState().personnelRecords.filter(p => p.status === status);
};

export const getActivePersonnel = () => {
  return usePersonnelStore.getState().personnelRecords.filter(p => p.status === '在职');
};
