/**
 * 告警管理 Store - AlertStore
 *
 * Phase 5: 告警模块
 *
 * 设计原则：
 * 1. 优先调用API获取告警数据
 * 2. 支持离线缓存
 * 3. 支持告警确认和解决
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'ignored';

export interface Alert {
  id: string;
  alert_code: string;
  alert_type: string;
  level: AlertLevel;
  title: string;
  message: string;
  source_type: string;
  source_id?: string;
  source_name?: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolved_note?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertStats {
  total: number;
  pending: number;
  acknowledged: number;
  resolved: number;
  ignored: number;
  critical: number;
  error: number;
  warning: number;
  info: number;
}

export interface AlertFilters {
  level?: AlertLevel;
  status?: AlertStatus;
  source_type?: string;
  greenhouse_id?: string;
}

// ========== Store 类型 ==========

interface AlertState {
  // 数据
  alerts: Alert[];
  selectedAlert: Alert | null;
  stats: AlertStats | null;

  // 视图状态
  filters: AlertFilters;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // Actions - 数据获取
  fetchAlerts: (filters?: AlertFilters) => Promise<void>;
  fetchAlertStats: () => Promise<void>;
  fetchAlertById: (id: string) => Promise<Alert | null>;

  // Actions - 告警操作
  acknowledgeAlert: (id: string, user_id: string) => Promise<void>;
  resolveAlert: (id: string, user_id: string, note?: string) => Promise<void>;
  ignoreAlert: (id: string) => Promise<void>;

  // Actions - 筛选
  setFilters: (filters: Partial<AlertFilters>) => void;
  clearFilters: () => void;

  // Actions - 选择
  setSelectedAlert: (alert: Alert | null) => void;
}

// ========== Store 实现 ==========

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      // 初始状态
      alerts: [],
      selectedAlert: null,
      stats: null,
      filters: {},
      isLoading: false,
      error: null,

      // ========== 数据获取 ==========

      fetchAlerts: async (filters) => {
        set({ isLoading: true, error: null });

        try {
          const params = new URLSearchParams();
          if (filters?.level) params.set('level', filters.level);
          if (filters?.status) params.set('status', filters.status);
          if (filters?.source_type) params.set('source_type', filters.source_type);
          if (filters?.greenhouse_id) params.set('greenhouse_id', filters.greenhouse_id);

          const apiData = await enhancedApiClient.get<{ data: Alert[] }>(`/alerts?${params.toString()}`);

          if (apiData && Array.isArray(apiData)) {
            set({ alerts: apiData, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[AlertStore] 获取告警列表失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      fetchAlertStats: async () => {
        try {
          const data = await enhancedApiClient.get<{ data: AlertStats }>('/alerts/stats/summary');
          if (data) {
            set({ stats: data });
          }
        } catch (error) {
          console.warn('[AlertStore] 获取告警统计失败:', error);
        }
      },

      fetchAlertById: async (id) => {
        try {
          const data = await enhancedApiClient.get<{ data: Alert }>(`/alerts/${id}`);
          return data || null;
        } catch (error) {
          console.warn('[AlertStore] 获取告警详情失败:', error);
          return null;
        }
      },

      // ========== 告警操作 ==========

      acknowledgeAlert: async (id, user_id) => {
        // 乐观更新
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === id ? { ...a, status: 'acknowledged', acknowledged_by: user_id, acknowledged_at: new Date().toISOString() } : a
          ),
        }));

        try {
          await enhancedApiClient.put(`/alerts/${id}/acknowledge`, { acknowledged_by: user_id });
        } catch (error) {
          console.warn('[AlertStore] 确认告警API失败:', error);
          // 回滚可以通过重新fetchAlerts恢复
        }
      },

      resolveAlert: async (id, user_id, note) => {
        // 乐观更新
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === id ? { ...a, status: 'resolved', resolved_by: user_id, resolved_at: new Date().toISOString(), resolved_note: note } : a
          ),
        }));

        try {
          await enhancedApiClient.put(`/alerts/${id}/resolve`, { resolved_by: user_id, resolved_note: note });
        } catch (error) {
          console.warn('[AlertStore] 解决告警API失败:', error);
        }
      },

      ignoreAlert: async (id) => {
        // 乐观更新
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === id ? { ...a, status: 'ignored' } : a
          ),
        }));

        try {
          await enhancedApiClient.put(`/alerts/${id}/ignore`, {});
        } catch (error) {
          console.warn('[AlertStore] 忽略告警API失败:', error);
        }
      },

      // ========== 筛选 ==========

      setFilters: (filters) => {
        set(state => ({
          filters: { ...state.filters, ...filters },
        }));
        // 自动重新获取数据
        get().fetchAlerts(get().filters);
      },

      clearFilters: () => {
        set({ filters: {} });
        get().fetchAlerts();
      },

      // ========== 选择 ==========

      setSelectedAlert: (alert) => {
        set({ selectedAlert: alert });
      },
    }),
    {
      name: 'alert-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        alerts: state.alerts,
        filters: state.filters,
      }),
    }
  )
);

// ========== 辅助函数 ==========

export const getPendingAlerts = () => {
  return useAlertStore.getState().alerts.filter(a => a.status === 'pending');
};

export const getAlertsByLevel = (level: AlertLevel) => {
  return useAlertStore.getState().alerts.filter(a => a.level === level);
};

export const getAlertsByGreenhouse = (greenhouseId: string) => {
  return useAlertStore.getState().alerts.filter(a => a.greenhouse_id === greenhouseId);
};

export const getCriticalAlerts = () => {
  return useAlertStore.getState().alerts.filter(a => a.level === 'critical' && a.status !== 'resolved' && a.status !== 'ignored');
};
