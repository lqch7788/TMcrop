/**
 * 劳动风险预警 Hook
 * V2.0: 数据源迁移到 useRiskStore (Zustand)
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { RiskAlert, RiskFilters, AlertLevel } from '../types';
import { useRiskStore } from '@/stores';
import type { RiskStats } from '@/stores/useRiskStore';

// Hook配置
interface UseRiskOptions {
  initialFilters?: RiskFilters;
}

export function useRisk(options: UseRiskOptions = {}) {
  // ========== Zustand Store ==========
  const alerts = useRiskStore((state) => state.alerts);
  const storeFilters = useRiskStore((state) => state.filters);
  const fetchAlerts = useRiskStore((state) => state.fetchAlerts);
  const storeUpdateFilters = useRiskStore((state) => state.updateFilters);
  const storeClearFilters = useRiskStore((state) => state.clearFilters);
  const storeHandleAlert = useRiskStore((state) => state.handleAlert);

  // 初始化种子数据
  useEffect(() => {
    if (alerts.length === 0) {
      fetchAlerts();
    }
  }, [alerts.length, fetchAlerts]);

  // 本地筛选状态（初始从 options 获取，后续由 store 管理）
  const [filters, setFilters] = useState<RiskFilters>(options.initialFilters || {});

  // 初始化时同步 options 到 store
  useEffect(() => {
    if (options.initialFilters && Object.keys(options.initialFilters).length > 0) {
      storeUpdateFilters(options.initialFilters);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 根据筛选条件过滤数据
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
          alert.content.toLowerCase().includes(kw) ||
          alert.staffName?.toLowerCase().includes(kw) ||
          alert.department?.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [alerts, storeFilters, filters]);

  // 统计数据
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

  // 处理预警
  const handleAlert = useCallback((alertId: string, remarks: string) => {
    storeHandleAlert(alertId, remarks);
  }, [storeHandleAlert]);

  // 更新筛选条件
  const updateFilters = useCallback((newFilters: Partial<RiskFilters>) => {
    storeUpdateFilters(newFilters);
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, [storeUpdateFilters]);

  // 清除筛选条件
  const clearFilters = useCallback(() => {
    storeClearFilters();
    setFilters({});
  }, [storeClearFilters]);

  // 获取单个预警详情
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
    updateFilters,
    clearFilters,
    handleAlert,
    getAlertById,
  };
}
