/**
 * 指标状态 Store - Zustand 替代 useIndicatorStore (localStorage + CustomEvent)
 * 用于审批联动：审批通过后更新指标状态
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface IndicatorStore {
  statusUpdates: Record<string, IndicatorStatusUpdate>;
  updateIndicatorStatus: (indicatorId: string, status: IndicatorStatusUpdate['status'], updatedBy?: string) => void;
  getIndicatorWithStatus: (indicator: Indicator) => Indicator;
  getStatusUpdates: () => Record<string, IndicatorStatusUpdate>;
  clearAllUpdates: () => void;
}

export const useIndicatorStore = create<IndicatorStore>()(
  persist(
    (set, get) => ({
      statusUpdates: {},

      updateIndicatorStatus: (indicatorId, status, updatedBy) => {
        const update: IndicatorStatusUpdate = {
          indicatorId,
          status,
          updatedAt: new Date().toISOString(),
          updatedBy,
        };
        set((state) => ({
          statusUpdates: { ...state.statusUpdates, [indicatorId]: update },
        }));
      },

      getIndicatorWithStatus: (indicator) => {
        const update = get().statusUpdates[indicator.id];
        return update ? { ...indicator, status: update.status } : indicator;
      },

      getStatusUpdates: () => get().statusUpdates,

      clearAllUpdates: () => set({ statusUpdates: {} }),
    }),
    {
      name: 'indicator_status_updates',
    }
  )
);
