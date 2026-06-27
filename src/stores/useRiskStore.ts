/**
 * 劳动风险预警 Zustand Store
 *
 * 架构：Component → Zustand Store → apiRiskService → enhancedApiClient → 后端API (SQLite)
 * 数据流：V2.1 铁律（无缓存、无 persist、无 IndexedDB）
 *
 * 2026-06-27 P0：原 mock + persist 模式已废弃，改为 API 持久化模式
 */

import { create } from 'zustand';
import * as riskService from '../services/apiRiskService';
import type {
  RiskAlert,
  CreateRiskAlertParams,
  UpdateRiskAlertParams,
  AlertLevel,
} from '../services/apiRiskService';

export type { RiskAlert, AlertLevel };

export interface RiskFilters {
  level?: string;
  alertType?: string;
  department?: string;
  keyword?: string;
}

interface RiskState {
  alerts: RiskAlert[];
  filters: RiskFilters;
  isLoading: boolean;
  error: string | null;

  // 数据操作
  fetchAlerts: () => Promise<void>;
  addAlert: (alert: CreateRiskAlertParams) => Promise<RiskAlert>;
  handleAlert: (alertId: string, remarks: string) => Promise<RiskAlert>;
  deleteAlert: (alertId: string) => Promise<boolean>;
  updateFilters: (newFilters: Partial<RiskFilters>) => void;
  clearFilters: () => void;
}

export const useRiskStore = create<RiskState>()(
  (set, get) => ({
    alerts: [],
    filters: {},
    isLoading: false,
    error: null,

    /** 加载预警列表 */
    fetchAlerts: async () => {
      set({ isLoading: true, error: null });
      try {
        const f = get().filters;
        const response = await riskService.getRiskAlerts({
          level: f.level || undefined,
          alertType: f.alertType || undefined,
          department: f.department || undefined,
          keyword: f.keyword || undefined,
        });
        set({ alerts: response.records, isLoading: false });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '加载风险预警失败';
        set({ error: msg, isLoading: false });
        throw e;
      }
    },

    /** 新增预警 */
    addAlert: async (alert) => {
      const created = await riskService.createRiskAlert({
        alertType: alert.alertType,
        alertTypeName: alert.alertTypeName,
        level: alert.level || 'warning',
        title: alert.title,
        content: alert.content,
        staffId: alert.staffId,
        staffName: alert.staffName,
        department: alert.department,
        status: alert.status || 'pending',
        remarks: alert.remarks,
      });
      set((state) => ({ alerts: [created, ...state.alerts] }));
      return created;
    },

    /** 处理预警 */
    handleAlert: async (alertId, remarks) => {
      const now = new Date().toISOString();
      const updated = await riskService.updateRiskAlert(alertId, {
        status: 'handled',
        handleTime: now,
        handler: '当前用户', // TODO: 从 auth store 取
        remarks,
      });
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === alertId ? updated : a)),
      }));
      return updated;
    },

    /** 删除预警 */
    deleteAlert: async (alertId) => {
      await riskService.deleteRiskAlert(alertId);
      set((state) => ({ alerts: state.alerts.filter((a) => a.id !== alertId) }));
      return true;
    },

    /** 更新筛选条件 */
    updateFilters: (newFilters) => {
      set((state) => ({ filters: { ...state.filters, ...newFilters } }));
    },

    /** 清除筛选条件 */
    clearFilters: () => {
      set({ filters: {} });
    },
  })
);