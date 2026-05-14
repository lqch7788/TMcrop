/**
 * 物料申请数据 Zustand Store
 * 数据流：enhancedApiClient → Store → 页面组件
 * 三级降级：API → IndexedDB → localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';
import type { MaterialReceivingRecord, MaterialItem } from '../types/materialReceiving';

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

/** 生成领料单号 */
function generateCode(): string {
  const d = new Date();
  return `LL${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(Date.now() % 10000).padStart(4, '0')}`;
}

export const useMaterialRequestDataStore = create<MaterialRequestDataState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      loadItems: async (params) => {
        set({ isLoading: true, error: null });
        try {
          const resp = await enhancedApiClient.get<any>('/material-requests', {
            useCache: true, cacheStrategy: 'network-first', params,
          });
          const list = resp?.data || (Array.isArray(resp) ? resp : []);
          const mapped: MaterialReceivingRecord[] = list.map((r: any) => ({
            id: r.id || r.requestCode,
            code: r.requestCode || r.code || r.id,
            date: r.applyDate || r.date || '',
            applicant: r.applicantName || r.applicant || '',
            department: r.departmentName || r.department || '',
            warehouseLocation: r.warehouseName || r.warehouseLocation || '',
            plantArea: r.plantArea || '',
            reviewer: r.reviewer || '',
            productionBatchCode: r.productionBatchCode || '',
            status: r.approvalStatus === 'approved' ? '已审批' : r.approvalStatus === 'rejected' ? '已拒绝' : r.approvalStatus === 'pending' ? '待审批' : r.status || '待审批',
            statusClass: r.approvalStatus === 'approved' ? 'approved' : r.approvalStatus === 'rejected' ? 'rejected' : 'pending',
            materials: (r.materials || []) as MaterialItem[],
          }));
          set({ items: mapped, isLoading: false });
        } catch (error) {
          console.error('[useMaterialRequestDataStore] 获取物料申请失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addItem: async (item) => {
        try {
          const code = generateCode();
          const result = await enhancedApiClient.post<any>('/material-requests', {
            request_code: code,
            request_type: '领料申请',
            applicant_name: item.applicant || '',
            department_name: item.department || '',
            warehouse_name: item.warehouseLocation || '',
            apply_date: item.date || new Date().toISOString().split('T')[0],
            plant_area: item.plantArea || '',
            production_batch_code: item.productionBatchCode || '',
            status: 'draft',
            approval_status: 'pending',
            materials: item.materials || [],
          }, { offlineQueue: true, useCache: true });

          const newItem: MaterialReceivingRecord = {
            id: result?.data?.id || result?.id || `MR${Date.now()}`,
            code: result?.data?.request_code || code,
            date: item.date || new Date().toISOString().split('T')[0],
            applicant: item.applicant || '',
            department: item.department || '',
            warehouseLocation: item.warehouseLocation || '',
            plantArea: item.plantArea || '',
            reviewer: item.reviewer || '',
            productionBatchCode: item.productionBatchCode || '',
            status: '待审批',
            statusClass: 'pending',
            materials: (item.materials || []) as MaterialItem[],
          };
          set((s) => ({ items: [newItem, ...s.items] }));
          return newItem;
        } catch (error) {
          console.error('[useMaterialRequestDataStore] 添加物料申请失败:', error);
          return null;
        }
      },

      updateItem: async (id, updates) => {
        try {
          await enhancedApiClient.put(`/material-requests/${id}`, updates, { offlineQueue: true });
          set((s) => ({ items: s.items.map((i) => i.id === id || i.code === id ? { ...i, ...updates } : i) }));
          return true;
        } catch (error) {
          console.error('[useMaterialRequestDataStore] 更新物料申请失败:', error);
          return false;
        }
      },

      deleteItem: async (id) => {
        try {
          await enhancedApiClient.delete(`/material-requests/${id}`, { offlineQueue: true });
          set((s) => ({ items: s.items.filter((i) => i.id !== id && i.code !== id) }));
          return true;
        } catch (error) {
          console.error('[useMaterialRequestDataStore] 删除物料申请失败:', error);
          return false;
        }
      },

      deleteItems: async (ids) => {
        try {
          const results = await Promise.all(
            ids.map((id) =>
              enhancedApiClient.delete(`/material-requests/${id}`, { offlineQueue: true }).then(() => true).catch(() => false)
            )
          );
          const allSuccess = results.every(Boolean);
          if (allSuccess) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id) && !ids.includes(i.code)) }));
          return allSuccess;
        } catch (error) {
          console.error('[useMaterialRequestDataStore] 批量删除物料申请失败:', error);
          return false;
        }
      },

      refresh: async () => {
        await get().loadItems();
      },
    }),
    { name: 'material-request-data-storage', partialize: (s) => ({ items: s.items }) }
  )
);
