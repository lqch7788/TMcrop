/**
 * 排班管理 Store - ScheduleStore
 *
 * V2.1 架构 - 已简化
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { todayLocal } from '../lib/dateUtils';

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

  // Actions - 排班占用（派工联动）
  fetchOccupations: (date: string, teamId?: string) => Promise<void>;
  getWorkerScheduleStatus: (workerId: string, date: string) => {
    scheduleStatus: 'on_duty' | 'off_duty' | 'no_schedule';
    assignedTaskCount: number;
  };
  invalidateOccupations: (date: string) => void;

  // Actions - 按班组批量排班（Task 8 新增）
  batchScheduleByTeam: (
    teamId: string,
    date: string,
    shift: ShiftType,
    workZone?: string,
  ) => Promise<{
    created: number;
    skipped: Array<{ workerId: string; reason: string }>;
  }>;
}

// ========== Store 实现 ==========

export const useScheduleStore = create<ScheduleState>()(
  (set, get) => ({
      // 初始状态（staffList 从 useWorkerStore 动态加载，不再硬编码）
      schedules: [],
      shiftConfigs: DEFAULT_SHIFT_CONFIGS,
      staffList: [],
      swapRequests: [],
      selectedDate: todayLocal(),
      viewMode: 'week',
      isLoading: false,
      error: null,

      // 排班占用（派工联动，按日期缓存，2 分钟 TTL）
      occupations: {} as Record<string, ScheduleOccupation[]>,
      occupationsLoading: false,
      occupationsError: null as string | null,
      lastFetchedAt: {} as Record<string, number>,

      // ========== 数据获取 ==========

      fetchSchedules: async () => {
        set({ isLoading: true, error: null });

        // 先从真实工人库加载工人列表（供排班表单选择）
        await get().loadStaffFromWorkers();

        try {
          // 从 API 获取（V2.1 铁律：API 是数据唯一来源，失败不降级为 mock）
          const apiSchedules = await enhancedApiClient.get<ScheduleApiRow[]>('/schedules');

          // 规范化API返回的snake_case数据为camelCase
          const normalizedSchedules = (apiSchedules || []).map(row => normalizeScheduleRow(row));
          set({ schedules: normalizedSchedules, isLoading: false });
        } catch (error) {
          // 失败显式抛错（Fail Loud），错误信息已写入 store.error
          const message = (error as Error).message;
          set({ error: message, isLoading: false });
          throw error;
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
          const savedRecord = await enhancedApiClient.post<ScheduleApiRow>(
            '/schedules',
            apiRecord
          );

          // API成功，用真实ID替换临时ID，并规范化字段
          const normalizedRecord = normalizeScheduleRow(savedRecord);
          set(state => ({
            schedules: state.schedules.map(s =>
              s.id === tempId ? normalizedRecord : s
            ),
          }));

          // 联动失效：派工占用缓存
          setTimeout(() => get().invalidateOccupations(record.date), 0);

          return normalizedRecord;
        } catch (error) {
          // 失败回滚乐观更新（V2.1 铁律：不允许本地假数据残留），并显式抛错（Fail Loud）
          set(state => ({
            schedules: state.schedules.filter(s => s.id !== tempId),
            error: (error as Error).message,
          }));
          throw error;
        }
      },

      updateSchedule: async (id, updates) => {
        // 记录原值（失败时回滚用）
        const original = get().schedules.find(s => s.id === id);
        // 先乐观更新本地
        const targetDate = original?.date;
        const newDate = updates.date ?? targetDate;
        set(state => ({
          schedules: state.schedules.map(s =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));

        try {
          await enhancedApiClient.put(`/schedules/${id}`, updates);
          // 联动失效：派工占用缓存
          // 如果排班改期（updates.date 变化），原日期 + 新日期两个日期都需要失效
          const datesToInvalidate = new Set<string>();
          if (targetDate) datesToInvalidate.add(targetDate);
          if (newDate && newDate !== targetDate) datesToInvalidate.add(newDate);
          if (datesToInvalidate.size > 0) {
            setTimeout(() => {
              datesToInvalidate.forEach(d => get().invalidateOccupations(d));
            }, 0);
          }
        } catch (error) {
          // 失败回滚乐观更新，并显式抛错（Fail Loud）
          set(state => ({
            schedules: original
              ? state.schedules.map(s => (s.id === id ? original : s))
              : state.schedules,
            error: (error as Error).message,
          }));
          throw error;
        }
      },

      deleteSchedule: async (id) => {
        // 记录原值（失败时回滚用）
        const original = get().schedules.find(s => s.id === id);
        const targetDate = original?.date;
        set(state => ({
          schedules: state.schedules.filter(s => s.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/schedules/${id}`);
          // 联动失效：派工占用缓存
          if (targetDate) {
            setTimeout(() => get().invalidateOccupations(targetDate), 0);
          }
        } catch (error) {
          // 失败回滚乐观删除，并显式抛错（Fail Loud）
          set(state => ({
            schedules: original ? [...state.schedules, original] : state.schedules,
            error: (error as Error).message,
          }));
          throw error;
        }
      },

      cancelSchedule: async (id) => {
        // updateSchedule 内部已触发 invalidateOccupations
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
          // 失败回滚乐观添加，并显式抛错（Fail Loud）
          set(state => ({
            swapRequests: state.swapRequests.filter(r => r.id !== newRequest.id),
            error: (error as Error).message,
          }));
          throw error;
        }

        // 联动失效：派工占用缓存（originalDate + targetDate 两个日期）
        // 提交调班申请后这两个日期的占用可能发生变化，需重新拉取
        setTimeout(() => {
          const dates = [request.originalDate, request.targetDate].filter(Boolean);
          dates.forEach(d => get().invalidateOccupations(d));
        }, 0);
      },

      handleSwapRequest: async (id, status) => {
        const request = get().swapRequests.find(r => r.id === id);
        set(state => ({
          swapRequests: state.swapRequests.map(req =>
            req.id === id ? { ...req, status } : req
          ),
        }));

        try {
          await enhancedApiClient.put(`/schedules/swap-requests/${id}`, { status });

          // 如果同意，执行调班
          if (status === '已同意' && request) {
            const originalSchedule = get().schedules.find(
              s => s.staffId === request.requesterId && s.date === request.originalDate
            );
            if (originalSchedule) {
              await get().updateSchedule(originalSchedule.id, {
                staffId: request.targetId,
                staffName: request.targetName,
              });
            }
            // 失效 originalDate + targetDate 两个日期的占用缓存
            if (request.originalDate) {
              setTimeout(() => get().invalidateOccupations(request.originalDate), 0);
            }
            if (request.targetDate) {
              setTimeout(() => get().invalidateOccupations(request.targetDate), 0);
            }
          } else if (request) {
            // 即使拒绝，也失效调班日的缓存（状态变化会反映在前端）
            if (request.originalDate) {
              setTimeout(() => get().invalidateOccupations(request.originalDate), 0);
            }
          }
        } catch (error) {
          // 失败回滚审批状态，并显式抛错（Fail Loud）
          set(state => ({
            swapRequests: state.swapRequests.map(req =>
              req.id === id ? { ...req, status: request?.status ?? '待审批' } : req
            ),
            error: (error as Error).message,
          }));
          throw error;
        }
      },

      // ========== 视图控制 ==========

      setSelectedDate: (date) => set({ selectedDate: date }),
      setViewMode: (mode) => set({ viewMode: mode }),

      // ========== 排班占用（派工联动） ==========

      fetchOccupations: async (date: string, teamId?: string) => {
        // 2 分钟 TTL 缓存：避免频繁请求同一日期
        const lastTs = get().lastFetchedAt[date];
        if (lastTs && Date.now() - lastTs < 2 * 60 * 1000) {
          return;
        }
        set({ occupationsLoading: true, occupationsError: null });
        try {
          const params = new URLSearchParams({ date });
          if (teamId) params.append('teamId', teamId);
          // enhancedApiClient 已自动解包一层 .data（统一响应格式 success/data 包装），
          // 此处直接读取 camelCase 字段；response 类型固定为 {date, workers}，避免 any
          const response = await enhancedApiClient.get<{ date: string; workers: ScheduleOccupation[] }>(
            `/schedules/occupations?${params.toString()}`
          );
          const workers = response?.workers ?? [];
          set((state) => ({
            occupations: { ...state.occupations, [date]: workers },
            occupationsLoading: false,
            lastFetchedAt: { ...state.lastFetchedAt, [date]: Date.now() },
          }));
        } catch (err) {
          // ★ 防死循环：API 失败时也要写入 lastFetchedAt，
          // 否则 getWorkerScheduleStatus cache miss 后每次 render 都会触发
          // setTimeout(() => fetchOccupations(date), 0)，陷入无限重试循环
          set((state) => ({
            occupationsError: (err as Error).message,
            occupationsLoading: false,
            lastFetchedAt: { ...state.lastFetchedAt, [date]: Date.now() },
          }));
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

      // ========== 按班组批量排班（Task 8 新增） ==========

      /**
       * 按班组批量排班：将指定班组在某日某班次的所有工人批量排进排班表。
       * 跳过当天已排班/冲突的工人，由后端返回 created + skipped 列表。
       * 排班完成后立即失效当日占用缓存，确保前端 getWorkerScheduleStatus
       * 下次读取时重新拉取最新数据。
       *
       * @param teamId 班组 ID
       * @param date 日期 YYYY-MM-DD
       * @param shift 班次类型
       * @param workZone 可选工作区域
       * @returns 后端返回的 created 数量与 skipped 明细
       */
      batchScheduleByTeam: async (
        teamId: string,
        date: string,
        shift: ShiftType,
        workZone?: string,
      ) => {
        const res = await enhancedApiClient.post<{
          created: number;
          skipped: Array<{ workerId: string; reason: string }>;
        }>('/schedules/batch-by-team', {
          teamId,
          date,
          shift,
          workZone,
        });
        // 刷新当日占用缓存（V2.1 铁律：API 是数据唯一来源，立即失效前端缓存）
        get().invalidateOccupations(date);
        return res;
      },

      // ========== 内部方法 ==========

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
            const staffList: Staff[] = workers.map((w: WorkerLike) => ({
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

// ========== Store 接收的后端行类型（snake_case 宽松类型，避免 any） ==========

/** 排班 API 返回行：含 snake_case 字段，兼容 camelCase（宽松类型避免 any） */
interface ScheduleApiRow {
  id: string;
  staff_id?: string | null;
  staff_name?: string | null;
  work_zone?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  workZone?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  date: string;
  shift: ShiftType;
  status: ScheduleStatus;
  remarks?: string | null;
}

/** 工人列表结构（来自 useWorkerStore，宽松类型避免 any） */
interface WorkerLike {
  id?: string;
  workerId?: string;
  name?: string;
  department?: string;
  workArea?: string;
}

// ========== 辅助函数 ==========

/**
 * 规范化后端 snake_case 排班行为前端 camelCase 格式
 */
function normalizeScheduleRow(row: ScheduleApiRow): ScheduleRecord {
  return {
    id: row.id,
    staffId: row.staff_id ?? row.staffId ?? '',
    staffName: row.staff_name ?? row.staffName ?? '',
    date: row.date,
    shift: row.shift,
    workZone: row.work_zone ?? row.workZone ?? '',
    status: row.status,
    checkIn: row.check_in ?? row.checkIn ?? undefined,
    checkOut: row.check_out ?? row.checkOut ?? undefined,
    remarks: row.remarks ?? undefined,
  };
}

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
