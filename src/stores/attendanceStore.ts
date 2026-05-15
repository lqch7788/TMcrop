/**
 * 考勤管理 Store - AttendanceStore
 *
 * Phase 2 参照模板
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

export type AttendanceStatus = '正常' | '迟到' | '早退' | '请假' | '加班' | '旷工';
export type StatusClass = 'normal' | 'warning' | 'draft' | 'info';

export interface AttendanceRecord {
  id: string;
  workerId: string;
  name: string;
  dept: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hours: number;
  status: AttendanceStatus;
  statusClass: StatusClass;
  taskId?: string;
  batchId?: string;
  remarks?: string;
}

export interface AttendanceFilters {
  startDate: string;
  endDate: string;
  dept: string;
  keyword: string;
}

// ========== 种子数据（保留原有mock数据）==========

// 生成模拟考勤数据
function generateMockAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const depts = ['生产部', '技术部', '仓储部', '运维部'];
  const names = [
    { id: 'W001', name: '郭靖' },
    { id: 'W002', name: '杨过' },
    { id: 'W003', name: '张无忌' },
    { id: 'W004', name: '令狐冲' },
    { id: 'W005', name: '段誉' },
    { id: 'W006', name: '黄蓉' },
    { id: 'W007', name: '陈家洛' },
    { id: 'W008', name: '任盈盈' },
  ];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    // 每天随机选择3-6名员工
    const selectedCount = 3 + Math.floor(Math.random() * 4);
    const selected = [...names].sort(() => Math.random() - 0.5).slice(0, selectedCount);

    selected.forEach((staff, idx) => {
      const rand = Math.random();
      let status: AttendanceStatus = '正常';
      let statusClass: StatusClass = 'normal';

      if (rand > 0.85) {
        status = '请假';
        statusClass = 'draft';
      } else if (rand > 0.75) {
        status = '迟到';
        statusClass = 'warning';
      } else if (rand > 0.65) {
        status = '早退';
        statusClass = 'warning';
      } else if (rand > 0.55) {
        status = '加班';
        statusClass = 'info';
      }

      const checkInHour = 7 + Math.floor(Math.random() * 2);
      const checkInMin = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      const checkOutHour = 17 + Math.floor(Math.random() * 3);
      const checkOutMin = String(Math.floor(Math.random() * 60)).padStart(2, '0');

      records.push({
        id: `ATT-${dateStr.replace(/-/g, '')}-${staff.id}`,
        workerId: staff.id,
        name: staff.name,
        dept: depts[Math.floor(Math.random() * depts.length)],
        date: dateStr,
        checkIn: status === '请假' ? '-' : `${checkInHour}:${checkInMin}`,
        checkOut: status === '请假' ? '-' : `${checkOutHour}:${checkOutMin}`,
        hours: status === '请假' ? 0 : (8 + Math.random() * 2 - 0.5),
        status,
        statusClass,
        taskId: status === '请假' ? undefined : `T${String(Math.floor(Math.random() * 10)).padStart(3, '0')}`,
        batchId: status === '请假' ? undefined : `B${String(Math.floor(Math.random() * 10)).padStart(3, '0')}`,
      });
    });
  }

  return records;
}

// ========== Store 类型 ==========

interface AttendanceState {
  // 数据
  attendanceRecords: AttendanceRecord[];

  // 视图状态
  filters: AttendanceFilters;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 离线状态
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions - 数据获取
  fetchAttendance: () => Promise<void>;

  // Actions - 增删改
  addAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<AttendanceRecord | null>;
  batchAddAttendance: (records: Omit<AttendanceRecord, 'id'>[]) => Promise<void>;
  updateAttendance: (id: string, updates: Partial<AttendanceRecord>) => Promise<void>;
  deleteAttendance: (ids: string[]) => Promise<void>;

  // Actions - 筛选
  setFilters: (filters: Partial<AttendanceFilters>) => void;

  // Actions - 同步
  syncPendingChanges: () => Promise<void>;

  // 内部方法
  _initializeSeedData: () => void;
}

// ========== Store 实现 ==========

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      // 初始状态
      attendanceRecords: [],
      filters: {
        startDate: '',
        endDate: '',
        dept: '全部',
        keyword: '',
      },
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      // ========== 数据获取 ==========

      fetchAttendance: async () => {
        set({ isLoading: true, error: null });

        try {
          // 尝试从API获取
          const apiData = await enhancedApiClient.get<AttendanceRecord[]>('/attendance', {
            useCache: true,
            cacheStrategy: 'network-first',
          });

          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            set({ attendanceRecords: apiData, isLoading: false });
            return;
          }

          // API返回空或失败，使用本地数据
          const localRecords = get().attendanceRecords;
          if (localRecords.length === 0) {
            // 首次使用，初始化种子数据
            get()._initializeSeedData();
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[AttendanceStore] API获取失败，使用本地数据:', error);

          // API失败，检查本地是否有数据
          const localRecords = get().attendanceRecords;
          if (localRecords.length === 0) {
            get()._initializeSeedData();
          }
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ========== 增删改 ==========

      addAttendance: async (record) => {
        const tempId = `TEMP-${Date.now()}`;
        const newRecord: AttendanceRecord = { ...record, id: tempId };

        // 先乐观更新本地
        set(state => ({
          attendanceRecords: [...state.attendanceRecords, newRecord],
        }));

        try {
          // 尝试调用API
          const savedRecord = await enhancedApiClient.post<AttendanceRecord>(
            '/attendance/batch',
            { records: [record] },
            { offlineQueue: true }
          );

          // API成功，用真实ID替换临时ID
          set(state => ({
            attendanceRecords: state.attendanceRecords.map(a =>
              a.id === tempId ? savedRecord as AttendanceRecord : a
            ),
          }));

          return savedRecord;
        } catch (error) {
          console.warn('[AttendanceStore] 创建考勤API失败，已加入离线队列:', error);

          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));

          return newRecord;
        }
      },

      batchAddAttendance: async (records) => {
        const tempIds = records.map(() => `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        const newRecords = records.map((record, idx) => ({ ...record, id: tempIds[idx] }));

        // 先乐观更新本地
        set(state => ({
          attendanceRecords: [...state.attendanceRecords, ...newRecords],
        }));

        try {
          await enhancedApiClient.post('/attendance/batch', { records }, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[AttendanceStore] 批量创建考勤API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + records.length,
          }));
        }
      },

      updateAttendance: async (id, updates) => {
        // 先乐观更新本地
        set(state => ({
          attendanceRecords: state.attendanceRecords.map(a =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));

        try {
          await enhancedApiClient.put(`/attendance/${id}`, updates, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[AttendanceStore] 更新考勤API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      deleteAttendance: async (ids) => {
        // 先乐观更新本地
        set(state => ({
          attendanceRecords: state.attendanceRecords.filter(a => !ids.includes(a.id)),
        }));

        try {
          await enhancedApiClient.delete('/attendance/batch', {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[AttendanceStore] 删除考勤API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + ids.length,
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
          console.warn('[AttendanceStore] 同步失败:', error);
        }
      },

      // ========== 内部方法 ==========

      _initializeSeedData: () => {
        const mockAttendance = generateMockAttendance();

        set({
          attendanceRecords: mockAttendance,
          isLoading: false,
        });

        // 种子数据初始化完成
      },
    }),
    {
      name: 'attendance-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        attendanceRecords: state.attendanceRecords,
        filters: state.filters,
      }),
    }
  )
);

// ========== 辅助函数 ==========

/**
 * 获取指定日期的考勤记录
 */
export const getAttendanceByDate = (date: string) => {
  return useAttendanceStore.getState().attendanceRecords.filter(record => record.date === date);
};

/**
 * 获取指定员工的考勤记录
 */
export const getAttendanceByWorker = (workerId: string) => {
  return useAttendanceStore.getState().attendanceRecords.filter(record => record.workerId === workerId);
};

/**
 * 获取日期范围内的考勤记录
 */
export const getAttendanceByDateRange = (startDate: string, endDate: string) => {
  return useAttendanceStore.getState().attendanceRecords.filter(
    record => record.date >= startDate && record.date <= endDate
  );
};
