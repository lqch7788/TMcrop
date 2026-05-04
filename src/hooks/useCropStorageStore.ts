// ============================================================
// 作物入库状态管理Store
// 文件路径：src/hooks/useCropStorageStore.ts
// 用于审批联动：审批通过后更新作物入库记录状态
// ============================================================

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'crop_storage_status_updates';

export interface CropStorageStatusUpdate {
  recordId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  remark?: string;
}

export interface CropStorageRecord {
  id: string;
  code: string;
  cropType: string;
  batchCode: string;
  quantity: number;
  unit: string;
  storageLocation: string;
  storageDate: string;
  qualityGrade?: string;
  status: 'pending' | 'approved' | 'rejected';
  operator?: string;
  remark?: string;
}

function getStatusUpdates(): Record<string, CropStorageStatusUpdate> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStatusUpdate(update: CropStorageStatusUpdate): void {
  const updates = getStatusUpdates();
  updates[update.recordId] = update;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
}

export function updateCropStorageStatus(
  recordId: string,
  status: CropStorageStatusUpdate['status'],
  approvedBy?: string,
  remark?: string
): void {
  const update: CropStorageStatusUpdate = {
    recordId,
    status,
    approvedBy,
    approvedAt: new Date().toISOString(),
    remark,
  };
  saveStatusUpdate(update);
  window.dispatchEvent(new CustomEvent('cropStorageStatusChanged', {
    detail: { recordId, status }
  }));
}

export function getCropStorageWithStatus(record: CropStorageRecord): CropStorageRecord {
  const updates = getStatusUpdates();
  const update = updates[record.id];
  if (update) {
    return { ...record, status: update.status };
  }
  return record;
}

export function useCropStorageStore() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const handleChange = () => refresh();
    window.addEventListener('cropStorageStatusChanged', handleChange);
    return () => window.removeEventListener('cropStorageStatusChanged', handleChange);
  }, [refresh]);

  return {
    updateCropStorageStatus,
    getCropStorageWithStatus,
    getStatusUpdates,
    refresh,
    refreshKey,
  };
}
