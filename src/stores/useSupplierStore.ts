/**
 * 供应商管理 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 */
import { create } from 'zustand';
import { Supplier } from '../components/supplier/types';
import { enhancedApiClient } from '../lib/apiClient';

interface SupplierState {
  items: Supplier[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<Supplier, 'id'>) => Promise<Supplier | null>;
  updateItem: (id: number, updates: Partial<Supplier>) => Promise<Supplier | null>;
  deleteItem: (id: number) => Promise<boolean>;
  deleteItems: (ids: number[]) => Promise<boolean>;
}

/**
 * 前端camelCase → 后端请求体snake_case映射
 */
function toBackendFields(item: Partial<Supplier>): Record<string, unknown> {
  return {
    supplier_code: item.code,
    supplier_name: item.name,
    contact_person: item.contact,
    mobile_phone: item.mobilePhone,
    contact_phone: item.mobilePhone,
    work_phone: item.workPhone,
    fax: item.fax,
    address: item.address,
    supplier_type: item.supplierType,
    supplier_attribute: item.supplierAttribute,
    status: item.status === '合作中' ? 'active' : item.status === '暂停' ? 'inactive' : 'active',
    country: item.country,
    province: item.province,
    city: item.city,
    bank_name: item.bankName || '',
    bank_card_number: item.bankCardNumber || '',
    organization: item.organization,
    create_date: item.createDate,
    remarks: item.remarks,
    create_by: item.createBy,
  };
}

/**
 * 后端API响应 → 前端camelCase映射
 */
function fromBackendFields(record: Record<string, unknown>): Supplier {
  return {
    id: record.id,
    code: record.supplierCode || record.supplier_code || record.code || '',
    name: record.supplierName || record.supplier_name || record.name || '',
    supplierType: record.supplierType || record.supplier_type || record.supplierType || '',
    supplierAttribute: record.supplierAttribute || record.supplier_attribute || record.supplierAttribute || '',
    contact: record.contactPerson || record.contact_person || record.contact || '',
    mobilePhone: record.mobilePhone || record.mobile_phone || record.contactPhone || record.contact_phone || '',
    workPhone: record.workPhone || record.work_phone || '',
    fax: record.fax || '',
    status: record.status === 'active' ? '合作中' : record.status === 'inactive' ? '暂停' : record.status || '',
    country: record.country || '',
    province: record.province || '',
    city: record.city || '',
    address: record.address || '',
    bankName: record.bankName || record.bank_name || '',
    bankCardNumber: record.bankCardNumber || record.bank_card_number || '',
    organization: record.organization || '',
    createDate: record.createDate || record.create_date || '',
    remarks: record.remarks || '',
  };
}

export const useSupplierStore = create<SupplierState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const resp = await enhancedApiClient.get<Record<string, unknown>[]>('/suppliers?limit=200');
        const list = Array.isArray(resp) ? resp : [];
        const mapped = list.map(fromBackendFields);
        set({ items: mapped, isLoading: false });
      } catch (error) {
        console.error('[useSupplierStore] 获取供应商失败:', error);
        set({ error: error instanceof Error ? error.message : '获取供应商失败', isLoading: false });
      }
    },

    addItem: async (item) => {
      try {
        const backendData = toBackendFields(item);
        backendData.id = item.code || `SUP${Date.now()}`;
        const result = await enhancedApiClient.post<Record<string, unknown>>('/suppliers', backendData);
        const newItem: Supplier = {
          ...item,
          id: result?.id || Date.now(),
        };
        set((s) => ({ items: [newItem, ...s.items] }));
        return newItem;
      } catch (error) {
        console.error('[useSupplierStore] 添加供应商失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const backendUpdates = toBackendFields(updates);
        await enhancedApiClient.put(`/suppliers/${id}`, backendUpdates);
        let found: Supplier | null = null;
        set((s) => {
          const updated = s.items.map((i) => i.id === id ? { ...i, ...updates } as Supplier : i);
          found = updated.find((i) => i.id === id) || null;
          return { items: updated };
        });
        return found;
      } catch (error) {
        console.error('[useSupplierStore] 更新供应商失败:', error);
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await enhancedApiClient.delete(`/suppliers/${id}`);
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return true;
      } catch (error) {
        console.error('[useSupplierStore] 删除供应商失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const results = await Promise.all(
          ids.map((id) =>
            enhancedApiClient.delete(`/suppliers/${id}`).then(() => true).catch(() => false)
          )
        );
        const allSuccess = results.every(Boolean);
        if (allSuccess) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return allSuccess;
      } catch (error) {
        console.error('[useSupplierStore] 批量删除供应商失败:', error);
        return false;
      }
    },
  })
);
