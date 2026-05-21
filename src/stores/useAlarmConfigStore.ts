/**
 * 警报配置 Zustand Store — iAGS Warning 集成
 *
 * 三级警报级别配置 + 联系人管理
 * 对接后端: /api/alarm-configs
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 类型定义 ====================

export interface AlarmLevel {
  id: number;
  level: number;
  levelName: string;
  notifyEmail: number;
  notifySms: number;
  notifyPhone: number;
  updatedAt: string | null;
}

export interface AlarmContact {
  id: number;
  oid: string;
  level: number;
  contactName: string;
  contactInfo: string;
  contactType: string;
  status: string;
  createdAt: string | null;
}

// ==================== 级别默认值 ====================

export const LEVEL_DEFAULTS: AlarmLevel[] = [
  { id: 0, level: 1, levelName: '一级警报', notifyEmail: 1, notifySms: 0, notifyPhone: 0, updatedAt: null },
  { id: 0, level: 2, levelName: '二级警报', notifyEmail: 1, notifySms: 1, notifyPhone: 0, updatedAt: null },
  { id: 0, level: 3, levelName: '三级警报', notifyEmail: 1, notifySms: 1, notifyPhone: 1, updatedAt: null },
];

export const LEVEL_LABELS: Record<number, string> = { 1: '一级警报', 2: '二级警报', 3: '三级警报' };

export const LEVEL_COLORS: Record<number, string> = {
  1: 'text-red-600 bg-red-50 border-red-200',
  2: 'text-orange-600 bg-orange-50 border-orange-200',
  3: 'text-yellow-600 bg-yellow-50 border-yellow-200',
};

// ==================== Store 接口 ====================

interface AlarmConfigState {
  levels: AlarmLevel[];
  contacts: AlarmContact[];
  isLoading: boolean;
  error: string | null;

  fetchLevels: () => Promise<void>;
  saveLevel: (level: number, data: Partial<AlarmLevel>) => Promise<void>;
  fetchContacts: (level?: number) => Promise<void>;
  addContact: (data: { level: number; contactName: string; contactInfo: string; contactType: string }) => Promise<AlarmContact | null>;
  removeContact: (oid: string) => Promise<boolean>;
}

// ==================== 辅助函数 ====================

function normalizeLevel(db: Record<string, unknown>): AlarmLevel {
  return {
    id: db.id as number ?? 0,
    level: db.level as number,
    levelName: (db.level_name as string) || db.levelName as string || '',
    notifyEmail: (db.notify_email as number) ?? db.notifyEmail as number ?? 0,
    notifySms: (db.notify_sms as number) ?? db.notifySms as number ?? 0,
    notifyPhone: (db.notify_phone as number) ?? db.notifyPhone as number ?? 0,
    updatedAt: (db.updated_at as string) || db.updatedAt as string || null,
  };
}

function normalizeContact(db: Record<string, unknown>): AlarmContact {
  return {
    id: db.id as number ?? 0,
    oid: db.oid as string,
    level: db.level as number,
    contactName: (db.contact_name as string) || db.contactName as string || '',
    contactInfo: (db.contact_info as string) || db.contactInfo as string || '',
    contactType: (db.contact_type as string) || db.contactType as string || 'email',
    status: (db.status as string) || 'active',
    createdAt: (db.created_at as string) || db.createdAt as string || null,
  };
}

// ==================== 创建 Store ====================

export const useAlarmConfigStore = create<AlarmConfigState>()(
  (set, get) => ({
      levels: LEVEL_DEFAULTS,
      contacts: [],
      isLoading: false,
      error: null,

      fetchLevels: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>('/api/alarm-configs/levels');
          const data = Array.isArray(response?.data) ? response.data : [];
          const merged = LEVEL_DEFAULTS.map(def => {
            const api = data.find(d => d.level === def.level);
            return api ? normalizeLevel(api) : def;
          });
          set({ levels: merged, isLoading: false });
        } catch (error) {
          console.warn('[AlarmConfigStore] 获取级别失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      saveLevel: async (level, data) => {
        set((state) => ({
          levels: state.levels.map(l => l.level === level ? { ...l, ...data } : l),
        }));
        try {
          const body: Record<string, unknown> = { level_name: data.levelName, notify_email: data.notifyEmail, notify_sms: data.notifySms, notify_phone: data.notifyPhone };
          await enhancedApiClient.put(`/api/alarm-configs/levels/${level}`, body);
        } catch (error) {
          console.warn('[AlarmConfigStore] 保存级别失败:', error);
        }
      },

      fetchContacts: async (level) => {
        try {
          const params = new URLSearchParams();
          if (level) params.set('level', String(level));
          const query = params.toString();
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>(`/api/alarm-configs/contacts?${query}`);
          const data = Array.isArray(response?.data) ? response.data : [];
          set({ contacts: data.map(normalizeContact) });
        } catch (error) {
          console.warn('[AlarmConfigStore] 获取联系人失败:', error);
        }
      },

      addContact: async (data) => {
        try {
          const body = { level: data.level, contact_name: data.contactName, contact_info: data.contactInfo, contact_type: data.contactType };
          const response = await enhancedApiClient.post<{ success: boolean; data: any }>('/api/alarm-configs/contacts', body);
          const saved = (response as any)?.data || response;
          const newContact = normalizeContact({ ...data, ...saved });
          set((state) => ({ contacts: [newContact, ...state.contacts] }));
          return newContact;
        } catch (error) {
          console.warn('[AlarmConfigStore] 添加联系人失败:', error);
          return null;
        }
      },

      removeContact: async (oid) => {
        set((state) => ({ contacts: state.contacts.filter(c => c.oid !== oid) }));
        try {
          await enhancedApiClient.delete(`/api/alarm-configs/contacts/${oid}`);
          return true;
        } catch (error) {
          console.warn('[AlarmConfigStore] 删除联系人失败:', error);
          return false;
        }
      },
    })
);
