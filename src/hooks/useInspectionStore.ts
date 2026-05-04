// ============================================================
// 巡查状态管理Store
// 文件路径：src/hooks/useInspectionStore.ts
// 用于审批联动：审批通过后更新巡查问题状态
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'inspection_status_updates';

export interface InspectionStatusUpdate {
  inspectionId: string;
  status: 'pending' | 'dispatched' | 'processing' | 'resolved' | 'closed';
  updatedAt: string;
  updatedBy?: string;
}

export interface Inspection {
  id: string;
  code: string;
  inspectionDate: string;
  location: string;
  inspectorId: string;
  inspectorName: string;
  findings: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'dispatched' | 'processing' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  resolvedAt?: string;
  remark?: string;
}

function getStatusUpdates(): Record<string, InspectionStatusUpdate> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatusUpdate(update: InspectionStatusUpdate): void {
  const updates = getStatusUpdates();
  updates[update.inspectionId] = update;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
}

export function updateInspectionStatus(
  inspectionId: string,
  status: InspectionStatusUpdate['status'],
  updatedBy?: string
): void {
  const update: InspectionStatusUpdate = {
    inspectionId,
    status,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  saveStatusUpdate(update);
  window.dispatchEvent(new CustomEvent('inspectionStatusChanged', {
    detail: { inspectionId, status }
  }));
}

export function getInspectionWithStatus(inspection: Inspection): Inspection {
  const updates = getStatusUpdates();
  const update = updates[inspection.id];
  if (update) {
    return { ...inspection, status: update.status };
  }
  return inspection;
}

export function useInspectionStore() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const handleChange = () => refresh();
    window.addEventListener('inspectionStatusChanged', handleChange);
    return () => window.removeEventListener('inspectionStatusChanged', handleChange);
  }, [refresh]);

  return {
    updateInspectionStatus,
    getInspectionWithStatus,
    getStatusUpdates,
    refresh,
    refreshKey,
  };
}
