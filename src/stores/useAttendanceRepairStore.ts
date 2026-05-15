/**
 * 考勤补录 Zustand Store
 *
 * 架构：mock种子数据 + persist（后端API暂未实现，API服务返回空数据）
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 对接后端: /api/attendance-repair (待后端实现，目前走本地mock)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

/** 考勤补录记录（对齐组件类型 + API服务类型） */
export interface AttendanceRepairRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  statusLabel: string;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime: string;
}

/** 创建补录参数 */
export interface CreateAttendanceRepairParams {
  employeeId: string;
  employeeName: string;
  department: string;
  repairDate: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
  remarks?: string;
}

/** 更新补录参数 */
export interface UpdateAttendanceRepairParams {
  checkInTime?: string;
  checkOutTime?: string;
  reason?: string;
  status?: string;
  remarks?: string;
}

// ========== Mock 种子数据 ==========

function generateMockRepairData(): AttendanceRepairRecord[] {
  const employees = [
    { id: 'E001', name: '郭靖', dept: '生产部' },
    { id: 'E002', name: '杨过', dept: '生产部' },
    { id: 'E003', name: '黄蓉', dept: '技术部' },
    { id: 'E004', name: '张无忌', dept: '仓储部' },
    { id: 'E005', name: '令狐冲', dept: '运维部' },
    { id: 'E006', name: '任盈盈', dept: '技术部' },
  ];

  const reasons = ['忘记打卡', '外出办公', '出差', '其他'];
  const statuses: Array<{ status: AttendanceRepairRecord['status']; label: string }> = [
    { status: 'pending', label: '待审批' },
    { status: 'approved', label: '已通过' },
    { status: 'rejected', label: '已拒绝' },
    { status: 'pending', label: '待审批' },
  ];

  const records: AttendanceRepairRecord[] = [];
  const today = new Date();

  for (let i = 0; i < 8; i++) {
    const emp = employees[i % employees.length];
    const date = new Date(today);
    date.setDate(today.getDate() - Math.floor(i / 2));
    const dateStr = date.toISOString().split('T')[0];
    const st = statuses[i % statuses.length];

    records.push({
      id: `AR${String(i + 1).padStart(3, '0')}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.dept,
      repairDate: dateStr,
      checkInTime: `0${7 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      checkOutTime: `${17 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      status: st.status,
      statusLabel: st.label,
      approver: st.status !== 'pending' ? '刘经理' : undefined,
      approveTime: st.status !== 'pending' ? new Date(date.getTime() + 86400000).toISOString() : undefined,
      remarks: i === 2 ? '因公外出拜访客户' : undefined,
      createTime: new Date(date.getTime() - 3600000 * (i + 1)).toISOString(),
    });
  }

  return records;
}

// ========== Store 类型 ==========

interface AttendanceRepairState {
  /** 补录记录列表 */
  items: AttendanceRepairRecord[];
  /** 加载状态 */
  isLoading: boolean;
  error: string | null;

  // 数据获取
  fetchItems: (filters?: Record<string, string>, pagination?: { page: number; limit: number }) => Promise<void>;

  // CRUD
  createItem: (params: CreateAttendanceRepairParams) => Promise<AttendanceRepairRecord>;
  updateItem: (id: string, updates: UpdateAttendanceRepairParams) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
}

// ========== Store 实现 ==========

export const useAttendanceRepairStore = create<AttendanceRepairState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      /** 获取补录记录列表 */
      fetchItems: async (filters, pagination) => {
        set({ isLoading: true, error: null });

        try {
          // 尝试从API获取
          const response = await enhancedApiClient.get<{
            records: AttendanceRepairRecord[];
            pagination: { page: number; limit: number; total: number };
          }>('/attendance-repair', {
            params: { ...filters, ...pagination },
            useCache: true,
            cacheStrategy: 'network-first',
          });

          if (response?.records && Array.isArray(response.records) && response.records.length > 0) {
            set({ items: response.records, isLoading: false });
            return;
          }

          // API返回空，使用本地数据
          const localItems = get().items;
          if (localItems.length === 0) {
            const seedData = generateMockRepairData();
            set({ items: seedData, isLoading: false });
            // 种子数据初始化完成
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[AttendanceRepairStore] API获取失败，使用本地数据:', error);

          const localItems = get().items;
          if (localItems.length === 0) {
            const seedData = generateMockRepairData();
            set({ items: seedData, isLoading: false });
          } else {
            set({ error: (error as Error).message, isLoading: false });
          }
        }
      },

      /** 创建补录记录 */
      createItem: async (params) => {
        const tempId = `AR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newItem: AttendanceRepairRecord = {
          id: tempId,
          employeeId: params.employeeId,
          employeeName: params.employeeName,
          department: params.department,
          repairDate: params.repairDate,
          checkInTime: params.checkInTime,
          checkOutTime: params.checkOutTime,
          reason: params.reason,
          status: 'pending',
          statusLabel: '待审批',
          remarks: params.remarks,
          createTime: new Date().toISOString(),
        };

        // 乐观更新本地
        set((state) => ({ items: [newItem, ...state.items] }));

        // 尝试API创建
        try {
          const saved = await enhancedApiClient.post<AttendanceRepairRecord>(
            '/attendance-repair', params, { offlineQueue: true }
          );
          if (saved?.id) {
            set((state) => ({
              items: state.items.map((item) =>
                item.id === tempId ? { ...saved, id: saved.id } : item
              ),
            }));
            return saved;
          }
        } catch (error) {
          console.warn('[AttendanceRepairStore] API创建失败，已保存到本地:', error);
        }

        return newItem;
      },

      /** 更新补录记录 */
      updateItem: async (id, updates) => {
        // 乐观更新本地
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, ...updates };
            // 同步更新 statusLabel
            if (updates.status) {
              const statusLabelMap: Record<string, string> = {
                pending: '待审批',
                approved: '已通过',
                rejected: '已拒绝',
                cancelled: '已取消',
              };
              updated.statusLabel = statusLabelMap[updates.status] || updates.status;
            }
            return updated;
          }),
        }));

        // 尝试API更新
        try {
          await enhancedApiClient.put(`/attendance-repair/${id}`, updates, { offlineQueue: true });
          return true;
        } catch (error) {
          console.warn('[AttendanceRepairStore] API更新失败:', error);
          return false;
        }
      },

      /** 删除补录记录 */
      deleteItem: async (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));

        try {
          await enhancedApiClient.delete(`/attendance-repair/${id}`, { offlineQueue: true });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'attendance-repair-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
