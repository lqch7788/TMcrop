/**
 * 加班管理 Zustand Store (V2.0 架构改造)
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件 (组件不直接读写 localStorage)
 *
 * 对接后端: /api/overtime
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

/** 加班类型枚举（后端英文值） */
export type OvertimeType = 'workday' | 'weekend' | 'holiday';

/** 加班状态枚举（后端英文值） */
export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** 加班类型中文标签映射 */
export const OVERTIME_TYPE_LABELS: Record<string, string> = {
  workday: '工作日加班',
  weekend: '休息日加班',
  holiday: '节假日加班',
};

/** 加班状态中文标签映射 */
export const OVERTIME_STATUS_LABELS: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
};

/** 前端使用的加班记录接口（camelCase） */
export interface OvertimeRecord {
  id: string;
  workerId: string;
  workerName: string;
  overtimeType: OvertimeType;
  overtimeTypeLabel?: string;
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  baseSalary?: number;
  hourlyRate?: number;
  overtimePay?: number;
  reason: string;
  status: OvertimeStatus;
  statusLabel?: string;
  departmentId?: string;
  departmentName?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  approvalCode?: string;
  approvedAt?: string;
  remarks?: string;
  version?: number;
  createTime?: string;
  updateTime?: string;
}

export interface OvertimeFilters {
  workerName?: string;
  overtimeType?: OvertimeType;
  status?: OvertimeStatus;
  startDate?: string;
  endDate?: string;
}

// ==================== 第二步：字段映射表 ====================

/**
 * 后端(snake_case) → 前端(camelCase) 字段名映射
 */
const FIELD_MAP: Record<string, string> = {
  worker_id: 'workerId',
  worker_name: 'workerName',
  overtime_type: 'overtimeType',
  work_date: 'workDate',
  start_time: 'startTime',
  end_time: 'endTime',
  hours: 'hours',
  base_salary: 'baseSalary',
  hourly_rate: 'hourlyRate',
  overtime_pay: 'overtimePay',
  reason: 'reason',
  status: 'status',
  department_id: 'departmentId',
  department_name: 'departmentName',
  greenhouse_id: 'greenhouseId',
  greenhouse_name: 'greenhouseName',
  approval_code: 'approvalCode',
  approved_at: 'approvedAt',
  remarks: 'remarks',
  version: 'version',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ==================== 第三步：规范化/反规范化函数 ====================

/**
 * 后端数据 → 前端数据（API 响应处理）
 */
function normalize(db: Record<string, unknown>): OvertimeRecord {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 设置默认值
  result.id = result.id ?? `OT_${Date.now()}`;
  result.workerId = result.workerId || result.worker_id || '';
  result.workerName = result.workerName || result.worker_name || '';
  result.overtimeType = result.overtimeType || result.overtime_type || 'workday';
  result.workDate = result.workDate || result.work_date || '';
  result.hours = result.hours ?? 0;
  result.reason = result.reason || '';
  result.status = result.status || 'pending';
  // 计算中文标签
  result.overtimeTypeLabel =
    result.overtimeTypeLabel ||
    OVERTIME_TYPE_LABELS[result.overtimeType as string] ||
    result.overtimeType;
  result.statusLabel =
    result.statusLabel ||
    OVERTIME_STATUS_LABELS[result.status as string] ||
    result.status;
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  result.updateTime = result.updateTime || result.update_time || '';
  result.startTime = result.startTime || result.start_time || '';
  result.endTime = result.endTime || result.end_time || '';
  return result as unknown as OvertimeRecord;
}

/**
 * 前端数据 → 后端数据（API 请求体处理）
 */
function denormalize(data: Partial<OvertimeRecord>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    // 跳过标签字段（仅前端使用）
    if (key === 'overtimeTypeLabel' || key === 'statusLabel') continue;
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== 第四步：种子数据（API不可用时降级使用） ====================

/** mock种子数据 — API不可用时降级使用 */
const SEED_DATA: OvertimeRecord[] = [
  {
    id: 'OT001',
    workerId: 'S001',
    workerName: '郭靖',
    overtimeType: 'workday',
    overtimeTypeLabel: '工作日加班',
    workDate: '2024-03-15',
    startTime: '18:00',
    endTime: '21:00',
    hours: 3,
    hourlyRate: 50,
    overtimePay: 225,
    reason: '紧急订单处理',
    status: 'approved',
    statusLabel: '已通过',
    approvedAt: '2024-03-15 18:00',
    createTime: '2024-03-15 09:00:00',
  },
  {
    id: 'OT002',
    workerId: 'S002',
    workerName: '杨过',
    overtimeType: 'weekend',
    overtimeTypeLabel: '休息日加班',
    workDate: '2024-03-16',
    startTime: '09:00',
    endTime: '13:00',
    hours: 4,
    hourlyRate: 50,
    overtimePay: 400,
    reason: '设备维护',
    status: 'approved',
    statusLabel: '已通过',
    approvedAt: '2024-03-16 10:00',
    createTime: '2024-03-15 14:00:00',
  },
  {
    id: 'OT003',
    workerId: 'S003',
    workerName: '张无忌',
    overtimeType: 'workday',
    overtimeTypeLabel: '工作日加班',
    workDate: '2024-03-20',
    startTime: '18:00',
    endTime: '20:00',
    hours: 2,
    hourlyRate: 60,
    overtimePay: 180,
    reason: '客户来访准备',
    status: 'pending',
    statusLabel: '待审批',
    createTime: '2024-03-20 08:30:00',
  },
  {
    id: 'OT004',
    workerId: 'S004',
    workerName: '令狐冲',
    overtimeType: 'holiday',
    overtimeTypeLabel: '节假日加班',
    workDate: '2024-04-01',
    startTime: '08:00',
    endTime: '14:00',
    hours: 6,
    hourlyRate: 50,
    overtimePay: 900,
    reason: '春耕生产',
    status: 'approved',
    statusLabel: '已通过',
    approvedAt: '2024-04-01 08:30',
    createTime: '2024-03-31 16:00:00',
  },
  {
    id: 'OT005',
    workerId: 'S005',
    workerName: '段誉',
    overtimeType: 'workday',
    overtimeTypeLabel: '工作日加班',
    workDate: '2024-04-05',
    startTime: '18:00',
    endTime: '21:00',
    hours: 3,
    reason: '物资整理',
    status: 'rejected',
    statusLabel: '已拒绝',
    approvedAt: '2024-04-04 16:00',
    remarks: '无需加班',
    createTime: '2024-04-04 10:00:00',
  },
  {
    id: 'OT006',
    workerId: 'S006',
    workerName: '黄蓉',
    overtimeType: 'weekend',
    overtimeTypeLabel: '休息日加班',
    workDate: '2024-04-10',
    startTime: '09:00',
    endTime: '14:00',
    hours: 5,
    hourlyRate: 55,
    overtimePay: 550,
    reason: '促销活动准备',
    status: 'approved',
    statusLabel: '已通过',
    approvedAt: '2024-04-10 09:00',
    createTime: '2024-04-09 15:00:00',
  },
  {
    id: 'OT007',
    workerId: 'S007',
    workerName: '陈家洛',
    overtimeType: 'workday',
    overtimeTypeLabel: '工作日加班',
    workDate: '2024-04-15',
    startTime: '18:00',
    endTime: '20:00',
    hours: 2,
    hourlyRate: 50,
    overtimePay: 150,
    reason: '会议加班',
    status: 'pending',
    statusLabel: '待审批',
    createTime: '2024-04-15 09:00:00',
  },
  {
    id: 'OT008',
    workerId: 'S008',
    workerName: '任盈盈',
    overtimeType: 'workday',
    overtimeTypeLabel: '工作日加班',
    workDate: '2024-04-20',
    startTime: '18:00',
    endTime: '22:00',
    hours: 4,
    hourlyRate: 55,
    overtimePay: 330,
    reason: '项目赶工',
    status: 'approved',
    statusLabel: '已通过',
    approvedAt: '2024-04-20 17:30',
    createTime: '2024-04-20 09:00:00',
  },
];

// ==================== 第五步：Store 接口 ====================

interface OvertimeState {
  /** 数据列表 */
  overtimeRecords: OvertimeRecord[];
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 筛选条件（UI状态，持久化） */
  filters: OvertimeFilters;

  // CRUD 方法
  fetchItems: (queryFilters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<OvertimeRecord>) => Promise<OvertimeRecord | null>;
  updateItem: (id: string, updates: Partial<OvertimeRecord>) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;

  // 审批方法
  approveOvertime: (id: string, approverName?: string) => Promise<void>;
  rejectOvertime: (id: string, reason?: string) => Promise<void>;
  cancelOvertime: (id: string) => Promise<void>;

  // 筛选
  setFilters: (filters: Partial<OvertimeFilters>) => void;
}

// ==================== 第六步：创建 Store ====================

export const useOvertimeStore = create<OvertimeState>()(
  persist(
    (set, get) => ({
      overtimeRecords: [],
      isLoading: false,
      error: null,
      filters: {},

      // ---------- 查询（READ）----------
      fetchItems: async (queryFilters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (queryFilters) {
            Object.entries(queryFilters).forEach(([k, v]) => {
              if (v) params.set(k, v);
            });
          }
          const query = params.toString();
          const url = `/overtime${query ? `?${query}` : ''}`;

          const data = await enhancedApiClient.get<Record<string, unknown>[]>(url);
          const normalized = (Array.isArray(data) ? data : []).map(normalize);

          // API 无数据时使用种子数据
          if (normalized.length === 0) {
            set({ overtimeRecords: SEED_DATA, isLoading: false });
            return;
          }

          set({ overtimeRecords: normalized, isLoading: false });
        } catch (error) {
          console.warn('[OvertimeStore] API获取失败，使用种子数据:', error);
          // API 失败时降级到种子数据
          const current = get().overtimeRecords;
          if (current.length === 0) {
            set({ overtimeRecords: SEED_DATA, isLoading: false });
          } else {
            set({ isLoading: false });
          }
          set({ error: (error as Error).message });
        }
      },

      // ---------- 创建（CREATE）— 乐观更新 ----------
      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{
            success: boolean;
            data: { id: string };
          }>('/overtime', body, { offlineQueue: true, priority: 0 });

          // enhancedApiClient 已自动提取 .data，response 直接就是 { id }
          const newId = (response as any)?.id || `OT${Date.now()}`;
          const newItem = normalize({
            ...data,
            id: newId,
            status: data.status || 'pending',
            createTime: new Date().toISOString(),
          } as Record<string, unknown>);

          set((state) => ({ overtimeRecords: [newItem, ...state.overtimeRecords] }));
          return newItem;
        } catch (error) {
          console.warn('[OvertimeStore] 创建加班记录失败，已加入离线队列:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      // ---------- 更新（UPDATE）— 乐观更新 ----------
      updateItem: async (id, updates) => {
        const body = denormalize(updates);
        // 先更新本地状态，再调 API
        set((state) => ({
          overtimeRecords: state.overtimeRecords.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...updates,
                  overtimeTypeLabel: updates.overtimeType
                    ? OVERTIME_TYPE_LABELS[updates.overtimeType] || updates.overtimeType
                    : item.overtimeTypeLabel,
                  statusLabel: updates.status
                    ? OVERTIME_STATUS_LABELS[updates.status] || updates.status
                    : item.statusLabel,
                  updateTime: new Date().toISOString(),
                }
              : item
          ),
        }));

        try {
          await enhancedApiClient.put(`/overtime/${id}`, body, {
            offlineQueue: true,
            priority: 0,
          });
        } catch (error) {
          console.warn('[OvertimeStore] 更新加班记录失败，已加入离线队列:', error);
        }
      },

      // ---------- 删除单个（DELETE）— 乐观更新 ----------
      deleteItem: async (id) => {
        set((state) => ({
          overtimeRecords: state.overtimeRecords.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/overtime/${id}`, {
            offlineQueue: true,
            priority: 0,
          });
          return true;
        } catch (error) {
          console.warn('[OvertimeStore] 删除加班记录失败，已加入离线队列:', error);
          return false;
        }
      },

      // ---------- 批量删除（BATCH DELETE）— 乐观更新 ----------
      deleteItems: async (ids) => {
        set((state) => ({
          overtimeRecords: state.overtimeRecords.filter(
            (item) => !ids.includes(item.id)
          ),
        }));

        try {
          await Promise.all(
            ids.map((id) =>
              enhancedApiClient
                .delete(`/overtime/${id}`, { offlineQueue: true, priority: 0 })
                .catch(() => {})
            )
          );
          return true;
        } catch {
          return false;
        }
      },

      // ========== 审批方法 ==========

      /**
       * 审批通过
       */
      approveOvertime: async (id, approverName) => {
        const now = new Date().toISOString();
        const updates: Partial<OvertimeRecord> = {
          status: 'approved' as OvertimeStatus,
          approvedAt: now,
        };
        // 乐观更新
        set((state) => ({
          overtimeRecords: state.overtimeRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  statusLabel: '已通过',
                  updateTime: now,
                }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(
            `/overtime/${id}`,
            denormalize({ ...updates, approver: approverName || '' }),
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[OvertimeStore] 审批加班失败:', error);
        }
      },

      /**
       * 审批驳回
       */
      rejectOvertime: async (id, reason) => {
        const updates: Partial<OvertimeRecord> = {
          status: 'rejected' as OvertimeStatus,
          remarks: reason || '',
        };
        set((state) => ({
          overtimeRecords: state.overtimeRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  statusLabel: '已拒绝',
                  updateTime: new Date().toISOString(),
                }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/overtime/${id}`, denormalize(updates), {
            offlineQueue: true,
            priority: 0,
          });
        } catch (error) {
          console.warn('[OvertimeStore] 驳回加班失败:', error);
        }
      },

      /**
       * 取消加班
       */
      cancelOvertime: async (id) => {
        const updates: Partial<OvertimeRecord> = {
          status: 'cancelled' as OvertimeStatus,
        };
        set((state) => ({
          overtimeRecords: state.overtimeRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  statusLabel: '已取消',
                  updateTime: new Date().toISOString(),
                }
              : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/overtime/${id}`, denormalize(updates), {
            offlineQueue: true,
            priority: 0,
          });
        } catch (error) {
          console.warn('[OvertimeStore] 取消加班失败:', error);
        }
      },

      // ========== 筛选 ==========

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },
    }),
    {
      // ==================== 第七步：持久化配置 ====================
      name: 'overtime-data-storage',
      partialize: (state) => ({
        overtimeRecords: state.overtimeRecords,
        filters: state.filters,
      }),
    }
  )
);

// ==================== 辅助函数 ====================

/** 按员工ID筛选加班记录 */
export const getOvertimeByWorker = (workerId: string) => {
  return useOvertimeStore.getState().overtimeRecords.filter(
    (r) => r.workerId === workerId
  );
};

/** 按状态筛选加班记录 */
export const getOvertimeByStatus = (status: OvertimeStatus) => {
  return useOvertimeStore.getState().overtimeRecords.filter(
    (r) => r.status === status
  );
};

/** 按日期范围筛选加班记录 */
export const getOvertimeByDateRange = (startDate: string, endDate: string) => {
  return useOvertimeStore.getState().overtimeRecords.filter(
    (r) => r.workDate >= startDate && r.workDate <= endDate
  );
};

/** 计算员工在指定日期范围内的总加班时长（仅已审批） */
export const getTotalOvertimeHours = (
  workerId: string,
  startDate: string,
  endDate: string
) => {
  return useOvertimeStore
    .getState()
    .overtimeRecords.filter(
      (r) =>
        r.workerId === workerId &&
        r.status === 'approved' &&
        r.workDate >= startDate &&
        r.workDate <= endDate
    )
    .reduce((sum, r) => sum + r.hours, 0);
};
