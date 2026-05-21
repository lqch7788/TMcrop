/**
 * 物料申请数据 Zustand Store (V2.1 架构 - 已简化)
 *
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 *
 * 对接后端: /api/material-requests
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import type { MaterialReceivingRecord, MaterialItem } from '../types/materialReceiving';

// ==================== 字段映射表 ====================

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  request_code: 'code',
  request_title: 'title',
  request_type: 'requestType',
  department_id: 'departmentId',
  department_name: 'department',
  applicant_id: 'applicantId',
  applicant_name: 'applicant',
  apply_date: 'date',
  expected_date: 'expectedDate',
  warehouse_id: 'warehouseId',
  warehouse_name: 'warehouseLocation',
  plant_area: 'plantArea',
  production_batch_code: 'productionBatchCode',
  total_amount: 'totalAmount',
  priority: 'priority',
  status: 'rawStatus',
  approval_status: 'approvalStatus',
  remarks: 'remarks',
  attachments: 'attachments',
  materials: 'materials',
  create_by: 'createBy',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ==================== 规范化函数 ====================

/** 后端数据 → 前端数据 */
function normalize(db: Record<string, unknown>): MaterialReceivingRecord {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 别名兼容
  result.code = result.code || db.requestCode || db.code;
  result.date = result.date || db.applyDate || db.date || '';
  result.applicant = result.applicant || db.applicantName || db.applicant || '';
  result.department = result.department || db.departmentName || db.department || '';
  result.warehouseLocation = result.warehouseLocation || db.warehouseName || db.warehouseLocation || '';

  // 状态字段派生
  const approvalStatus = String(result.approvalStatus ?? db.approval_status ?? '');
  const rawStatus = String(result.rawStatus ?? db.status ?? '');
  if (approvalStatus === 'approved') {
    result.status = '已审批';
    result.statusClass = 'approved';
  } else if (approvalStatus === 'rejected') {
    result.status = '已拒绝';
    result.statusClass = 'rejected';
  } else if (approvalStatus === 'pending') {
    result.status = '待审批';
    result.statusClass = 'pending';
  } else if (rawStatus === 'voided' || rawStatus === '已作废') {
    result.status = '已作废';
    result.statusClass = 'voided';
  } else if (rawStatus === 'cancelled' || rawStatus === '已取消') {
    result.status = '已取消';
    result.statusClass = 'cancelled';
  } else {
    result.status = result.status || '待审批';
    result.statusClass = result.statusClass || 'pending';
  }

  result.id = result.id ?? `MR${Date.now()}`;
  // 确保 JSON 字段被正确解析
  if (typeof result.materials === 'string') {
    try { result.materials = JSON.parse(result.materials); } catch { result.materials = []; }
  }
  if (!Array.isArray(result.materials)) result.materials = [];
  return result as MaterialReceivingRecord;
}

/** 前端数据 → 后端数据 */
function denormalize(data: Partial<MaterialReceivingRecord>): Record<string, unknown> {
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== Store 接口 ====================

interface MaterialRequestDataState {
  items: MaterialReceivingRecord[];
  isLoading: boolean;
  error: string | null;

  loadItems: (params?: Record<string, string>) => Promise<void>;
  addItem: (item: Partial<MaterialReceivingRecord>) => Promise<MaterialReceivingRecord | null>;
  updateItem: (id: string | number, updates: Partial<MaterialReceivingRecord>) => Promise<boolean>;
  deleteItem: (id: string | number) => Promise<boolean>;
  deleteItems: (ids: (string | number)[]) => Promise<boolean>;
  refresh: () => Promise<void>;
}

// ==================== 创建 Store ====================

export const useMaterialRequestDataStore = create<MaterialRequestDataState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    // 查询
    loadItems: async (params) => {
      set({ isLoading: true, error: null });
      try {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        const resp = await enhancedApiClient.get<Record<string, unknown>[]>(`/material-requests${query}`);
        const list = Array.isArray(resp) ? resp : [];
        const mapped = list.map((r: Record<string, unknown>) => normalize(r));
        set({ items: mapped, isLoading: false });
      } catch (error) {
        console.error('[MaterialRequestStore] 获取物料申请失败:', error);
        set({ error: error instanceof Error ? error.message : '获取物料申请失败', isLoading: false });
      }
    },

    // 创建
    addItem: async (item) => {
      try {
        const body = denormalize(item);
        body.request_code = body.request_code || item.code || `MR${Date.now()}`;
        body.request_type = body.request_type || '领料申请';
        body.applicant_name = body.applicant_name || item.applicant || '';
        body.department_name = body.department_name || item.department || '';
        body.warehouse_name = body.warehouse_name || item.warehouseLocation || '';
        body.apply_date = body.apply_date || item.date || new Date().toISOString().split('T')[0];
        body.status = 'draft';
        body.approval_status = 'pending';
        body.materials = JSON.stringify(body.materials || item.materials || []);

        const result = await enhancedApiClient.post<Record<string, unknown>>('/material-requests', body);

        const newItem = normalize({
          id: result?.data?.id || result?.id || `MR${Date.now()}`,
          request_code: result?.data?.request_code || body.request_code,
          apply_date: body.apply_date,
          applicant_name: body.applicant_name,
          department_name: body.department_name,
          warehouse_name: body.warehouse_name,
          plant_area: body.plant_area || item.plantArea || '',
          production_batch_code: body.production_batch_code || item.productionBatchCode || '',
          approval_status: 'pending',
          status: 'draft',
          materials: item.materials || [],
        } as Record<string, unknown>);

        set((s) => ({ items: [newItem, ...s.items] }));
        return newItem;
      } catch (error) {
        console.error('[MaterialRequestStore] 添加物料申请失败:', error);
        return null;
      }
    },

    // 更新
    updateItem: async (id, updates) => {
      const body = denormalize(updates);

      set((s) => ({
        items: s.items.map((i) =>
          i.id === id || i.code === id ? { ...i, ...updates } : i
        ),
      }));

      try {
        await enhancedApiClient.put(`/material-requests/${id}`, body);
        return true;
      } catch (error) {
        console.error('[MaterialRequestStore] 更新物料申请失败:', error);
        return false;
      }
    },

    // 删除单个
    deleteItem: async (id) => {
      set((s) => ({
        items: s.items.filter((i) => i.id !== id && i.code !== id),
      }));

      try {
        await enhancedApiClient.delete(`/material-requests/${id}`);
        return true;
      } catch (error) {
        console.error('[MaterialRequestStore] 删除物料申请失败:', error);
        return false;
      }
    },

    // 批量删除
    deleteItems: async (ids) => {
      set((s) => ({
        items: s.items.filter((i) => !ids.includes(i.id) && !ids.includes(i.code)),
      }));

      try {
        const results = await Promise.all(
          ids.map((id) =>
            enhancedApiClient.delete(`/material-requests/${id}`)
              .then(() => true)
              .catch(() => false)
          )
        );
        return results.every(Boolean);
      } catch {
        return false;
      }
    },

    refresh: async () => {
      await get().loadItems();
    },
  })
);
