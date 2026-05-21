/**
 * 系统配置 Zustand Store — V2.1 架构标准
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件 (组件不直接读写 localStorage)
 * 对接后端: /api/basic-data/system-configs
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

/** API 响应包装类型（兼容嵌套 {success, data} 和扁平数组两种格式） */
type ApiListResponse = { success: boolean; data: Record<string, unknown>[] } | Record<string, unknown>[];

// ==================== 第一步：类型定义 ====================

/** 系统配置数据接口（camelCase，组件层使用） */
export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;       // 'string' | 'number' | 'boolean'
  category: string;         // 'system' | 'ui' | 'feature' | 'demo' | 'task' | 'approval' | 'business'
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== 第二步：字段映射表 ====================

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  config_key: 'configKey',
  config_value: 'configValue',
  config_type: 'configType',
  category: 'category',
  description: 'description',
  is_active: 'isActive',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

// ==================== 第三步：规范化函数 ====================

/** 后端数据 → 前端数据（API 响应处理） */
function normalize(raw: Record<string, unknown>): SystemConfig {
  const result: Record<string, unknown> = { ...raw };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 设置默认值
  result.id = result.id ?? `CFG_${Date.now()}`;
  result.configType = result.configType || 'string';
  result.category = result.category || 'system';
  result.description = result.description || '';
  result.isActive = result.isActive ?? true;
  result.createdAt = result.createdAt || new Date().toISOString();
  result.updatedAt = result.updatedAt || new Date().toISOString();
  return result as unknown as SystemConfig;
}

/** 前端数据 → 后端数据（API 请求体处理） */
function denormalize(data: Partial<SystemConfig>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== 第四步：Store 接口 ====================

/** CustomEvent名称 — Store变更后派发，Reader/Hook监听清除缓存 */
export const SYSTEM_CONFIG_CHANGED_EVENT = 'system-config-changed';

/** 派发系统配置变更事件（解耦Store和Reader） */
function notifyConfigChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYSTEM_CONFIG_CHANGED_EVENT));
  }
}

interface SystemConfigState {
  configs: SystemConfig[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  /** 首次加载是否已完成（用于判断Store数据就绪状态） */
  isReady: boolean;

  loadConfigs: () => Promise<void>;
  addConfig: (data: Partial<SystemConfig>) => Promise<SystemConfig | null>;
  updateConfig: (id: string, data: Partial<SystemConfig>) => Promise<void>;
  removeConfig: (id: string) => Promise<boolean>;
  refreshAll: () => Promise<void>;
}

// ==================== 第五步：创建 Store ====================

export const useSystemConfigStore = create<SystemConfigState>()(
  persist(
    (set, get) => ({
      configs: [],
      loading: false,
      error: null,
      lastFetch: null,
      isReady: false,

      // ---------- 查询（READ）— cache-first 策略 ----------
      loadConfigs: async () => {
        const now = Date.now();
        const { lastFetch, configs } = get();
        // 30秒内不重复请求（V3.0: 从5分钟降至30秒，参数修改即时生效）
        if (lastFetch && now - lastFetch < 30 * 1000 && configs.length > 0) return;

        set({ loading: true, error: null });
        try {
          const response = await enhancedApiClient.get<ApiListResponse>(
            '/basic-data/system-configs',
            {}
          );

          let rawData: Record<string, unknown>[] = [];
          if (Array.isArray(response)) {
            rawData = response;
          } else if (response && 'data' in response && Array.isArray(response.data)) {
            rawData = response.data;
          }

          const normalized = rawData.map(normalize);
          set({ configs: normalized, loading: false, lastFetch: now, isReady: true });
        } catch (error) {
          console.warn('[SystemConfigStore] API 获取失败，使用本地缓存:', error);
          set({ error: (error as Error).message, loading: false });
        }
      },

      // ---------- 创建（CREATE）— 乐观更新 ----------
      addConfig: async (data) => {
        set({ loading: true, error: null });
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{
            success: boolean;
            data: Record<string, unknown>;
            message?: string;
          }>('/basic-data/system-configs', body);

          // 后端返回完整记录时用它，否则用乐观数据
          const saved = response && 'data' in response ? response.data : null;
          let newItem: SystemConfig;
          if (saved && saved.id && saved.config_key) {
            newItem = normalize(saved);
          } else {
            const id = saved?.id || `CFG_${Date.now()}`;
            newItem = normalize({ ...body, id } as Record<string, unknown>);
          }

          set((s) => ({ configs: [newItem, ...s.configs], loading: false }));
          notifyConfigChanged(); // ★ V3.0: API成功后派发事件，清除Reader缓存
          return newItem;
        } catch (error) {
          console.warn('[SystemConfigStore] 创建失败，已加入离线队列:', error);
          set({ error: (error as Error).message, loading: false });
          return null;
        }
      },

      // ---------- 更新（UPDATE）— 乐观更新 ----------
      updateConfig: async (id, data) => {
        // 先乐观更新本地状态
        set((s) => ({
          configs: s.configs.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));

        try {
          const body = denormalize(data);
          await enhancedApiClient.put(
            `/basic-data/system-configs/${id}`,
            body
          );
          notifyConfigChanged(); // ★ V3.0: API成功后派发事件，清除Reader缓存
        } catch (error) {
          console.warn('[SystemConfigStore] 更新失败，已加入离线队列:', error);
        }
      },

      // ---------- 删除（DELETE）— 乐观更新 ----------
      removeConfig: async (id) => {
        set((s) => ({ configs: s.configs.filter((c) => c.id !== id) }));

        try {
          await enhancedApiClient.delete(
            `/basic-data/system-configs/${id}`
          );
          notifyConfigChanged(); // ★ V3.0: API成功后派发事件，清除Reader缓存
          return true;
        } catch (error) {
          console.warn('[SystemConfigStore] 删除失败，已加入离线队列:', error);
          return false;
        }
      },

      refreshAll: async () => {
        set({ lastFetch: null });
        await get().loadConfigs();
      },
    }),
    {
      name: 'system-config-storage',
      partialize: (state) => ({ configs: state.configs }),
    }
  )
);
