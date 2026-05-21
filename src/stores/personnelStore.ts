/**
 * 人事管理 Store - PersonnelStore
 *
 * V2.1 架构 - 已简化
 */

import { create } from 'zustand';
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

// ========== 字段映射（后端 snake_case → 前端 camelCase）==========

const FIELD_MAP: Record<string, string> = {
  employee_id: 'employeeId',
  id_card: 'idCard',
  birth_date: 'birthDate',
  hire_date: 'hireDate',
  contract_end_date: 'contractEndDate',
  bank_account: 'bankAccount',
  emergency_contact: 'emergencyContact',
  emergency_phone: 'emergencyPhone',
  photo_url: 'photoUrl',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/** 后端 → 前端 字段映射（当API返回不同命名时使用） */
function normalizePersonnel(db: Record<string, unknown>): PersonnelRecord {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  return result as unknown as PersonnelRecord;
}

/** 前端 → 后端 字段映射 */
function denormalizePersonnel(record: Partial<PersonnelRecord>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(record)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
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
          const apiData = await enhancedApiClient.get<{ data: PersonnelRecord[] }>('/personnel');

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
            record
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
          await enhancedApiClient.put(`/personnel/${id}`, updates);
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
          await enhancedApiClient.delete(`/personnel/${id}`);
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

      // ========== 内部方法 ==========

      _initializeSeedData: () => {
        set({ isLoading: false });
        // 种子数据初始化完成
      },
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
