/**
 * 公告模板 Zustand Store (V2.1 架构)
 *
 * 架构：enhancedApiClient → API（无缓存层，V2.1 铁律）
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 对接后端: /api/announcements/templates
 *
 * 设计模式参考: useSystemConfigStore.ts (V2.1 标准模板)
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

// ========== 类型定义 ==========

/** 公告模板数据结构 */
export interface AnnouncementTemplate {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  titleTemplate?: string;
  content?: string;
  /** 默认优先级（选用模板创建公告时的初始优先级：高/中/低） */
  defaultPriority?: string;
  usageCount: number;
  status: string;
  createTime?: string;
  updateTime?: string;
}

/** 字段映射：后端蛇形 → 前端驼峰 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type',
  category: 'category',
  title_template: 'titleTemplate',
  content: 'content',
  default_priority: 'defaultPriority',
  usage_count: 'usageCount',
  status: 'status',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/** 后端蛇形 → 前端驼峰 转换 */
function normalizeItem(db: Record<string, unknown>): AnnouncementTemplate {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.usageCount = result.usageCount ?? result.usage_count ?? 0;
  result.status = result.status || '启用';
  // 动态组装的后端行数据 → 前端结构（类型系统无法静态验证）
  return result as unknown as AnnouncementTemplate;
}

/** 前端驼峰 → 后端蛇形 转换 */
function denormalizeItem(item: Partial<AnnouncementTemplate>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(item)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

/** 生成临时ID */
function generateLocalId(): string {
  return `TPL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ========== Store 接口 ==========

interface AnnouncementTemplateState {
  templates: AnnouncementTemplate[];
  isLoading: boolean;
  error: string | null;

  /** 获取模板列表 */
  fetchTemplates: () => Promise<void>;

  /** 创建模板（乐观更新） */
  createTemplate: (data: Partial<AnnouncementTemplate>) => Promise<AnnouncementTemplate | null>;

  /** 更新模板（乐观更新） */
  updateTemplate: (id: string, updates: Partial<AnnouncementTemplate>) => Promise<void>;

  /** 删除模板 */
  deleteTemplate: (id: string) => Promise<boolean>;

  /** 记录一次模板使用（使用次数 +1）
   *  2026-10-11：命名为 recordTemplateUsage 而非 useTemplate —— 后者带 use 前缀会被 ESLint
   *  的 react-hooks/rules-of-hooks 当作 Hook，在普通函数里调用即报错 */
  recordTemplateUsage: (id: string) => Promise<void>;
}

// ========== Store ==========

export const useAnnouncementTemplateStore = create<AnnouncementTemplateState>()(
  (set, get) => ({
      templates: [],
      isLoading: false,
      error: null,

      // ---------- 获取模板列表 ----------
      fetchTemplates: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await enhancedApiClient.get('/announcements/templates');

          // enhancedApiClient 已提取 .data 字段
          const rawData = Array.isArray(response) ? response : [];
          const normalized = rawData.map((item: Record<string, unknown>) => normalizeItem(item));
          set({ templates: normalized, isLoading: false });
        } catch (error) {
          // logger.warn('[AnnouncementTemplateStore] API获取失败，使用本地数据:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ---------- 创建模板（乐观更新） ----------
      createTemplate: async (data) => {
        const localId = data.id || generateLocalId();
        // 后端 POST 只认 snake_case：type 由后端从 category 推断，usage_count 固定从 0 开始
        const body = {
          id: localId,
          code: data.code || '',
          name: data.name || '',
          category: data.category || '',
          title_template: data.titleTemplate || '',
          content: data.content || '',
          default_priority: data.defaultPriority || '中',
          status: data.status || '启用',
        };

        const now = new Date().toISOString();
        // 乐观更新项使用驼峰字段名（与AnnouncementTemplate接口对齐）
        const optimisticItem: AnnouncementTemplate = {
          id: localId,
          code: data.code || '',
          name: data.name || '',
          type: data.category || '',
          category: data.category || '',
          titleTemplate: data.titleTemplate || '',
          content: data.content || '',
          defaultPriority: data.defaultPriority || '中',
          usageCount: 0,
          status: data.status || '启用',
          createTime: now,
          updateTime: now,
        };
        set((state) => ({ templates: [optimisticItem, ...state.templates] }));

        try {
          const response = await enhancedApiClient.post<{ id: string; code: string }>(
            '/announcements/templates', body
          );
          const savedId = (response as any)?.id || localId;
          const savedCode = (response as any)?.code || '';

          set((state) => ({
            templates: state.templates.map((t) =>
              t.id === localId ? { ...t, id: savedId, code: savedCode } : t
            ),
          }));
          return { ...optimisticItem, id: savedId, code: savedCode };
        } catch (error) {
          // API失败：移除乐观更新项，抛出错误让调用方处理
          const errMsg = (error as Error)?.message || '创建模板失败';
          // logger.warn('[AnnouncementTemplateStore] 创建模板API失败:', errMsg);
          set((state) => ({
            templates: state.templates.filter((t) => t.id !== localId),
            error: errMsg,
          }));
          throw new Error(errMsg);
        }
      },

      // ---------- 更新模板（乐观更新） ----------
      updateTemplate: async (id, updates) => {
        // 保存原始值用于回滚
        const prev = get().templates.find((t) => t.id === id);
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updateTime: new Date().toISOString() } : t
          ),
        }));
        try {
          // 字段名转换：前端驼峰 → 后端蛇形（titleTemplate→title_template / defaultPriority→default_priority）
          const body = denormalizeItem(updates);
          await enhancedApiClient.put(`/announcements/templates/${id}`, body);
        } catch (error) {
          // API失败：回滚乐观更新
          const errMsg = (error as Error)?.message || '更新模板失败';
          // logger.warn('[AnnouncementTemplateStore] 更新模板API失败:', errMsg);
          if (prev) {
            set((state) => ({
              templates: state.templates.map((t) => (t.id === id ? prev : t)),
              error: errMsg,
            }));
          }
          throw new Error(errMsg);
        }
      },

      // ---------- 删除模板 ----------
      deleteTemplate: async (id) => {
        set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
        try {
          await enhancedApiClient.delete(`/announcements/templates/${id}`);
          return true;
        } catch (error) {
          // logger.warn('[AnnouncementTemplateStore] 删除模板API失败:', error);
          return false;
        }
      },

      // ---------- 记录一次模板使用 ----------
      recordTemplateUsage: async (id) => {
        // 乐观 +1，让卡片立即反映
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, usageCount: (t.usageCount || 0) + 1 } : t
          ),
        }));
        try {
          await enhancedApiClient.post(`/announcements/templates/${id}/use`);
        } catch (error) {
          // 计数失败不回滚、不阻塞"使用模板"主流程，但必须留下日志（不静默吞错）
          logger.warn('[AnnouncementTemplateStore] 使用次数递增失败:', error);
        }
      },
    })
);
