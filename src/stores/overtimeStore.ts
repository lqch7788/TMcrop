/**
 * 加班管理 Store - OvertimeStore
 *
 * Phase 4: 加班管理模块
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

export type OvertimeType = 'workday' | 'weekend' | 'holiday';
export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface OvertimeRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  overtime_date: string;
  overtime_type: OvertimeType;
  overtime_type_label?: string;
  start_time: string;
  end_time: string;
  hours: number;
  reason: string;
  status: OvertimeStatus;
  status_label?: string;
  approver_id?: string;
  approver_name?: string;
  approved_at?: string;
  overtime_pay?: number;
  remarks?: string;
  version: number;
  create_time: string;
  update_time: string;
}

export interface OvertimeFilters {
  worker_name?: string;
  overtime_type?: OvertimeType;
  status?: OvertimeStatus;
  start_date?: string;
  end_date?: string;
}

// ========== Store 类型 ==========

interface OvertimeState {
  // 数据
  overtimeRecords: OvertimeRecord[];

  // 视图状态
  filters: OvertimeFilters;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 离线状态
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions - 数据获取
  fetchOvertimeRecords: () => Promise<void>;

  // Actions - 增删改
  addOvertimeRecord: (record: Omit<OvertimeRecord, 'id' | 'version' | 'create_time' | 'update_time'>) => Promise<OvertimeRecord | null>;
  updateOvertimeRecord: (id: string, updates: Partial<OvertimeRecord>) => Promise<void>;
  deleteOvertimeRecord: (id: string) => Promise<void>;

  // Actions - 审批
  approveOvertime: (id: string, approver_id: string, approver_name: string) => Promise<void>;
  rejectOvertime: (id: string, reason: string) => Promise<void>;
  cancelOvertime: (id: string) => Promise<void>;

  // Actions - 筛选
  setFilters: (filters: Partial<OvertimeFilters>) => void;

  // Actions - 同步
  syncPendingChanges: () => Promise<void>;

  // 内部方法
  _initializeSeedData: () => void;
}

// ========== Store 实现 ==========

export const useOvertimeStore = create<OvertimeState>()(
  persist(
    (set, get) => ({
      // 初始状态
      overtimeRecords: [],
      filters: {},
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      // ========== 数据获取 ==========

      fetchOvertimeRecords: async () => {
        set({ isLoading: true, error: null });

        try {
          const apiData = await enhancedApiClient.get<{ data: OvertimeRecord[] }>('/overtime', {
            useCache: true,
            cacheStrategy: 'network-first',
          });

          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            set({ overtimeRecords: apiData, isLoading: false });
            return;
          }

          const localRecords = get().overtimeRecords;
          if (localRecords.length === 0) {
            get()._initializeSeedData();
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[OvertimeStore] API获取失败，使用本地数据:', error);

          const localRecords = get().overtimeRecords;
          if (localRecords.length === 0) {
            get()._initializeSeedData();
          }
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ========== 增删改 ==========

      addOvertimeRecord: async (record) => {
        const tempId = `OT-${Date.now()}`;
        const now = new Date().toISOString();

        const newRecord: OvertimeRecord = {
          ...record,
          id: tempId,
          version: 1,
          create_time: now,
          update_time: now,
        };

        // 乐观更新本地
        set(state => ({
          overtimeRecords: [newRecord, ...state.overtimeRecords],
        }));

        try {
          const savedRecord = await enhancedApiClient.post<OvertimeRecord>(
            '/overtime',
            record,
            { offlineQueue: true }
          );

          set(state => ({
            overtimeRecords: state.overtimeRecords.map(r =>
              r.id === tempId ? savedRecord : r
            ),
          }));

          return savedRecord;
        } catch (error) {
          console.warn('[OvertimeStore] 创建加班API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
          return newRecord;
        }
      },

      updateOvertimeRecord: async (id, updates) => {
        set(state => ({
          overtimeRecords: state.overtimeRecords.map(r =>
            r.id === id ? { ...r, ...updates, update_time: new Date().toISOString() } : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/overtime/${id}`, updates, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[OvertimeStore] 更新加班API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      deleteOvertimeRecord: async (id) => {
        set(state => ({
          overtimeRecords: state.overtimeRecords.filter(r => r.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/overtime/${id}`, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[OvertimeStore] 删除加班API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      // ========== 审批 ==========

      approveOvertime: async (id, approver_id, approver_name) => {
        const now = new Date().toISOString();
        set(state => ({
          overtimeRecords: state.overtimeRecords.map(r =>
            r.id === id
              ? { ...r, status: 'approved' as OvertimeStatus, approver_id, approver_name, approved_at: now, update_time: now }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/overtime/${id}`, {
            status: 'approved',
            approver_id,
            approver_name,
            approved_at: now,
          }, { offlineQueue: true });
        } catch (error) {
          console.warn('[OvertimeStore] 审批加班API失败:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      rejectOvertime: async (id, reason) => {
        set(state => ({
          overtimeRecords: state.overtimeRecords.map(r =>
            r.id === id
              ? { ...r, status: 'rejected' as OvertimeStatus, remarks: reason, update_time: new Date().toISOString() }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/overtime/${id}`, {
            status: 'rejected',
            remarks: reason,
          }, { offlineQueue: true });
        } catch (error) {
          console.warn('[OvertimeStore] 拒绝加班API失败:', error);
        }
      },

      cancelOvertime: async (id) => {
        set(state => ({
          overtimeRecords: state.overtimeRecords.map(r =>
            r.id === id
              ? { ...r, status: 'cancelled' as OvertimeStatus, update_time: new Date().toISOString() }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/overtime/${id}`, {
            status: 'cancelled',
          }, { offlineQueue: true });
        } catch (error) {
          console.warn('[OvertimeStore] 取消加班API失败:', error);
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
          console.warn('[OvertimeStore] 同步失败:', error);
        }
      },

      // ========== 内部方法 ==========

      _initializeSeedData: () => {
        set({ isLoading: false });
        console.log('[OvertimeStore] 已初始化，使用空数据');
      },
    }),
    {
      name: 'overtime-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        overtimeRecords: state.overtimeRecords,
        filters: state.filters,
      }),
    }
  )
);

// ========== 辅助函数 ==========

export const getOvertimeByWorker = (workerId: string) => {
  return useOvertimeStore.getState().overtimeRecords.filter(r => r.worker_id === workerId);
};

export const getOvertimeByStatus = (status: OvertimeStatus) => {
  return useOvertimeStore.getState().overtimeRecords.filter(r => r.status === status);
};

export const getOvertimeByDateRange = (startDate: string, endDate: string) => {
  return useOvertimeStore.getState().overtimeRecords.filter(
    r => r.overtime_date >= startDate && r.overtime_date <= endDate
  );
};

export const getTotalOvertimeHours = (workerId: string, startDate: string, endDate: string) => {
  return useOvertimeStore.getState().overtimeRecords
    .filter(r => r.worker_id === workerId && r.status === 'approved')
    .filter(r => r.overtime_date >= startDate && r.overtime_date <= endDate)
    .reduce((sum, r) => sum + r.hours, 0);
};
