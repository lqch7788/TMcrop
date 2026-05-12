/**
 * 巡查状态 Store - Zustand 替代 useInspectionStore (localStorage + CustomEvent)
 * 用于审批联动：审批通过后更新巡查问题状态
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface InspectionStore {
  statusUpdates: Record<string, InspectionStatusUpdate>;
  updateInspectionStatus: (inspectionId: string, status: InspectionStatusUpdate['status'], updatedBy?: string) => void;
  getInspectionWithStatus: (inspection: Inspection) => Inspection;
  getStatusUpdates: () => Record<string, InspectionStatusUpdate>;
  clearAllUpdates: () => void;
}

export const useInspectionStore = create<InspectionStore>()(
  persist(
    (set, get) => ({
      statusUpdates: {},

      updateInspectionStatus: (inspectionId, status, updatedBy) => {
        const update: InspectionStatusUpdate = {
          inspectionId,
          status,
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set((state) => ({
          statusUpdates: { ...state.statusUpdates, [inspectionId]: update },
        }));
      },

      getInspectionWithStatus: (inspection) => {
        const update = get().statusUpdates[inspection.id];
        return update ? { ...inspection, status: update.status } : inspection;
      },

      getStatusUpdates: () => get().statusUpdates,

      clearAllUpdates: () => set({ statusUpdates: {} }),
    }),
    {
      name: 'inspection_status_updates',
    }
  )
);
