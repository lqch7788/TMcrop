/**
 * 劳动风险预警 Hook
 * V2.0: 数据源迁移到 useRiskStore (Zustand)
 * 2026-06-27 P0：改为 API 持久化（替换原 mock + persist），暴露 CRUD async actions
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { RiskAlert, RiskFilters, AlertLevel } from '../types';
import { useRiskStore } from '@/stores';
import type { RiskStats } from '@/stores/useRiskStore';
import type { CreateRiskAlertParams } from '@/services/apiRiskService';

interface UseRiskOptions {
  initialFilters?: RiskFilters;
}

export function useRisk(options: UseRiskOptions = {}) {
  // ========== Zustand Store ==========
  const alerts = useRiskStore((state) => state.alerts);
  const storeFilters = useRiskStore((state) => state.filters);
  const isLoading = useRiskStore((state) => state.isLoading);
  const error = useRiskStore((state) => state.error);
  const fetchAlerts = useRiskStore((state) => state.fetchAlerts);
  const storeUpdateFilters = useRiskStore((state) => state.updateFilters);
  const storeClearFilters = useRiskStore((state) => state.clearFilters);
  const storeHandleAlert = useRiskStore((state) => state.handleAlert);
  const storeAddAlert = useRiskStore((state) => state.addAlert);
  const storeDeleteAlert = useRiskStore((state) => state.deleteAlert);

  // 初始化：从后端加载（V2.1 铁律：API 直连，无缓存兜底）
  useEffect(() => {
    fetchAlerts().catch((e) => {
      console.error('[useRisk] fetchAlerts failed:', e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filters, setFilters] = useState<RiskFilters>(options.initialFilters || {});

  useEffect(() => {
    if (options.initialFilters && Object.keys(options.initialFilters).length > 0) {
      storeUpdateFilters(options.initialFilters);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAlerts = useMemo(() => {
    const activeFilters = { ...storeFilters, ...filters };
    return alerts.filter((alert) => {
      if (activeFilters.alertType && alert.alertType !== activeFilters.alertType) {
        return false;
      }
      if (activeFilters.level && alert.level !== activeFilters.level) {
        return false;
      }
      if (activeFilters.status && alert.status !== activeFilters.status) {
        return false;
      }
      if (activeFilters.keyword) {
        const kw = activeFilters.keyword.toLowerCase();
        return (
          alert.title.toLowerCase().includes(kw) ||
          alert.content?.toLowerCase().includes(kw) ||
          alert.staffName?.toLowerCase().includes(kw) ||
          alert.department?.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [alerts, storeFilters, filters]);

  const stats = useMemo((): RiskStats => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayCount = alerts.filter((a) => a.createTime.startsWith(today)).length;
    const weekCount = alerts.filter((a) => a.createTime >= weekAgo).length;
    const pendingCount = alerts.filter((a) => a.status === 'pending').length;

    const byLevel: Record<AlertLevel, number> = {
      warning: alerts.filter((a) => a.level === 'warning' && a.status === 'pending').length,
      danger: alerts.filter((a) => a.level === 'danger' && a.status === 'pending').length,
      critical: alerts.filter((a) => a.level === 'critical' && a.status === 'pending').length,
    };

    return {
      todayCount,
      weekCount,
      pendingCount,
      totalCount: alerts.length,
      byLevel,
    };
  }, [alerts]);

  /** 处理预警（async，2026-06-27 P0） */
  const handleAlert = useCallback(async (alertId: string, remarks: string) => {
    return storeHandleAlert(alertId, remarks);
  }, [storeHandleAlert]);

  /** 新增预警 */
  const addAlert = useCallback(async (alert: CreateRiskAlertParams): Promise<RiskAlert> => {
    return storeAddAlert(alert);
  }, [storeAddAlert]);

  /** 删除预警 */
  const deleteAlert = useCallback(async (alertId: string) => {
    return storeDeleteAlert(alertId);
  }, [storeDeleteAlert]);

  /** 主动刷新 */
  const refresh = useCallback(() => fetchAlerts(), [fetchAlerts]);

  const updateFilters = useCallback((newFilters: Partial<RiskFilters>) => {
    storeUpdateFilters(newFilters);
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, [storeUpdateFilters]);

  const clearFilters = useCallback(() => {
    storeClearFilters();
    setFilters({});
  }, [storeClearFilters]);

  const getAlertById = useCallback(
    (id: string) => {
      return alerts.find((alert) => alert.id === id) || null;
    },
    [alerts]
  );

  return {
    alerts: filteredAlerts,
    stats,
    filters: { ...storeFilters, ...filters },
    isLoading,
    error,
    updateFilters,
    clearFilters,
    handleAlert,
    addAlert,
    deleteAlert,
    refresh,
    getAlertById,
  };
}