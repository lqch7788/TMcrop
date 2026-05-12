// ============================================================
// 作物入库状态管理Store
// 文件路径：src/hooks/useCropStorageStore.ts
// 用于审批联动：审批通过后更新作物入库记录状态
// 已迁移到 Zustand Store (src/stores/useCropStorageStore.ts)
// 本文件保留用于向后兼容
// ============================================================

import { useCropStorageStore as useZustandCropStorageStore } from '../stores/useCropStorageStore';

export type { CropStorageStatusUpdate, CropStorageRecord } from '../stores/useCropStorageStore';

export function useCropStorageStore() {
  const store = useZustandCropStorageStore();

  return {
    updateCropStorageStatus: store.updateCropStorageStatus,
    getCropStorageWithStatus: store.getCropStorageWithStatus,
    getStatusUpdates: store.getStatusUpdates,
    refresh: () => {},
    refreshKey: 0,
  };
}

export { updateCropStorageStatus, getCropStorageWithStatus, getStatusUpdates } from '../stores/useCropStorageStore';
