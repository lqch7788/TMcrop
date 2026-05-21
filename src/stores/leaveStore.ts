/**
 * 请假管理 Zustand Store
 *
 * V2.1 架构 - 已简化
 *
 * 对接后端: /api/leave
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

/** 请假类型枚举（后端英文值） */
export type LeaveType = 'annual' | 'sick' | 'personal' | 'marriage' | 'maternity' | 'paternity' | 'bereavement' | 'work_injury';

/** 请假状态枚举（后端英文值） */
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';

/** 请假类型中文标签映射 */
export const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: '年假',
  sick: '病假',
  personal: '事假',
  marriage: '婚假',
  maternity: '产假',
  paternity: '陪产假',
  bereavement: '丧假',
  work_injury: '工伤假',
};

/** 请假状态中文标签映射 */
export const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
  withdrawn: '已撤回',
};

/** 前端使用的请假记录接口（camelCase） */
export interface LeaveRecord {
  id: string;
  workerId: string;
  workerName: string;
  leaveType: LeaveType;
  leaveTypeLabel?: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  statusLabel?: string;
  departmentId?: string;
  departmentName?: string;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime?: string;
  updateTime?: string;
}

export interface LeaveFilters {
  workerName?: string;
  leaveType?: LeaveType;
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
}

// ==================== 第二步：字段映射表 ====================

/**
 * 后端(snake_case) → 前端(camelCase) 字段名映射
 * 全局常量，normalize 和 denormalize 两处复用
 */
const FIELD_MAP: Record<string, string> = {
  worker_id: 'workerId',
  worker_name: 'workerName',
  leave_type: 'leaveType',
  start_date: 'startDate',
  end_date: 'endDate',
  days: 'days',
  reason: 'reason',
  status: 'status',
  approver: 'approver',
  approve_time: 'approveTime',
  remarks: 'remarks',
  department_id: 'departmentId',
  department_name: 'departmentName',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ==================== 第三步：规范化/反规范化函数 ====================

/**
 * 后端数据 → 前端数据（API 响应处理）
 * 容错设计：同时支持嵌套 {data: [...]} 和扁平数组两种响应格式
 */
function normalize(db: Record<string, unknown>): LeaveRecord {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 设置默认值
  result.id = result.id ?? `LV_${Date.now()}`;
  result.workerId = result.workerId || result.worker_id || '';
  result.workerName = result.workerName || result.worker_name || '';
  result.leaveType = result.leaveType || result.leave_type || 'personal';
  result.startDate = result.startDate || result.start_date || '';
  result.endDate = result.endDate || result.end_date || '';
  result.days = result.days ?? 0;
  result.reason = result.reason || '';
  result.status = result.status || 'pending';
  // 计算中文标签
  result.leaveTypeLabel = result.leaveTypeLabel || LEAVE_TYPE_LABELS[result.leaveType as string] || result.leaveType;
  result.statusLabel = result.statusLabel || LEAVE_STATUS_LABELS[result.status as string] || result.status;
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  result.updateTime = result.updateTime || result.update_time || '';
  return result as unknown as LeaveRecord;
}

/**
 * 前端数据 → 后端数据（API 请求体处理）
 */
function denormalize(data: Partial<LeaveRecord>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    // 跳过标签字段（仅前端使用）
    if (key === 'leaveTypeLabel' || key === 'statusLabel') continue;
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== 第四步：Store 接口 ====================

interface LeaveState {
  /** 数据列表 */
  leaveRecords: LeaveRecord[];
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 筛选条件（UI状态，持久化） */
  filters: LeaveFilters;

  // CRUD 方法
  fetchItems: (queryFilters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<LeaveRecord>) => Promise<LeaveRecord | null>;
  updateItem: (id: string, updates: Partial<LeaveRecord>) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;

  // 审批方法
  approveLeave: (id: string, approverName?: string) => Promise<void>;
  rejectLeave: (id: string, reason?: string) => Promise<void>;
  cancelLeave: (id: string) => Promise<void>;

  // 筛选
  setFilters: (filters: Partial<LeaveFilters>) => void;
}

// ==================== 第五步：创建 Store ====================

export const useLeaveStore = create<LeaveState>()(
  (set, get) => ({
      leaveRecords: [],
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
          const url = `/leave${query ? `?${query}` : ''}`;

          const data = await enhancedApiClient.get<Record<string, unknown>[]>(url);
          const normalized = (Array.isArray(data) ? data : []).map(normalize);
          set({ leaveRecords: normalized, isLoading: false });
        } catch (error) {
          console.warn('[LeaveStore] API获取失败，使用本地缓存:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ---------- 创建（CREATE）— 乐观更新 ----------
      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{
            success: boolean;
            data: { id: string };
          }>('/leave', body);

          // enhancedApiClient 已自动提取 .data，response 直接就是 { id }
          const newId = (response as any)?.id || `LV${Date.now()}`;
          const newItem = normalize({
            ...data,
            id: newId,
            status: data.status || 'pending',
            createTime: new Date().toISOString(),
          } as Record<string, unknown>);

          set((state) => ({ leaveRecords: [newItem, ...state.leaveRecords] }));
          return newItem;
        } catch (error) {
          console.warn('[LeaveStore] 创建请假记录失败，已加入离线队列:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      // ---------- 更新（UPDATE）— 乐观更新 ----------
      updateItem: async (id, updates) => {
        const body = denormalize(updates);
        // 先更新本地状态（用户即时看到结果），再调用 API
        set((state) => ({
          leaveRecords: state.leaveRecords.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...updates,
                  // 如果更新了状态/类型，同步更新标签
                  leaveTypeLabel: updates.leaveType
                    ? LEAVE_TYPE_LABELS[updates.leaveType] || updates.leaveType
                    : item.leaveTypeLabel,
                  statusLabel: updates.status
                    ? LEAVE_STATUS_LABELS[updates.status] || updates.status
                    : item.statusLabel,
                  updateTime: new Date().toISOString(),
                }
              : item
          ),
        }));

        try {
          await enhancedApiClient.put(`/leave/${id}`, body);
        } catch (error) {
          console.warn('[LeaveStore] 更新请假记录失败，已加入离线队列:', error);
        }
      },

      // ---------- 删除单个（DELETE）— 乐观更新 ----------
      deleteItem: async (id) => {
        set((state) => ({
          leaveRecords: state.leaveRecords.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/leave/${id}`);
          return true;
        } catch (error) {
          console.warn('[LeaveStore] 删除请假记录失败，已加入离线队列:', error);
          return false;
        }
      },

      // ---------- 批量删除（BATCH DELETE）— 乐观更新 ----------
      deleteItems: async (ids) => {
        set((state) => ({
          leaveRecords: state.leaveRecords.filter((item) => !ids.includes(item.id)),
        }));

        try {
          await Promise.all(
            ids.map((id) =>
              enhancedApiClient
                .delete(`/leave/${id}`)
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
      approveLeave: async (id, approverName) => {
        const now = new Date().toISOString();
        const updates: Partial<LeaveRecord> = {
          status: 'approved' as LeaveStatus,
          approver: approverName || '',
          approveTime: now,
        };
        // 乐观更新
        set((state) => ({
          leaveRecords: state.leaveRecords.map((r) =>
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
          await enhancedApiClient.put(`/leave/${id}`, denormalize(updates));
        } catch (error) {
          console.warn('[LeaveStore] 审批请假失败:', error);
        }
      },

      /**
       * 审批驳回
       */
      rejectLeave: async (id, reason) => {
        const updates: Partial<LeaveRecord> = {
          status: 'rejected' as LeaveStatus,
          remarks: reason || '',
        };
        set((state) => ({
          leaveRecords: state.leaveRecords.map((r) =>
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
          await enhancedApiClient.put(`/leave/${id}`, denormalize(updates));
        } catch (error) {
          console.warn('[LeaveStore] 驳回请假失败:', error);
        }
      },

      /**
       * 取消请假
       */
      cancelLeave: async (id) => {
        const updates: Partial<LeaveRecord> = {
          status: 'cancelled' as LeaveStatus,
        };
        set((state) => ({
          leaveRecords: state.leaveRecords.map((r) =>
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
          await enhancedApiClient.put(`/leave/${id}`, denormalize(updates));
        } catch (error) {
          console.warn('[LeaveStore] 取消请假失败:', error);
        }
      },

      // ========== 筛选 ==========

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },
    }
  )
);

// ==================== 辅助函数 ====================

/** 按员工ID筛选请假记录 */
export const getLeaveByWorker = (workerId: string) => {
  return useLeaveStore.getState().leaveRecords.filter((r) => r.workerId === workerId);
};

/** 按状态筛选请假记录 */
export const getLeaveByStatus = (status: LeaveStatus) => {
  return useLeaveStore.getState().leaveRecords.filter((r) => r.status === status);
};

/** 按日期范围筛选请假记录 */
export const getLeaveByDateRange = (startDate: string, endDate: string) => {
  return useLeaveStore.getState().leaveRecords.filter(
    (r) => r.startDate >= startDate && r.endDate <= endDate
  );
};
