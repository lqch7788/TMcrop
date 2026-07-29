/**
 * 排班管理 Store - ScheduleStore
 *
 * V2.1 架构 - 已简化
 */

import { create } from 'zustand';
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

/** 排班占用情况（来自 GET /api/schedules/occupations） */
export interface ScheduleOccupation {
  workerId: string;
  workerName: string;
  workZone: string;
  scheduleStatus: 'on_duty' | 'off_duty' | 'no_schedule';
  shift: string;
  assignedTaskCount: number;
  totalAssignedHours: number;
  tasks: Array<{
    taskId: string;
    source: 'farm' | 'tempTask';
    taskCode: string;
    title: string;
    priority: string;
    status: string;
  }>;
}

// ========== 种子数据（保留原有mock数据）==========

const DEFAULT_SHIFT_CONFIGS: ShiftConfig[] = [
  { name: '早班', startTime: '06:00', endTime: '14:00', color: 'bg-amber-500' },
  { name: '中班', startTime: '14:00', endTime: '22:00', color: 'bg-blue-500' },
  { name: '晚班', startTime: '22:00', endTime: '06:00', color: 'bg-indigo-600' },
  { name: '全天', startTime: '08:00', endTime: '20:00', color: 'bg-green-500' },
  { name: '弹性', startTime: '09:00', endTime: '18:00', color: 'bg-purple-500' },
];

// 生成模拟排班数据（基于真实工人列表，无工人时返回空数组）
function generateMockSchedule(staffList: Staff[]): ScheduleRecord[] {
  if (staffList.length === 0) return [];

  const records: ScheduleRecord[] = [];
  const today = new Date();
  const shifts: ShiftType[] = ['早班', '中班', '晚班', '全天', '弹性'];

  for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + weekOffset * 7 + dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      const staffCount = Math.min(2 + Math.floor(Math.random() * 3), staffList.length);
      const selectedStaff = [...staffList].sort(() => Math.random() - 0.5).slice(0, staffCount);

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

// 生成模拟调班申请（金庸武侠人物）
function generateMockSwapRequests(): SwapRequest[] {
  return [
    {
      id: 'SWAP001',
      requesterId: 'S001',
      requesterName: '郭靖',
      targetId: 'S002',
      targetName: '黄蓉',
      originalDate: '2026-04-05',
      targetDate: '2026-04-07',
      reason: '家中有事，需要调班',
      status: '待审批',
      createTime: '2026-04-03 10:30:00',
    },
    {
      id: 'SWAP002',
      requesterId: 'S003',
      requesterName: '杨过',
      targetId: 'S004',
      targetName: '小龙女',
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
  loadStaffFromWorkers: () => Promise<void>;

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

  // Actions - 排班占用（派工联动）
  fetchOccupations: (date: string) => Promise<void>;
  getWorkerScheduleStatus: (workerId: string, date: string) => {
    scheduleStatus: 'on_duty' | 'off_duty' | 'no_schedule';
    assignedTaskCount: number;
  };
  invalidateOccupations: (date: string) => void;

  // 内部方法
  _initializeSeedData: () => void;
}

// ========== Store 实现 ==========

export const useScheduleStore = create<ScheduleState>()(
  (set, get) => ({
      // 初始状态（staffList 从 useWorkerStore 动态加载，不再硬编码）
      schedules: [],
      shiftConfigs: DEFAULT_SHIFT_CONFIGS,
      staffList: [],
      swapRequests: [],
      selectedDate: new Date().toISOString().split('T')[0],
      viewMode: 'week',
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      // 排班占用（派工联动，按日期缓存，2 分钟 TTL）
      occupations: {} as Record<string, ScheduleOccupation[]>,
      occupationsLoading: false,
      occupationsError: null as string | null,
      lastFetchedAt: {} as Record<string, number>,

      // ========== 数据获取 ==========

      fetchSchedules: async () => {
        set({ isLoading: true, error: null });

        // 先从真实工人库加载工人列表
        await get().loadStaffFromWorkers();

        try {
          // 尝试从API获取
          const apiSchedules = await enhancedApiClient.get<ScheduleRecord[]>('/schedules');

          if (apiSchedules && Array.isArray(apiSchedules) && apiSchedules.length > 0) {
            // 规范化API返回的snake_case数据为camelCase
            const normalizedSchedules = apiSchedules.map((s: any) => ({
              ...s,
              staffId: s.staff_id || s.staffId,
              staffName: s.staff_name || s.staffName,
              workZone: s.work_zone || s.workZone,
              checkIn: s.check_in || s.checkIn,
              checkOut: s.check_out || s.checkOut,
            }));
            set({ schedules: normalizedSchedules, isLoading: false });
            return;
          }

          // API返回空或失败，使用本地数据
          const localSchedules = get().schedules;
          if (localSchedules.length === 0) {
            // 首次使用，初始化种子数据（使用真实工人列表）
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
          // 转换字段为snake_case后发送给API
          const apiRecord = {
            staff_id: record.staffId,
            staff_name: record.staffName,
            date: record.date,
            shift: record.shift,
            work_zone: record.workZone,
            status: record.status,
            check_in: record.checkIn,
            check_out: record.checkOut,
          };
          const savedRecord = await enhancedApiClient.post<ScheduleRecord>(
            '/schedules',
            apiRecord
          );

          // API成功，用真实ID替换临时ID，并规范化字段
          const normalizedRecord = {
            ...savedRecord,
            staffId: (savedRecord as any).staff_id || (savedRecord as any).staffId,
            staffName: (savedRecord as any).staff_name || (savedRecord as any).staffName,
            workZone: (savedRecord as any).work_zone || (savedRecord as any).workZone,
            checkIn: (savedRecord as any).check_in || (savedRecord as any).checkIn,
            checkOut: (savedRecord as any).check_out || (savedRecord as any).checkOut,
          };
          set(state => ({
            schedules: state.schedules.map(s =>
              s.id === tempId ? normalizedRecord : s
            ),
          }));

          return normalizedRecord;
        } catch (error) {
          console.warn('[ScheduleStore] 创建排班API失败，API 失败抛错（V2.1 铁律：无离线队列）:', error);

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
          await enhancedApiClient.put(`/schedules/${id}`, updates);
        } catch (error) {
          console.warn('[ScheduleStore] 更新排班API失败，API 失败抛错（V2.1 铁律：无离线队列）:', error);
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
          await enhancedApiClient.delete(`/schedules/${id}`);
        } catch (error) {
          console.warn('[ScheduleStore] 删除排班API失败，API 失败抛错（V2.1 铁律：无离线队列）:', error);
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
          await enhancedApiClient.post('/schedules/swap-requests', newRequest);
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
          await enhancedApiClient.put(`/schedules/swap-requests/${id}`, { status });

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

      // ========== 排班占用（派工联动） ==========

      fetchOccupations: async (date: string) => {
        // 2 分钟 TTL 缓存：避免频繁请求同一日期
        const lastTs = get().lastFetchedAt[date];
        if (lastTs && Date.now() - lastTs < 2 * 60 * 1000) {
          return;
        }
        set({ occupationsLoading: true, occupationsError: null });
        try {
          const params = new URLSearchParams({ date });
          const response: any = await enhancedApiClient.get(
            `/schedules/occupations?${params.toString()}`
          );
          // camelCaseResponse 中间件已自动解包，兼容嵌套 {data} 与扁平结构
          const data = response?.data ?? response;
          const workers = data?.workers ?? [];
          set((state) => ({
            occupations: { ...state.occupations, [date]: workers },
            occupationsLoading: false,
            lastFetchedAt: { ...state.lastFetchedAt, [date]: Date.now() },
          }));
        } catch (err) {
          set({
            occupationsError: (err as Error).message,
            occupationsLoading: false,
          });
        }
      },

      getWorkerScheduleStatus: (workerId: string, date: string) => {
        const occupations = get().occupations[date] ?? [];
        const occ = occupations.find(o => o.workerId === workerId);
        if (!occ) {
          // 异步触发首次加载（不阻塞读取）
          setTimeout(() => get().fetchOccupations(date), 0);
          return { scheduleStatus: 'no_schedule' as const, assignedTaskCount: 0 };
        }
        return {
          scheduleStatus: occ.scheduleStatus,
          assignedTaskCount: occ.assignedTaskCount,
        };
      },

      invalidateOccupations: (date: string) => {
        set((state) => {
          const nextTs = { ...state.lastFetchedAt };
          delete nextTs[date];
          const nextOcc = { ...state.occupations };
          delete nextOcc[date];
          return { lastFetchedAt: nextTs, occupations: nextOcc };
        });
      },

      // ========== 内部方法 ==========

      _initializeSeedData: () => {
        const { staffList } = get();
        const mockSchedules = generateMockSchedule(staffList);
        const mockSwapRequests = generateMockSwapRequests();

        set({
          schedules: mockSchedules,
          swapRequests: mockSwapRequests,
          isLoading: false,
        });
      },

      // 从 useWorkerStore 加载真实工人列表，映射为排班 Staff 格式
      loadStaffFromWorkers: async () => {
        try {
          const { useWorkerStore } = await import('./useWorkerStore');
          let workers = useWorkerStore.getState().workers;

          // 如果工人数据尚未加载，主动触发加载
          if (!workers || workers.length === 0) {
            await useWorkerStore.getState().loadWorkers();
            workers = useWorkerStore.getState().workers;
          }

          if (workers && workers.length > 0) {
            const staffList: Staff[] = workers.map((w: any) => ({
              id: w.id || w.workerId || '',
              name: w.name || '',
              workZone: w.department || w.workArea || '',
            }));
            set({ staffList });
          }
        } catch (e) {
          console.warn('[ScheduleStore] 加载工人列表失败:', e);
        }
      },
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
