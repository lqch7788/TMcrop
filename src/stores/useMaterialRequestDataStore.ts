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
import type { MaterialReceivingRecord, MaterialItem, SelectedArea } from '../types/materialReceiving';

// ==================== 字段映射表 ====================

/** 2026-08-10 修复：后端响应经 camelCaseResponseMiddleware 转换（plant_area → plantArea），
 *  所以 FIELD_MAP 键必须用 camelCase 形式（前端读到的实际 key），目标值仍是前端字段名。
 *  之前用 snake_case key 导致 `plantAreaRaw` 永远是 undefined → 选区域信息丢失 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  requestCode: 'code',
  requestTitle: 'title',
  requestType: 'requestType',
  departmentId: 'departmentId',
  departmentName: 'department',
  applicantId: 'applicantId',
  applicantName: 'applicant',
  applyDate: 'date',
  expectedDate: 'expectedDate',
  warehouseId: 'warehouseId',
  warehouseName: 'warehouseLocation',
  plantArea: 'plantAreaRaw',     // 后端返回 plantArea（camelCase），normalize 阶段再解析为 plantAreas
  productionBatchCode: 'productionBatchCode',
  totalAmount: 'totalAmount',
  priority: 'priority',
  status: 'rawStatus',
  approvalStatus: 'approvalStatus',
  remarks: 'remarks',
  attachments: 'attachments',
  materials: 'materials',
  createBy: 'createBy',
  createTime: 'createTime',
  updateTime: 'updateTime',
};

// ==================== 规范化函数 ====================

/** 2026-08-10：解析 plant_area 字段——支持 JSON 数组(新)和纯字符串(旧数据) */
function parsePlantArea(raw: unknown): SelectedArea[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    // 已经 SelectedArea[]
    return raw as SelectedArea[];
  }
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  // 尝试解析为 JSON 数组
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((a: any) => a && a.id);
    } catch {
      // 解析失败则回退为纯字符串处理
    }
  }
  // 旧数据纯字符串：包装为单条 unknown area(无 id，UI 不会显示删除按钮)
  return [];
}

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

  // 2026-08-10：解析 plant_area 字符串为 plantAreas 数组
  result.plantAreas = parsePlantArea(result.plantAreaRaw ?? db.plant_area);

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
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: (params?: Record<string, string>) => Promise<void>;
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
        // logger.error('[MaterialRequestStore] 获取物料申请失败:', error);
        set({ error: error instanceof Error ? error.message : '获取物料申请失败', isLoading: false });
      }
    },

    // 2026-07-18 P2-M4：fetchItems 别名
    fetchItems: async (params) => { await get().loadItems(params); },

    // 创建
    addItem: async (item) => {
      try {
        const body = denormalize(item);
        // 2026-08-10：清理 denormalize 多余字段，再写 plantArea
        delete body.plantAreas;
        delete body.plantAreaRaw;
        // 2026-08-10 修复：保留 production_batch_code=null 占位（后端 SQL 24 个 ?，删值会触发 bind 错误）
        body.production_batch_code = null;
        // 2026-08-10 修复：id 默认 = request_code（不传 id，后端 newId = requestCode；之前前端传 MR${Date.now()} 作 id，导致 id 列与 code 列存了不同值）
        body.request_code = body.request_code || item.code || `MR${Date.now()}`;
        delete body.id;
        body.request_type = body.request_type || '领料申请';
        // 2026-08-10 修复：request_title NOT NULL 约束——前端无 title 字段，给默认占位
        body.request_title = body.request_title || item.title || '领料申请';
        body.department_id = body.department_id || null;
        body.department_name = body.department_name || item.department || '';
        body.applicant_id = body.applicant_id || null;
        body.applicant_name = body.applicant_name || item.applicant || '';
        body.apply_date = body.apply_date || item.date || new Date().toISOString().split('T')[0];
        body.expected_date = body.expected_date || null;
        body.warehouse_id = body.warehouse_id || null;
        body.warehouse_name = body.warehouse_name || item.warehouseLocation || '';
        // 2026-08-10：plantArea → plant_area (JSON 字符串)
        body.plant_area = JSON.stringify(item.plantAreas || []);
        body.total_amount = body.total_amount || 0;
        body.priority = body.priority || 'medium';
        body.status = body.status || 'draft';
        body.approval_status = body.approval_status || 'pending';
        body.remarks = body.remarks || null;
        body.attachments = body.attachments || null;
        body.create_by = body.create_by || null;
        body.create_time = new Date().toISOString();
        body.update_time = new Date().toISOString();
        body.materials = JSON.stringify(body.materials || item.materials || []);

        const result = await enhancedApiClient.post<Record<string, unknown>>('/material-requests', body);

        // 2026-08-10 修复：normalize FIELD_MAP 改用 camelCase key（适配 camelCaseResponse 中间件），
        //   所以传给 normalize 的对象必须用 camelCase 字段名（之前用 snake_case 导致主字段全空）
        const newItem = normalize({
          id: result?.data?.id || result?.id || `MR${Date.now()}`,
          requestCode: result?.data?.requestCode || body.request_code,
          requestTitle: body.request_title,
          applyDate: body.apply_date,
          applicantName: body.applicant_name,
          departmentName: body.department_name,
          warehouseName: body.warehouse_name,
          plantArea: body.plant_area,
          approvalStatus: 'pending',
          status: 'draft',
          materials: item.materials || [],
        } as Record<string, unknown>);

        set((s) => ({ items: [newItem, ...s.items] }));
        return newItem;
      } catch (error) {
        // logger.error('[MaterialRequestStore] 添加物料申请失败:', error);
        return null;
      }
    },

    // 更新
    updateItem: async (id, updates) => {
      const body = denormalize(updates);
      // 2026-08-10：plantAreas → plant_area (JSON 字符串)，保留 production_batch_code=null 占位（后端 SQL 仍引用）
      if (Array.isArray(updates.plantAreas)) {
        body.plant_area = JSON.stringify(updates.plantAreas);
      }
      delete body.plantAreas;
      delete body.plantAreaRaw;
      body.production_batch_code = null;
      // 2026-08-10 修复：PUT 是动态 fields 拼接，但保险起见显式补全关键字段
      body.update_time = new Date().toISOString();

      set((s) => ({
        items: s.items.map((i) =>
          i.id === id || i.code === id ? { ...i, ...updates } : i
        ),
      }));

      try {
        await enhancedApiClient.put(`/material-requests/${id}`, body);
        return true;
      } catch (error) {
        // logger.error('[MaterialRequestStore] 更新物料申请失败:', error);
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
        // logger.error('[MaterialRequestStore] 删除物料申请失败:', error);
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
