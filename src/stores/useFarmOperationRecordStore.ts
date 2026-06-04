/**
 * 农事操作综合记录 Zustand Store (V2.1 架构)
 * 数据流：enhancedApiClient → /api/farm-operation-records → SQLite
 *
 * 2026-06-04 新增：V2.1 铁律改造（useOperationRecords 从 localStorage 迁到后端）
 *
 * 注：本表与老表 task_operation_records 并存，字段语义/聚合层级不同
 *     （聚合视图 vs 事件流），不取代。
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

export interface FarmOperationRecord {
  id: string;
  recordCode: string;
  sourceType: string;
  sourceId?: string;
  sourceCode?: string;
  operationType: string;
  operationTypeName?: string;
  status?: string;
  greenhouseId?: string;
  greenhouseName?: string;
  cropName?: string;
  variety?: string;
  batchId?: string;
  batchCode?: string;
  operatorId?: string;
  operatorName?: string;
  operationDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  workload?: number;
  workloadDays?: number;
  workloadHours?: number;
  workers?: number;
  unit?: string;
  materials?: { name: string; qty: number; unit: string }[];
  gpsLocation?: { lat: number; lng: number };
  photosBefore?: string[];
  photosAfter?: string[];
  voiceNote?: string;
  materialCode?: string;
  remarks?: string;
  progress?: number;
  progressIncrement?: number;
  area?: string;
  children?: unknown[];
  rejectReason?: string;
  createdAt: string;
  updatedAt?: string;
}

interface FarmOperationRecordState {
  records: FarmOperationRecord[];
  isLoading: boolean;
  error: string | null;

  loadRecords: (filters?: { sourceType?: string; status?: string; sourceId?: string }) => Promise<void>;
  addRecord: (payload: Partial<FarmOperationRecord>) => Promise<FarmOperationRecord | null>;
  updateRecord: (id: string, updates: Partial<FarmOperationRecord>) => Promise<FarmOperationRecord | null>;
  deleteRecord: (id: string) => Promise<boolean>;
}

export const useFarmOperationRecordStore = create<FarmOperationRecordState>()((set) => ({
  records: [],
  isLoading: false,
  error: null,

  loadRecords: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = await enhancedApiClient.get<FarmOperationRecord[]>('/farm-operation-records', { params: filters });
      set({ records: data || [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addRecord: async (payload) => {
    try {
      const result = await enhancedApiClient.post<FarmOperationRecord>('/farm-operation-records', payload);
      if (result) set((s) => ({ records: [result, ...s.records] }));
      return result;
    } catch {
      return null;
    }
  },

  updateRecord: async (id, updates) => {
    try {
      const result = await enhancedApiClient.put<FarmOperationRecord>(`/farm-operation-records/${id}`, updates);
      if (result) set((s) => ({ records: s.records.map(r => r.id === id ? { ...r, ...result } : r) }));
      return result;
    } catch {
      return null;
    }
  },

  deleteRecord: async (id) => {
    try {
      await enhancedApiClient.delete(`/farm-operation-records/${id}`);
      set((s) => ({ records: s.records.filter(r => r.id !== id) }));
      return true;
    } catch {
      return false;
    }
  },
}));
