/**
 * 农事操作综合记录 Zustand Store (V2.1 架构)
 * 数据流：enhancedApiClient → /api/farm-operation-records → SQLite
 *
 * 2026-10-20 P0-1：改为服务端权威
 * - 写入失败一律 throw（原实现 catch 后 return null，属静默失败）
 * - loadRecords 支持过滤条件（URLSearchParams 拼 URL，apiClient 不支持 params 对象）
 * - 模块级 in-flight Promise：多组件同时挂载只发一次请求
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

export interface LoadOperationRecordsFilters {
  sourceType?: string;
  status?: string;
  sourceId?: string;
}

/** 模块级 in-flight Promise：多处挂载共享同一次加载 */
let loadInflight: Promise<void> | null = null;

interface FarmOperationRecordState {
  records: FarmOperationRecord[];
  isLoading: boolean;
  error: string | null;

  loadRecords: (filters?: LoadOperationRecordsFilters) => Promise<void>;
  addRecord: (payload: Partial<FarmOperationRecord>) => Promise<FarmOperationRecord>;
  updateRecord: (id: string, updates: Partial<FarmOperationRecord>) => Promise<FarmOperationRecord>;
  deleteRecord: (id: string) => Promise<void>;
}

export const useFarmOperationRecordStore = create<FarmOperationRecordState>()((set) => ({
  records: [],
  isLoading: false,
  error: null,

  loadRecords: (filters) => {
    if (loadInflight) return loadInflight;

    const inflight = (async () => {
      set({ isLoading: true, error: null });
      try {
        const qs = new URLSearchParams();
        if (filters?.sourceType) qs.append('sourceType', filters.sourceType);
        if (filters?.status) qs.append('status', filters.status);
        if (filters?.sourceId) qs.append('sourceId', filters.sourceId);
        const url = `/farm-operation-records${qs.toString() ? `?${qs.toString()}` : ''}`;

        const data = await enhancedApiClient.get<FarmOperationRecord[]>(url);
        set({ records: Array.isArray(data) ? data : [], isLoading: false });
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false });
        throw error;
      } finally {
        loadInflight = null;
      }
    })();

    loadInflight = inflight;
    return inflight;
  },

  addRecord: async (payload) => {
    const result = await enhancedApiClient.post<FarmOperationRecord>('/farm-operation-records', payload);
    if (!result) throw new Error('创建农事操作记录失败：服务端未返回数据');
    set((s) => ({ records: [result, ...s.records] }));
    return result;
  },

  updateRecord: async (id, updates) => {
    const result = await enhancedApiClient.put<FarmOperationRecord>(`/farm-operation-records/${id}`, updates);
    if (!result) throw new Error('更新农事操作记录失败：服务端未返回数据');
    set((s) => ({ records: s.records.map(r => (r.id === id ? { ...r, ...result } : r)) }));
    return result;
  },

  deleteRecord: async (id) => {
    await enhancedApiClient.delete(`/farm-operation-records/${id}`);
    set((s) => ({ records: s.records.filter(r => r.id !== id) }));
  },
}));
