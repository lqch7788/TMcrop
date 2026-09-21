/**
 * 巡查记录 Zustand Store
 *
 * V2.1 架构 - 已简化
 *
 * 对接后端: /api/inspections
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { applyListLimit } from '../config/apiLimits';

// ========== 类型 ==========

export interface InspectionData {
  id: string;
  record_code?: string;
  recordCode?: string;
  inspection_type?: string;
  inspectionType?: string;
  inspector_id?: string;
  inspectorId?: string;
  inspector_name?: string;
  inspectorName?: string;
  greenhouse_name?: string;
  greenhouseName?: string;
  greenhouse_id?: string;
  greenhouseId?: string;
  check_date?: string;
  checkDate?: string;
  check_time?: string;
  checkTime?: string;
  check_result?: string;
  checkResult?: string;
  issue_severity?: string;
  issueSeverity?: string;
  issue_text?: string;
  issueText?: string;
  issues?: string[];
  images?: string[];
  status?: string;
  feedback_users?: string[];
  feedbackUsers?: string[];
  cropName?: string;
  cropStatus?: string;
  weather?: string;
  temperature?: number;
  humidity?: number;
  remarks?: string;
  create_time?: string;
  createTime?: string;
  createdAt?: string;
  update_time?: string;
  updateTime?: string;
  updatedAt?: string;
}

/** 后端→前端字段映射 */
function normalize(db: Record<string, unknown>): InspectionData {
  const map: Record<string, string> = {
    record_code: 'recordCode', inspection_type: 'inspectionType',
    inspector_id: 'inspectorId', inspector_name: 'inspectorName',
    greenhouse_name: 'greenhouseName', greenhouse_id: 'greenhouseId',
    check_date: 'checkDate', check_time: 'checkTime',
    check_result: 'checkResult', issue_severity: 'issueSeverity',
    issue_text: 'issueText', feedback_users: 'feedbackUsers',
    create_time: 'createdAt', update_time: 'updatedAt',
  };
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(db)) {
    r[map[k] || k] = v;
  }
  // 序列化字段
  if (typeof r.feedbackUsers === 'string') {
    try { r.feedbackUsers = JSON.parse(r.feedbackUsers as string); } catch { r.feedbackUsers = []; }
  }
  if (!Array.isArray(r.feedbackUsers)) r.feedbackUsers = [];
  if (typeof r.issues === 'string') {
    try { r.issues = JSON.parse(r.issues as string); } catch { r.issues = r.issues ? [r.issues] : []; }
  }
  if (!Array.isArray(r.issues)) r.issues = [];
  if (typeof r.images === 'string') {
    try { r.images = JSON.parse(r.images as string); } catch { r.images = []; }
  }
  if (!Array.isArray(r.images)) r.images = [];
  return r as InspectionData;
}

// ========== Store ==========

interface InspectionDataState {
  records: InspectionData[];
  isLoading: boolean;
  error: string | null;

  fetchRecords: (filters?: Record<string, string>) => Promise<void>;
  createRecord: (record: Partial<InspectionData>) => Promise<InspectionData | null>;
  updateRecord: (id: string, updates: Partial<InspectionData>) => Promise<void>;
  deleteRecord: (id: string) => Promise<boolean>;
}

/**
 * in-flight 去重句柄：同一时刻只允许一个 fetchRecords 在飞。
 * 并发调用复用同一个 Promise，保证每个调用方 await 返回时 store 已是最新。
 */
let inflightFetchRecords: Promise<void> | null = null;

export const useInspectionDataStore = create<InspectionDataState>()(
  (set, get) => ({
      records: [],
      isLoading: false,
      error: null,

      fetchRecords: async (filters) => {
        // 2026-09-21 修复（与 useProblemStore.fetchProblems 同因，巡查记录 tab 徽章同理）：
        //   原"3 秒时间窗口丢弃"防重入与调用方契约冲突 —— useFarmHub.loadData 是
        //   `await fetchRecords()` 后立即读 store 快照，被跳过时读到空数组 → hub.inspections
        //   被设为 [] → 徽章恒显示 0（而列表走 store 订阅正常）。
        //   改为 in-flight Promise 共享：并发调用复用同一请求，await 返回时 store 必为最新；
        //   防死循环能力不变（原修复目标是阻断 loadData + InspectionTab 双重触发的循环，
        //   改成复用进行中的 Promise 后，循环内不会额外发起网络请求，拦截更彻底）。
        if (inflightFetchRecords) return inflightFetchRecords;
        const run = (async () => {
          set({ isLoading: true, error: null });
          try {
            const params = new URLSearchParams();
            if (filters) {
              Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
            }
            // 2026-09-21：显式传 limit。后端 GET /inspections 默认 limit=50，
            //   而本 store 在这个数组上做全量统计与导出 ——
            //   记录超 50 条后第 51 条起会静默消失（详见 src/config/apiLimits.ts）
            applyListLimit(params);
            const query = params.toString();
            const url = `/inspections${query ? `?${query}` : ''}`;
            // logger.info('[InspectionDataStore] fetchRecords 请求:', url);
            const response = await enhancedApiClient.get<{ success: boolean; data: InspectionData[] }>(url);
            // logger.info('[InspectionDataStore] fetchRecords 原始响应:', JSON.stringify(response).substring(0, 500));
            // enhancedApiClient 已提取 .data，response 即为实际数据数组
            const data = Array.isArray(response) ? response : [];
            // logger.info('[InspectionDataStore] fetchRecords 加载记录数:', data.length);
            set({ records: data.map(normalize), isLoading: false });
          } catch (error) {
            // logger.error('[InspectionDataStore] API获取失败:', error);
            set({ error: (error as Error).message, isLoading: false });
          }
        })();
        inflightFetchRecords = run;
        try {
          await run;
        } finally {
          inflightFetchRecords = null;
        }
      },

      createRecord: async (record) => {
        // logger.info('[InspectionDataStore] createRecord 发送数据:', JSON.stringify(record, null, 2));
        const response = await enhancedApiClient.post<{ success: boolean; data: { id: string } }>(
          '/inspections', record
        );
        // logger.info('[InspectionDataStore] createRecord 响应:', response);
        // 从响应中提取 ID
        const newId = (response as { id?: string })?.id || (response as { data?: { id?: string } })?.data?.id || `INS${Date.now()}`;
        const newRecord = { ...record, id: newId } as InspectionData;
        set((state) => ({ records: [newRecord, ...state.records] }));
        return newRecord;
      },

      updateRecord: async (id, updates) => {
        // 2026-09-21 修复：原 catch 只有一行注释，失败时不回滚也不抛错，
        //   界面停在乐观更新后的状态、用户以为已保存，刷新即回滚且无任何提示。
        const prev = get().records.find((r) => r.id === id);
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }));
        try {
          await enhancedApiClient.put(`/inspections/${id}`, updates);
        } catch (error) {
          if (prev) {
            set((state) => ({
              records: state.records.map((r) => (r.id === id ? prev : r)),
            }));
          }
          console.error('[InspectionDataStore] 更新失败，已回滚本地改动:', error);
          throw error;
        }
      },

      deleteRecord: async (id) => {
        // 2026-09-21 修复：原 catch 只 return false，而调用方（批量删除的 forEach）不看返回值，
        //   失败时记录已从界面消失、零提示、刷新后"删了又回来"。现改为回滚 + 抛错。
        const removed = get().records.find((r) => r.id === id);
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
        try {
          await enhancedApiClient.delete(`/inspections/${id}`);
          return true;
        } catch (error) {
          if (removed) {
            set((state) => ({ records: [removed, ...state.records] }));
          }
          console.error('[InspectionDataStore] 删除失败，已回滚本地改动:', error);
          throw error;
        }
      },
    }
  )
);
