/**
 * 催办记录 Zustand Store (V2.1 架构)
 * 数据流：enhancedApiClient → /api/reminders → SQLite
 *
 * 2026-06-04 新增：V2.1 铁律改造（useReminder 从 localStorage 迁到后端）
 *
 * 注：useReminder.ts 保留 localStorage 行为作为离线缓存/向后兼容；
 *     新增路径走 Store → API → DB，调用方零改动。
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

export interface ReminderRecord {
  id: string;
  taskId: string;
  taskCode: string;
  taskTitle?: string;
  operatorId?: string;
  operatorName?: string;
  reminderType?: string;
  urgency?: string;
  message?: string;
  status?: string;
  createTime: string;
  completeTime?: string;
}

interface ReminderState {
  records: ReminderRecord[];
  isLoading: boolean;
  error: string | null;

  loadRecords: (filters?: { status?: string; taskId?: string }) => Promise<void>;
  sendReminder: (payload: Partial<ReminderRecord>) => Promise<ReminderRecord | null>;
  updateRecord: (id: string, updates: Partial<ReminderRecord>) => Promise<ReminderRecord | null>;
  deleteRecord: (id: string) => Promise<boolean>;
}

export const useReminderStore = create<ReminderState>()((set) => ({
  records: [],
  isLoading: false,
  error: null,

  loadRecords: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = await enhancedApiClient.get<ReminderRecord[]>('/reminders', { params: filters });
      set({ records: data || [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  sendReminder: async (payload) => {
    try {
      const result = await enhancedApiClient.post<ReminderRecord>('/reminders', payload);
      if (result) set((s) => ({ records: [result, ...s.records] }));
      return result;
    } catch (error) {
      return null;
    }
  },

  updateRecord: async (id, updates) => {
    try {
      const result = await enhancedApiClient.put<ReminderRecord>(`/reminders/${id}`, updates);
      if (result) set((s) => ({ records: s.records.map(r => r.id === id ? { ...r, ...result } : r) }));
      return result;
    } catch {
      return null;
    }
  },

  deleteRecord: async (id) => {
    try {
      await enhancedApiClient.delete(`/reminders/${id}`);
      set((s) => ({ records: s.records.filter(r => r.id !== id) }));
      return true;
    } catch {
      return false;
    }
  },
}));
