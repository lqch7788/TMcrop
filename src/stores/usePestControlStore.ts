/**
 * 病虫害防治记录 Store (V12.0)
 * 遵循 V2.1 Store 标准模板
 * 2026-07-18 P1-H7 修复：写后 notifyChange 跨页刷新（库存/肥料库）
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { useInventoryStore } from './useInventoryStore';
import { useFertilizerStore } from './useFertilizerStore';

export interface PestControlData {
  id: string;
  recordCode: string;
  sprayTime: string;
  operatorId?: string;
  operatorName?: string;
  cropName: string;
  // 2026-07-21：多作物 JSON 数组字符串（与 fertilizer_records 对齐）
  // - 放宽限制后同次可跨作物防治；持久化字段为 JSON 字符串
  // - 解析后用作物 Badge 多色板展示
  cropNames?: string;
  greenhouseName?: string;
  // 2026-07-05: 关联业务（与种植/育苗二选一，互斥）
  // 2026-07-21：放宽限制后 — 改为逗号分隔的多 ID 字符串；解析回列表用于展示
  plantingId?: string;
  plantingCode?: string;
  seedlingId?: string;
  seedlingCode?: string;
  // 2026-07-10：取消 controlType 字段（化学/生物/物理防治分类），改为药剂类型数组
  pesticideId?: string;
  pesticideName?: string;
  // 药剂类型 JSON 数组（如 ['insecticide','fungicide_fungi']）
  pesticideTypes?: string[];
  specId?: string;
  specContent?: string;
  dosage?: number;
  dosageUnit?: string;
  dilutionRatio?: string;
  targetPest?: string;
  applicationMethod?: string;
  bioAgentId?: string;
  bioAgentName?: string;
  bioAgentType?: string;
  equipmentName?: string;
  equipmentCount?: string | number;
  pesticideList?: string;
  bioAgentList?: string;
  equipmentList?: string;
  useLeafFertilizer: 'yes' | 'no';
  leafFertilizerName?: string;
  leafFertilizerDosage?: number;
  leafFertilizerUnit?: string;
  // 2026-07-11：肥料池（JSON 字符串），支持多肥料
  leafFertilizerList?: string;
  description?: string;
  photos?: string;
  status: string;
  createTime: string;
  updateTime: string;
}

const FIELD_MAP: Record<string, string> = {
  id: 'id',
  record_code: 'recordCode',
  spray_time: 'sprayTime',
  operator_id: 'operatorId',
  operator_name: 'operatorName',
  crop_name: 'cropName',
  // 2026-07-21：多作物 JSON 数组
  crop_names: 'cropNames',
  greenhouse_name: 'greenhouseName',
  // 2026-07-05: 关联业务字段
  planting_id: 'plantingId',
  planting_code: 'plantingCode',
  seedling_id: 'seedlingId',
  seedling_code: 'seedlingCode',
  // 2026-07-10：移除 control_type；pesticide_type → pesticideTypes
  pesticide_id: 'pesticideId',
  pesticide_name: 'pesticideName',
  pesticide_type: 'pesticideTypes',
  spec_id: 'specId',
  spec_content: 'specContent',
  dosage: 'dosage',
  dosage_unit: 'dosageUnit',
  dilution_ratio: 'dilutionRatio',
  target_pest: 'targetPest',
  application_method: 'applicationMethod',
  bio_agent_id: 'bioAgentId',
  bio_agent_name: 'bioAgentName',
  bio_agent_type: 'bioAgentType',
  equipment_name: 'equipmentName',
  equipment_count: 'equipmentCount',
  pesticide_list: 'pesticideList',
  bio_agent_list: 'bioAgentList',
  equipment_list: 'equipmentList',
  use_leaf_fertilizer: 'useLeafFertilizer',
  leaf_fertilizer_name: 'leafFertilizerName',
  leaf_fertilizer_dosage: 'leafFertilizerDosage',
  leaf_fertilizer_unit: 'leafFertilizerUnit',
  leaf_fertilizer_list: 'leafFertilizerList',
  description: 'description',
  photos: 'photos',
  status: 'status',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/**
 * 2026-07-10：JSON 数组 ↔ 字符串数组转换
 */
function parsePesticideTypes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

// 2026-07-17：API 已返回 camelCase（camelCaseResponse 中间件）
// 2026-07-18 P1-H2 修复：normalize 显式走 FIELD_MAP 做 snake→camel 映射（idempotent），不再隐式依赖全局中间件
function normalizePestControl(raw: Record<string, unknown>): PestControlData {
  const result: Record<string, unknown> = {};
  // 显式映射：snake_case → camelCase（已 camelCase 时直接 copy）
  for (const [snakeKey, camelKey] of Object.entries(FIELD_MAP)) {
    if (raw[camelKey] !== undefined) {
      result[camelKey] = raw[camelKey];
    } else if (raw[snakeKey] !== undefined) {
      result[camelKey] = raw[snakeKey];
    }
  }
  // 透传未在 FIELD_MAP 的额外字段（防止漏配）
  for (const [k, v] of Object.entries(raw)) {
    if (!(k in result)) result[k] = v;
  }
  // pesticideTypes：API 可能返回 array（已 parse）或 string（未 parse），统一为 array
  const pesticideTypesVal = raw.pesticideTypes ?? raw.pesticide_type;
  result.pesticideTypes = parsePesticideTypes(pesticideTypesVal);
  // 2026-07-21：cropNames 保留 JSON 字符串原值（前端展示时按需 parse，避免破坏 JSON 池结构）
  return result as unknown as PestControlData;
}

function denormalizePestControl(item: Partial<PestControlData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) {
    reverseMap[camelKey] = dbKey;
  }
  for (const [camelKey, value] of Object.entries(item)) {
    const dbKey = reverseMap[camelKey] ?? camelKey;
    // 2026-07-10：pesticideTypes 特殊处理（string[] → JSON 字符串）
    if (camelKey === 'pesticideTypes') {
      const arr = value as string[] | undefined | null;
      result[dbKey] = arr && arr.length > 0 ? JSON.stringify(arr) : null;
    } else {
      result[dbKey] = value;
    }
  }
  return result;
}

interface PestControlState {
  items: PestControlData[];
  stats: any[];
  isLoading: boolean;
  error: string | null;
  /** 手动清空 error 状态（由页面在 toast 后调用） */
  clearError: () => void;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<PestControlData | null>;
  createItem: (item: Partial<PestControlData>) => Promise<PestControlData | null>;
  updateItem: (id: string, updates: Partial<PestControlData>) => Promise<PestControlData | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<{ deleted: number }>;
  fetchStats: (filters?: Record<string, string>) => Promise<void>;
  generateCode: () => Promise<string>;
}

export const usePestControlStore = create<PestControlState>()(
  (set, get) => ({
    items: [],
    stats: [],
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    fetchItems: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const response = await enhancedApiClient.get<any>(`/pest-records?${params.toString()}`);
        const rawItems = Array.isArray(response) ? response : response?.data ?? [];
        // 2026-07-17：normalize — 字段名转 camelCase + pesticideTypes JSON 字符串→数组
        const items = (rawItems as Record<string, unknown>[]).map(normalizePestControl);
        set({ items: items as unknown as PestControlData[], isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pest-records/${id}`);
        const raw = (response as any).data ?? response;
        return normalizePestControl(raw as Record<string, unknown>);
      } catch {
        return null;
      }
    },

    createItem: async (item) => {
      try {
        // 2026-07-10：pesticideTypes 数组转 JSON 字符串（后端路由已支持两种格式）
        const body = denormalizePestControl(item);
        const response = await enhancedApiClient.post<any>('/pest-records', body);
        const raw = (response.data ?? response) as Record<string, unknown>;
        const newItem = normalizePestControl(raw);
        set((state) => ({ items: [newItem as unknown as PestControlData, ...state.items] }));
        // 2026-07-18 P1-H7 修复：跨页刷新（库存/肥料库订阅了 version 变化）
        useInventoryStore.getState().notifyChange();
        useFertilizerStore.getState().notifyChange?.();
        return newItem as unknown as PestControlData;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const body = denormalizePestControl(updates);
        const response = await enhancedApiClient.put<any>(`/pest-records/${id}`, body);
        const raw = (response.data ?? response) as Record<string, unknown>;
        const updated = normalizePestControl(raw);
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? (updated as unknown as PestControlData) : i)),
        }));
        // 2026-07-18 P1-H7 修复：跨页刷新
        useInventoryStore.getState().notifyChange();
        useFertilizerStore.getState().notifyChange?.();
        return updated as unknown as PestControlData;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await enhancedApiClient.delete(`/pest-records/${id}`);
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        // 2026-07-18 P1-H7 修复：跨页刷新
        useInventoryStore.getState().notifyChange();
        useFertilizerStore.getState().notifyChange?.();
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const response = await enhancedApiClient.post('/pest-records/batch-delete', { ids }) as { deleted?: number };
        const deleted = response?.deleted ?? 0;
        if (deleted > 0) {
          set((state) => ({ items: state.items.filter((i) => !ids.includes(i.id)) }));
        }
        // 2026-07-18 P1-H7 修复：跨页刷新
        useInventoryStore.getState().notifyChange();
        useFertilizerStore.getState().notifyChange?.();
        return { deleted };
      } catch (err) {
        set({ error: (err as Error).message });
        return { deleted: 0 };
      }
    },

    fetchStats: async (filters = {}) => {
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const response = await enhancedApiClient.get<any>(`/pest-records/stats?${params.toString()}`);
        const statsData = (response as any).data ?? response;
        set({ stats: Array.isArray(statsData) ? statsData : [] });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    generateCode: async () => {
      // 2026-07-21 修复：失败时抛错（修 silent failure），调用方 catch 后 toast
      const response = await enhancedApiClient.get<any>('/pest-records/generate-code');
      const payload = (response as any).data ?? response;
      return payload?.data?.code ?? payload?.code ?? '';
    },
  })
);
