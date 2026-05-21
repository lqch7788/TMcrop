/**
 * 通知设置 Store - Zustand 状态管理
 * 统一管理通知渠道、规则和用户偏好
 */
import { create } from 'zustand';
import {
  getChannels, createChannel, updateChannel, deleteChannel, toggleChannel,
  getRules, createRule, updateRule, deleteRule, toggleRule,
  getPreferences, savePreferences,
  type NotificationChannel,
  type NotificationRule,
  type NotificationPreferences,
} from '../services/apiNotificationService';

interface NotificationSettingsStore {
  channels: NotificationChannel[];
  rules: NotificationRule[];
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadAll: () => Promise<void>;
  loadChannels: () => Promise<void>;
  loadRules: () => Promise<void>;
  loadPreferences: (userOid: string) => Promise<void>;

  addChannel: (data: Partial<NotificationChannel>) => Promise<NotificationChannel>;
  updateChannel: (id: string, data: Partial<NotificationChannel>) => Promise<void>;
  removeChannel: (id: string) => Promise<void>;
  toggleChannelActive: (id: string) => Promise<void>;

  addRule: (data: Partial<NotificationRule>) => Promise<NotificationRule>;
  updateRule: (id: string, data: Partial<NotificationRule>) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  toggleRuleActive: (id: string) => Promise<void>;

  saveUserPreferences: (userOid: string, prefs: Partial<NotificationPreferences>) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useNotificationSettingsStore = create<NotificationSettingsStore>()(
  (set, get) => ({
      channels: [],
      rules: [],
      preferences: null,
      loading: false,
      error: null,
      lastFetch: null,

      loadAll: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().channels.length > 0) return;

        set({ loading: true, error: null });
        try {
          const [channels, rules] = await Promise.all([getChannels(), getRules()]);
          set({ channels, rules, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载通知数据失败', loading: false });
        }
      },

      loadChannels: async () => {
        try { const data = await getChannels(); set({ channels: data }); }
        catch (error) { set({ error: error instanceof Error ? error.message : '加载渠道失败' }); }
      },

      loadRules: async () => {
        try { const data = await getRules(); set({ rules: data }); }
        catch (error) { set({ error: error instanceof Error ? error.message : '加载规则失败' }); }
      },

      loadPreferences: async (userOid) => {
        try { const data = await getPreferences(userOid); set({ preferences: data }); }
        catch (error) { set({ error: error instanceof Error ? error.message : '加载偏好失败' }); }
      },

      addChannel: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createChannel(data);
          set((s) => ({ channels: [...s.channels, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建渠道失败', loading: false });
          throw error;
        }
      },

      updateChannel: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateChannel(id, data);
          set((s) => ({ channels: s.channels.map((c) => c.id === id ? { ...c, ...data } : c), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新渠道失败', loading: false });
          throw error;
        }
      },

      removeChannel: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteChannel(id);
          set((s) => ({ channels: s.channels.filter((c) => c.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除渠道失败', loading: false });
          throw error;
        }
      },

      toggleChannelActive: async (id) => {
        try {
          await toggleChannel(id);
          set((s) => ({ channels: s.channels.map((c) => c.id === id ? { ...c, isActive: !c.isActive } : c) }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '切换渠道状态失败' });
        }
      },

      addRule: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createRule(data);
          set((s) => ({ rules: [...s.rules, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建规则失败', loading: false });
          throw error;
        }
      },

      updateRule: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateRule(id, data);
          set((s) => ({ rules: s.rules.map((r) => r.id === id ? { ...r, ...data } : r), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新规则失败', loading: false });
          throw error;
        }
      },

      removeRule: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteRule(id);
          set((s) => ({ rules: s.rules.filter((r) => r.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除规则失败', loading: false });
          throw error;
        }
      },

      toggleRuleActive: async (id) => {
        try {
          await toggleRule(id);
          set((s) => ({ rules: s.rules.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r) }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '切换规则状态失败' });
        }
      },

      saveUserPreferences: async (userOid, prefs) => {
        set({ loading: true, error: null });
        try {
          await savePreferences(userOid, prefs);
          set((s) => ({ preferences: s.preferences ? { ...s.preferences, ...prefs } : null, loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '保存偏好失败', loading: false });
          throw error;
        }
      },

      refreshAll: async () => {
        set({ lastFetch: null });
        await get().loadAll();
      },
    })
);
