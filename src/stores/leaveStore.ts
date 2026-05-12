/**
 * 请假管理 Store - LeaveStore
 *
 * Phase 4: 请假管理模块
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

export type LeaveType = 'annual' | 'sick' | 'personal' | 'marriage' | 'maternity' | 'paternity' | 'bereavement' | 'work_injury';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';

export interface LeaveRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  leave_type: LeaveType;
  leave_type_label?: string;
  start_date: string;
  end_date: string;
  duration: number;
  reason: string;
  status: LeaveStatus;
  status_label?: string;
  approver_id?: string;
  approver_name?: string;
  approved_at?: string;
  remarks?: string;
  version: number;
  create_time: string;
  update_time: string;
}

export interface LeaveFilters {
  worker_name?: string;
  leave_type?: LeaveType;
  status?: LeaveStatus;
  start_date?: string;
  end_date?: string;
}

// ========== Store 类型 ==========

interface LeaveState {
  // 数据
  leaveRecords: LeaveRecord[];

  // 视图状态
  filters: LeaveFilters;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 离线状态
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions - 数据获取
  fetchLeaveRecords: () => Promise<void>;

  // Actions - 增删改
  addLeaveRecord: (record: Omit<LeaveRecord, 'id' | 'version' | 'create_time' | 'update_time'>) => Promise<LeaveRecord | null>;
  updateLeaveRecord: (id: string, updates: Partial<LeaveRecord>) => Promise<void>;
  deleteLeaveRecord: (id: string) => Promise<void>;

  // Actions - 审批
  approveLeave: (id: string, approver_id: string, approver_name: string) => Promise<void>;
  rejectLeave: (id: string, reason: string) => Promise<void>;
  cancelLeave: (id: string) => Promise<void>;

  // Actions - 筛选
  setFilters: (filters: Partial<LeaveFilters>) => void;

  // Actions - 同步
  syncPendingChanges: () => Promise<void>;

  // 内部方法
  _initializeSeedData: () => void;
}

// ========== Store 实现 ==========

export const useLeaveStore = create<LeaveState>()(
  persist(
    (set, get) => ({
      // 初始状态
      leaveRecords: [],
      filters: {},
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      // ========== 数据获取 ==========

      fetchLeaveRecords: async () => {
        set({ isLoading: true, error: null });

        try {
          const apiData = await enhancedApiClient.get<{ data: LeaveRecord[] }>('/leave', {
            useCache: true,
            cacheStrategy: 'network-first',
          });

          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            set({ leaveRecords: apiData, isLoading: false });
            return;
          }

          const localRecords = get().leaveRecords;
          if (localRecords.length === 0) {
            get()._initializeSeedData();
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[LeaveStore] API获取失败，使用本地数据:', error);

          const localRecords = get().leaveRecords;
          if (localRecords.length === 0) {
            get()._initializeSeedData();
          }
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ========== 增删改 ==========

      addLeaveRecord: async (record) => {
        const tempId = `LEAVE-${Date.now()}`;
        const now = new Date().toISOString();

        const newRecord: LeaveRecord = {
          ...record,
          id: tempId,
          version: 1,
          create_time: now,
          update_time: now,
        };

        // 乐观更新本地
        set(state => ({
          leaveRecords: [newRecord, ...state.leaveRecords],
        }));

        try {
          const savedRecord = await enhancedApiClient.post<LeaveRecord>(
            '/leave',
            record,
            { offlineQueue: true }
          );

          set(state => ({
            leaveRecords: state.leaveRecords.map(r =>
              r.id === tempId ? savedRecord : r
            ),
          }));

          return savedRecord;
        } catch (error) {
          console.warn('[LeaveStore] 创建请假API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
          return newRecord;
        }
      },

      updateLeaveRecord: async (id, updates) => {
        set(state => ({
          leaveRecords: state.leaveRecords.map(r =>
            r.id === id ? { ...r, ...updates, update_time: new Date().toISOString() } : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/leave/${id}`, updates, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[LeaveStore] 更新请假API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      deleteLeaveRecord: async (id) => {
        set(state => ({
          leaveRecords: state.leaveRecords.filter(r => r.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/leave/${id}`, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[LeaveStore] 删除请假API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      // ========== 审批 ==========

      approveLeave: async (id, approver_id, approver_name) => {
        const now = new Date().toISOString();
        set(state => ({
          leaveRecords: state.leaveRecords.map(r =>
            r.id === id
              ? { ...r, status: 'approved' as LeaveStatus, approver_id, approver_name, approved_at: now, update_time: now }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/leave/${id}`, {
            status: 'approved',
            approver_id,
            approver_name,
            approved_at: now,
          }, { offlineQueue: true });
        } catch (error) {
          console.warn('[LeaveStore] 审批请假API失败:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      rejectLeave: async (id, reason) => {
        set(state => ({
          leaveRecords: state.leaveRecords.map(r =>
            r.id === id
              ? { ...r, status: 'rejected' as LeaveStatus, remarks: reason, update_time: new Date().toISOString() }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/leave/${id}`, {
            status: 'rejected',
            remarks: reason,
          }, { offlineQueue: true });
        } catch (error) {
          console.warn('[LeaveStore] 拒绝请假API失败:', error);
        }
      },

      cancelLeave: async (id) => {
        set(state => ({
          leaveRecords: state.leaveRecords.map(r =>
            r.id === id
              ? { ...r, status: 'cancelled' as LeaveStatus, update_time: new Date().toISOString() }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/leave/${id}`, {
            status: 'cancelled',
          }, { offlineQueue: true });
        } catch (error) {
          console.warn('[LeaveStore] 取消请假API失败:', error);
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
          console.warn('[LeaveStore] 同步失败:', error);
        }
      },

      // ========== 内部方法 ==========

      _initializeSeedData: () => {
        set({ isLoading: false });
        console.log('[LeaveStore] 已初始化，使用空数据');
      },
    }),
    {
      name: 'leave-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        leaveRecords: state.leaveRecords,
        filters: state.filters,
      }),
    }
  )
);

// ========== 辅助函数 ==========

export const getLeaveByWorker = (workerId: string) => {
  return useLeaveStore.getState().leaveRecords.filter(r => r.worker_id === workerId);
};

export const getLeaveByStatus = (status: LeaveStatus) => {
  return useLeaveStore.getState().leaveRecords.filter(r => r.status === status);
};

export const getLeaveByDateRange = (startDate: string, endDate: string) => {
  return useLeaveStore.getState().leaveRecords.filter(
    r => r.start_date >= startDate && r.end_date <= endDate
  );
};
