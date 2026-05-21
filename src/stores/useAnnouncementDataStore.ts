/**
 * 公告数据 Zustand Store (V2.1 架构 - 已简化)
 *
 * 架构：enhancedApiClient → API
 * 数据流：Store → 组件
 *
 * 对接后端: /api/announcements
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { submitAnnouncementApproval } from '../services/approvalSubmitService';

// ========== 类型定义 ==========

/** 前端公告数据结构（驼峰命名） */
export interface AnnouncementData {
  id: string;
  code: string;
  title: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  sender: string;
  date: string;
  deadline: string;
  readCount: number;
  recipients: string;
  content: string;
  createTime: string;
  updateTime: string;
  approvalId?: string;
}

/** 字段映射：后端蛇形 → 前端驼峰 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  code: 'code',
  title: 'title',
  type: 'type',
  category: 'category',
  priority: 'priority',
  status: 'status',
  sender: 'sender',
  date: 'date',
  deadline: 'deadline',
  read_count: 'readCount',
  recipients: 'recipients',
  content: 'content',
  create_time: 'createTime',
  update_time: 'updateTime',
  approval_id: 'approvalId',
};

/** 后端蛇形 → 前端驼峰 转换 */
function normalizeItem(db: Record<string, unknown>): AnnouncementData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 确保必要字段有默认值
  result.readCount = result.readCount ?? result.read_count ?? 0;
  result.priority = result.priority || '中';
  result.status = result.status || '草稿';
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  return result as AnnouncementData;
}

/** 前端驼峰 → 后端蛇形 转换（POST/PUT 用驼峰，后端 route 自行转换） */
function denormalizeItem(item: Partial<AnnouncementData>): Record<string, unknown> {
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

/** 生成临时ID（乐观更新用） */
function generateLocalId(): string {
  return `ANN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ========== Store 接口 ==========

interface AnnouncementDataState {
  items: AnnouncementData[];
  isLoading: boolean;
  error: string | null;

  /** 获取公告列表，支持筛选参数 */
  fetchItems: (filters?: Record<string, string>) => Promise<void>;

  /** 创建公告（乐观更新） */
  createItem: (data: Partial<AnnouncementData>) => Promise<AnnouncementData | null>;

  /** 更新公告（乐观更新） */
  updateItem: (id: string, updates: Partial<AnnouncementData>) => Promise<void>;

  /** 删除单个公告 */
  deleteItem: (id: string) => Promise<boolean>;

  /** 批量删除公告 */
  deleteItems: (ids: string[]) => Promise<boolean>;

  /** 提交公告审批 */
  submitForApproval: (id: string) => Promise<boolean>;
}

// ========== Store ==========

export const useAnnouncementDataStore = create<AnnouncementDataState>()(
  (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      // ---------- 获取公告列表 ----------
      fetchItems: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
          }
          const query = params.toString();
          const url = `/announcements${query ? `?${query}` : ''}`;
          const response = await enhancedApiClient.get(url);

          // enhancedApiClient 已提取 .data 字段
          const rawData = Array.isArray(response) ? response : [];
          const normalized = rawData.map((item: Record<string, unknown>) => normalizeItem(item));
          set({ items: normalized, isLoading: false });
        } catch (error) {
          console.warn('[AnnouncementDataStore] API获取失败，使用本地数据:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ---------- 创建公告（乐观更新） ----------
      createItem: async (data) => {
        const localId = data.id || generateLocalId();
        const now = new Date().toISOString();
        const body = {
          id: localId,
          title: data.title || '',
          type: data.type || '生产公告',
          category: data.category || '',
          priority: data.priority || '中',
          status: data.status || '草稿',
          sender: data.sender || '',
          date: data.date || '',
          deadline: data.deadline || '',
          readCount: data.readCount || 0,
          recipients: data.recipients || '',
          content: data.content || '',
        };

        // 乐观更新：先插入本地数据
        const optimisticItem: AnnouncementData = {
          id: localId,
          code: '',
          ...data,
          ...body,
          createTime: now,
          updateTime: now,
        };
        set((state) => ({ items: [optimisticItem, ...state.items] }));

        try {
          const response = await enhancedApiClient.post<{ id: string; code: string }>(
            '/announcements', body
          );
          // POST 返回 { message, id, code }，enhancedApiClient 未提取 .data 所以返回完整对象
          const savedId = (response as any)?.id || localId;
          const savedCode = (response as any)?.code || '';

          // 用后端返回的 ID/code 修正本地数据
          set((state) => ({
            items: state.items.map((item) =>
              item.id === localId
                ? { ...item, id: savedId, code: savedCode }
                : item
            ),
          }));
          return { ...optimisticItem, id: savedId, code: savedCode };
        } catch (error) {
          console.warn('[AnnouncementDataStore] 创建公告API失败:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      // ---------- 更新公告（乐观更新） ----------
      updateItem: async (id, updates) => {
        // 乐观更新
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updateTime: new Date().toISOString() } : item
          ),
        }));
        try {
          await enhancedApiClient.put(`/announcements/${id}`, updates);
        } catch (error) {
          console.warn('[AnnouncementDataStore] 更新公告API失败:', error);
        }
      },

      // ---------- 删除单个公告 ----------
      deleteItem: async (id) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
        try {
          await enhancedApiClient.delete(`/announcements/${id}`);
          return true;
        } catch (error) {
          console.warn('[AnnouncementDataStore] 删除公告API失败:', error);
          return false;
        }
      },

      // ---------- 批量删除 ----------
      deleteItems: async (ids) => {
        set((state) => ({ items: state.items.filter((item) => !ids.includes(item.id)) }));
        try {
          await Promise.all(ids.map((id) =>
            enhancedApiClient.delete(`/announcements/${id}`).catch(() => {})
          ));
          return true;
        } catch {
          return false;
        }
      },

      // ---------- 提交审批 ----------
      submitForApproval: async (id) => {
        const item = get().items.find((i) => i.id === id);
        if (!item) {
          console.warn('[AnnouncementDataStore] 提交审批失败：公告不存在');
          return false;
        }

        try {
          // 尝试获取当前用户信息
          let applicantId = 'system';
          let applicantName = '系统';
          let department = '';
          try {
            const { useAuthStore } = await import('../stores/useAuthStore');
            const auth = useAuthStore.getState();
            applicantId = auth.user?.oid || auth.user?.id || 'system';
            applicantName = auth.user?.name || '系统';
            department = auth.user?.departmentId || '';
          } catch {
            // 获取用户信息失败，使用默认值
          }

          const result = await submitAnnouncementApproval({
            announcementId: id,
            announcementCode: item.code || '',
            announcementTitle: item.title,
            announcementType: item.type,
            applicantId,
            applicantName,
            department,
          });

          if (result.success) {
            // 更新状态为审批中
            set((state) => ({
              items: state.items.map((i) =>
                i.id === id ? { ...i, status: '审批中', approvalId: result.approvalId } : i
              ),
            }));
            return true;
          }
          return false;
        } catch (error) {
          console.warn('[AnnouncementDataStore] 提交审批失败:', error);
          return false;
        }
      },
    })
);
