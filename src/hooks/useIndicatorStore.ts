// ============================================================
// 指标状态管理Store
// 文件路径：src/hooks/useIndicatorStore.ts
// 用于审批联动：审批通过后更新指标状态
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'indicator_status_updates';

export interface IndicatorStatusUpdate {
  indicatorId: string;
  status: 'draft' | 'pending' | 'published' | 'archived';
  updatedAt: string;
  updatedBy?: string;
}

export interface Indicator {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  targetValue: number;
  actualValue?: number;
  period: string;
  status: 'draft' | 'pending' | 'published' | 'archived';
  publishTime?: string;
  remark?: string;
}

function getStatusUpdates(): Record<string, IndicatorStatusUpdate> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatusUpdate(update: IndicatorStatusUpdate): void {
  const updates = getStatusUpdates();
  updates[update.indicatorId] = update;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
}

export function updateIndicatorStatus(
  indicatorId: string,
  status: IndicatorStatusUpdate['status'],
  updatedBy?: string
): void {
  const update: IndicatorStatusUpdate = {
    indicatorId,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  saveStatusUpdate(update);
  window.dispatchEvent(new CustomEvent('indicatorStatusChanged', {
    detail: { indicatorId, status }
  }));
}

export function getIndicatorWithStatus(indicator: Indicator): Indicator {
  const updates = getStatusUpdates();
  const update = updates[indicator.id];
  if (update) {
    return { ...indicator, status: update.status };
  }
  return indicator;
}

export function useIndicatorStore() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const handleChange = () => refresh();
    window.addEventListener('indicatorStatusChanged', handleChange);
    return () => window.removeEventListener('indicatorStatusChanged', handleChange);
  }, [refresh]);

  return {
    updateIndicatorStatus,
    getIndicatorWithStatus,
    getStatusUpdates,
    refresh,
    refreshKey,
  };
}
