/**
 * 设备管理 Store
 *
 * 种子数据来自 data/farm/farmData，后续可对接后端 API
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ========== 类型定义 ==========

export interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  greenhouseId?: string;
  status: 'normal' | 'maintenance' | 'broken';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

// ========== 种子数据 ==========

const DEFAULT_EQUIPMENT: Equipment[] = [
  { id: 'EQ001', code: 'EQ001', name: '1号灌溉水泵', type: '水泵', location: '玻璃温室A区', greenhouseId: 'G001', status: 'normal', lastMaintenanceDate: '2026-01-15', nextMaintenanceDate: '2026-04-15' },
  { id: 'EQ002', code: 'EQ002', name: '2号灌溉水泵', type: '水泵', location: '玻璃温室B区', greenhouseId: 'G002', status: 'normal', lastMaintenanceDate: '2026-01-20', nextMaintenanceDate: '2026-04-20' },
  { id: 'EQ003', code: 'EQ003', name: '1号通风扇', type: '通风设备', location: '玻璃温室C区', greenhouseId: 'G003', status: 'normal', lastMaintenanceDate: '2026-02-10', nextMaintenanceDate: '2026-05-10' },
  { id: 'EQ004', code: 'EQ004', name: '2号通风扇', type: '通风设备', location: '日光温室1号', greenhouseId: 'G004', status: 'maintenance', lastMaintenanceDate: '2025-12-01', nextMaintenanceDate: '2026-03-01' },
  { id: 'EQ005', code: 'EQ005', name: '1号卷帘机', type: '卷帘设备', location: '日光温室2号', greenhouseId: 'G005', status: 'normal', lastMaintenanceDate: '2026-02-28', nextMaintenanceDate: '2026-05-28' },
  { id: 'EQ006', code: 'EQ006', name: '自动施肥机', type: '施肥设备', location: '塑料大棚1号', greenhouseId: 'G008', status: 'normal', lastMaintenanceDate: '2026-03-01', nextMaintenanceDate: '2026-06-01' },
  { id: 'EQ007', code: 'EQ007', name: '滴灌控制系统', type: '灌溉设备', location: '玻璃温室A区', greenhouseId: 'G001', status: 'normal', lastMaintenanceDate: '2026-01-10', nextMaintenanceDate: '2026-04-10' },
  { id: 'EQ008', code: 'EQ008', name: '温室监控摄像头', type: '监控设备', location: '玻璃温室A区', greenhouseId: 'G001', status: 'broken', lastMaintenanceDate: '2025-11-20', nextMaintenanceDate: '2026-02-20' },
];

// ========== Store ==========

interface EquipmentState {
  equipment: Equipment[];
  isLoading: boolean;
  error: string | null;

  fetchEquipment: () => Promise<void>;
  addEquipment: (item: Omit<Equipment, 'id' | 'code'>) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      equipment: [],
      isLoading: false,
      error: null,

      fetchEquipment: async () => {
        if (get().equipment.length > 0) return;
        set({ isLoading: true });
        try {
          // TODO: 对接后端 API /api/equipment
          // const data = await enhancedApiClient.get<Equipment[]>('/equipment');
          // if (data && data.length > 0) { set({ equipment: data, isLoading: false }); return; }
          set({ equipment: DEFAULT_EQUIPMENT, isLoading: false });
        } catch {
          set({ equipment: DEFAULT_EQUIPMENT, isLoading: false });
        }
      },

      addEquipment: (item) => {
        const newId = `EQ${String(get().equipment.length + 1).padStart(3, '0')}`;
        const newItem: Equipment = { ...item, id: newId, code: newId };
        set((s) => ({ equipment: [...s.equipment, newItem] }));
      },

      updateEquipment: (id, updates) => {
        set((s) => ({
          equipment: s.equipment.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }));
      },

      deleteEquipment: (id) => {
        set((s) => ({ equipment: s.equipment.filter((e) => e.id !== id) }));
      },
    }),
    {
      name: 'equipment-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ equipment: state.equipment }),
    }
  )
);
