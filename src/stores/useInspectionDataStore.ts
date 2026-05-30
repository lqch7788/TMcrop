/**
 * 巡查记录 Zustand Store
 *
 * V2.1 架构 - 已简化
 *
 * 对接后端: /api/inspections
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

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

export const useInspectionDataStore = create<InspectionDataState>()(
  (set, get) => ({
      records: [],
      isLoading: false,
      error: null,

      fetchRecords: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
          }
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
      },

      createRecord: async (record) => {
        try {
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
        } catch (error) {
          // logger.error('[InspectionDataStore] 创建失败:', error);
          // 抛出错误，让调用方可以处理
          throw error;
        }
      },

      updateRecord: async (id, updates) => {
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }));
        try {
          await enhancedApiClient.put(`/inspections/${id}`, updates);
        } catch (error) {
          // logger.warn('[InspectionDataStore] 更新失败:', error);
        }
      },

      deleteRecord: async (id) => {
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
        try {
          await enhancedApiClient.delete(`/inspections/${id}`);
          return true;
        } catch (error) {
          // logger.warn('[InspectionDataStore] 删除失败:', error);
          return false;
        }
      },
    }
  )
);
