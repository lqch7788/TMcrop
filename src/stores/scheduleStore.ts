/**
 * 排班管理 Store - ScheduleStore
 *
 * Phase 0.4 参照模板
 *
 * 设计原则：
 * 1. 保留现有mock数据作为种子数据（不删除任何数据）
 * 2. 优先调用API，API失败时降级到本地存储
 * 3. 支持离线队列，联网后自动同步
 *
 * 后续Phase参照此模板进行改造
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

export interface ShiftConfig {
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

export type ShiftType = '早班' | '中班' | '晚班' | '全天' | '弹性';
export type ScheduleStatus = '已排班' | '已执行' | '已取消';

export interface ScheduleRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  shift: ShiftType;
  workZone: string;
  status: ScheduleStatus;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
}

export interface SwapRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  originalDate: string;
  targetDate: string;
  reason: string;
  status: '待审批' | '已同意' | '已拒绝';
  createTime: string;
}

export interface Staff {
  id: string;
  name: string;
  workZone: string;
}

// ========== 种子数据（保留原有mock数据）==========

const DEFAULT_SHIFT_CONFIGS: ShiftConfig[] = [
  { name: '早班', startTime: '06:00', endTime: '14:00', color: 'bg-amber-500' },
  { name: '中班', startTime: '14:00', endTime: '22:00', color: 'bg-blue-500' },
  { name: '晚班', startTime: '22:00', endTime: '06:00', color: 'bg-indigo-600' },
  { name: '全天', startTime: '08:00', endTime: '20:00', color: 'bg-green-500' },
  { name: '弹性', startTime: '09:00', endTime: '18:00', color: 'bg-purple-500' },
];

// 保留原有的MOCK_STAFF作为种子数据
const MOCK_STAFF: Staff[] = [
  { id: 'S001', name: '张三', workZone: 'A区' },
  { id: 'S002', name: '李四', workZone: 'B区' },
  { id: 'S003', name: '王五', workZone: 'A区' },
  { id: 'S004', name: '赵六', workZone: 'C区' },
  { id: 'S005', name: '钱七', workZone: 'B区' },
  { id: 'S006', name: '孙八', workZone: 'A区' },
  { id: 'S007', name: '周九', workZone: 'C区' },
  { id: 'S008', name: '吴十', workZone: 'B区' },
];

// 生成模拟排班数据（保留原有逻辑作为种子数据）
function generateMockSchedule(): ScheduleRecord[] {
  const records: ScheduleRecord[] = [];
  const today = new Date();
  const shifts: ShiftType[] = ['早班', '中班', '晚班', '全天', '弹性'];

  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + weekOffset * 7 + dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      const staffCount = 2 + Math.floor(Math.random() * 3);
      const selectedStaff = [...MOCK_STAFF].sort(() => Math.random() - 0.5).slice(0, staffCount);

      selectedStaff.forEach((staff, idx) => {
        const shift = shifts[Math.floor(Math.random() * shifts.length)];
        const isToday = dateStr === today.toISOString().split('T')[0];
        const isPast = date < today && !isToday;

        records.push({
          id: `SCH-${dateStr.replace(/-/g, '')}-${staff.id}`,
          staffId: staff.id,
          staffName: staff.name,
          date: dateStr,
          shift,
          workZone: staff.workZone,
          status: isPast ? '已执行' : (Math.random() > 0.1 ? '已排班' : '已取消'),
          checkIn: isPast && Math.random() > 0.3 ? `${6 + idx}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : undefined,
          checkOut: isPast && Math.random() > 0.5 ? `${14 + idx}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` : undefined,
        });
      });
    }
  }

  return records;
}

// 生成模拟调班申请
function generateMockSwapRequests(): SwapRequest[] {
  return [
    {
      id: 'SWAP001',
      requesterId: 'S001',
      requesterName: '张三',
      targetId: 'S002',
      targetName: '李四',
      originalDate: '2026-04-05',
      targetDate: '2026-04-07',
      reason: '家中有事，需要调班',
      status: '待审批',
      createTime: '2026-04-03 10:30:00',
    },
    {
      id: 'SWAP002',
      requesterId: 'S003',
      requesterName: '王五',
      targetId: 'S004',
      targetName: '赵六',
      originalDate: '2026-04-06',
      targetDate: '2026-04-08',
      reason: '临时会议冲突',
      status: '已同意',
      createTime: '2026-04-02 14:20:00',
    },
  ];
}

// ========== Store 类型 ==========

interface ScheduleState {
  // 数据
  schedules: ScheduleRecord[];
  shiftConfigs: ShiftConfig[];
  staffList: Staff[];
  swapRequests: SwapRequest[];

  // 视图状态
  selectedDate: string;
  viewMode: 'month' | 'week' | 'day';

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 离线状态
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions - 数据获取
  fetchSchedules: () => Promise<void>;
  fetchSchedulesByDate: (date: string) => Promise<ScheduleRecord[]>;

  // Actions - 增删改
  addSchedule: (record: Omit<ScheduleRecord, 'id'>) => Promise<ScheduleRecord | null>;
  updateSchedule: (id: string, updates: Partial<ScheduleRecord>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  cancelSchedule: (id: string) => Promise<void>;
  batchUpdateSchedule: (ids: string[], updates: Partial<ScheduleRecord>) => Promise<void>;

  // Actions - 班次配置
  updateShiftConfig: (name: ShiftType, config: Partial<ShiftConfig>) => void;

  // Actions - 调班申请
  submitSwapRequest: (request: Omit<SwapRequest, 'id' | 'status' | 'createTime'>) => Promise<void>;
  handleSwapRequest: (id: string, status: '已同意' | '已拒绝') => Promise<void>;

  // Actions - 视图控制
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: 'month' | 'week' | 'day') => void;

  // Actions - 同步
  syncPendingChanges: () => Promise<void>;

  // 内部方法
  _initializeSeedData: () => void;
}

// ========== Store 实现 ==========

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      // 初始状态
      schedules: [],
      shiftConfigs: DEFAULT_SHIFT_CONFIGS,
      staffList: MOCK_STAFF,
      swapRequests: [],
      selectedDate: new Date().toISOString().split('T')[0],
      viewMode: 'week',
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      // ========== 数据获取 ==========

      fetchSchedules: async () => {
        set({ isLoading: true, error: null });

        try {
          // 尝试从API获取
          const apiSchedules = await enhancedApiClient.get<ScheduleRecord[]>('/schedules', {
            useCache: true,
            cacheStrategy: 'network-first',
          });

          if (apiSchedules && Array.isArray(apiSchedules) && apiSchedules.length > 0) {
            set({ schedules: apiSchedules, isLoading: false });
            return;
          }

          // API返回空或失败，使用本地数据
          const localSchedules = get().schedules;
          if (localSchedules.length === 0) {
            // 首次使用，初始化种子数据
            get()._initializeSeedData();
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[ScheduleStore] API获取失败，使用本地数据:', error);

          // API失败，检查本地是否有数据
          const localSchedules = get().schedules;
          if (localSchedules.length === 0) {
            get()._initializeSeedData();
          }
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      fetchSchedulesByDate: async (date: string) => {
        const { schedules } = get();
        return schedules.filter(record => record.date === date);
      },

      // ========== 增删改 ==========

      addSchedule: async (record) => {
        const tempId = `TEMP-${Date.now()}`;
        const newRecord: ScheduleRecord = { ...record, id: tempId };

        // 先乐观更新本地
        set(state => ({
          schedules: [...state.schedules, newRecord],
        }));

        try {
          // 尝试调用API
          const savedRecord = await enhancedApiClient.post<ScheduleRecord>(
            '/schedules',
            record,
            { offlineQueue: true }
          );

          // API成功，用真实ID替换临时ID
          set(state => ({
            schedules: state.schedules.map(s =>
              s.id === tempId ? savedRecord : s
            ),
          }));

          return savedRecord;
        } catch (error) {
          console.warn('[ScheduleStore] 创建排班API失败，已加入离线队列:', error);

          // 离线队列会处理同步，无需额外操作
          // 标记为待同步
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));

          return newRecord;
        }
      },

      updateSchedule: async (id, updates) => {
        // 先乐观更新本地
        set(state => ({
          schedules: state.schedules.map(s =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));

        try {
          await enhancedApiClient.put(`/schedules/${id}`, updates, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[ScheduleStore] 更新排班API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      deleteSchedule: async (id) => {
        // 先乐观更新本地
        set(state => ({
          schedules: state.schedules.filter(s => s.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/schedules/${id}`, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[ScheduleStore] 删除排班API失败，已加入离线队列:', error);
          set(state => ({
            pendingSyncCount: state.pendingSyncCount + 1,
          }));
        }
      },

      cancelSchedule: async (id) => {
        await get().updateSchedule(id, { status: '已取消' });
      },

      batchUpdateSchedule: async (ids, updates) => {
        for (const id of ids) {
          await get().updateSchedule(id, updates);
        }
      },

      // ========== 班次配置 ==========

      updateShiftConfig: (name, config) => {
        set(state => ({
          shiftConfigs: state.shiftConfigs.map(cfg =>
            cfg.name === name ? { ...cfg, ...config } : cfg
          ),
        }));
      },

      // ========== 调班申请 ==========

      submitSwapRequest: async (request) => {
        const newRequest: SwapRequest = {
          ...request,
          id: `SWAP-${Date.now()}`,
          status: '待审批',
          createTime: new Date().toISOString().replace('T', ' ').split('.')[0],
        };

        set(state => ({
          swapRequests: [...state.swapRequests, newRequest],
        }));

        try {
          await enhancedApiClient.post('/schedules/swap-requests', newRequest, {
            offlineQueue: true,
          });
        } catch (error) {
          console.warn('[ScheduleStore] 提交调班申请API失败:', error);
        }
      },

      handleSwapRequest: async (id, status) => {
        set(state => ({
          swapRequests: state.swapRequests.map(req =>
            req.id === id ? { ...req, status } : req
          ),
        }));

        try {
          await enhancedApiClient.put(`/schedules/swap-requests/${id}`, { status }, {
            offlineQueue: true,
          });

          // 如果同意，执行调班
          if (status === '已同意') {
            const request = get().swapRequests.find(r => r.id === id);
            if (request) {
              const originalSchedule = get().schedules.find(
                s => s.staffId === request.requesterId && s.date === request.originalDate
              );
              if (originalSchedule) {
                await get().updateSchedule(originalSchedule.id, {
                  staffId: request.targetId,
                  staffName: request.targetName,
                });
              }
            }
          }
        } catch (error) {
          console.warn('[ScheduleStore] 处理调班申请API失败:', error);
        }
      },

      // ========== 视图控制 ==========

      setSelectedDate: (date) => set({ selectedDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),

      // ========== 同步 ==========

      syncPendingChanges: async () => {
        try {
          await enhancedApiClient.forcSync();
          set({ pendingSyncCount: 0 });
        } catch (error) {
          console.warn('[ScheduleStore] 同步失败:', error);
        }
      },

      // ========== 内部方法 ==========

      _initializeSeedData: () => {
        const mockSchedules = generateMockSchedule();
        const mockSwapRequests = generateMockSwapRequests();

        set({
          schedules: mockSchedules,
          swapRequests: mockSwapRequests,
          isLoading: false,
        });

        console.log('[ScheduleStore] 已初始化种子数据:', mockSchedules.length, '条排班记录');
      },
    }),
    {
      name: 'schedule-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        schedules: state.schedules,
        shiftConfigs: state.shiftConfigs,
        swapRequests: state.swapRequests,
      }),
    }
  )
);

// ========== 辅助函数 ==========

/**
 * 获取指定日期的排班
 */
export const getScheduleByDate = (date: string) => {
  return useScheduleStore.getState().schedules.filter(record => record.date === date);
};

/**
 * 获取指定员工指定日期的排班
 */
export const getScheduleByStaffAndDate = (staffId: string, date: string) => {
  return useScheduleStore.getState().schedules.find(
    record => record.staffId === staffId && record.date === date
  );
};

/**
 * 获取周视图日期范围
 */
export const getWeekDateRange = (selectedDate: string): string[] => {
  const date = new Date(selectedDate);
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

/**
 * 获取月视图日期范围
 */
export const getMonthDateRange = (selectedDate: string): string[] => {
  const date = new Date(selectedDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const dates: string[] = [];

  // 补齐月初空白
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  // 当月日期
  for (let i = 1; i <= lastDay.getDate(); i++) {
    dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
  }

  // 补齐月末空白
  const lastDayOfWeek = lastDay.getDay();
  for (let i = 1; i < (lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek); i++) {
    const d = new Date(year, month + 1, i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
};
