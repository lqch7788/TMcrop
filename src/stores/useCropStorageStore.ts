/**
 * 作物入库状态 Store - Zustand 替代 useCropStorageStore (localStorage + CustomEvent)
 * 用于审批联动：审批通过后更新作物入库记录状态
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface CropStorageStore {
  statusUpdates: Record<string, CropStorageStatusUpdate>;
  updateCropStorageStatus: (recordId: string, status: CropStorageStatusUpdate['status'], approvedBy?: string, remark?: string) => void;
  getCropStorageWithStatus: (record: CropStorageRecord) => CropStorageRecord;
  getStatusUpdates: () => Record<string, CropStorageStatusUpdate>;
  clearAllUpdates: () => void;
}

export const useCropStorageStore = create<CropStorageStore>()(
  persist(
    (set, get) => ({
      statusUpdates: {},

      updateCropStorageStatus: (recordId, status, approvedBy, remark) => {
        const update: CropStorageStatusUpdate = {
          recordId,
          status,
          approvedBy,
          approvedAt: new Date().toISOString(),
          remark,
        };
        set((state) => ({
          statusUpdates: { ...state.statusUpdates, [recordId]: update },
        }));
      },

      getCropStorageWithStatus: (record) => {
        const update = get().statusUpdates[record.id];
        return update ? { ...record, status: update.status } : record;
      },

      getStatusUpdates: () => get().statusUpdates,

      clearAllUpdates: () => set({ statusUpdates: {} }),
    }),
    {
      name: 'crop_storage_status_updates',
    }
  )
);
