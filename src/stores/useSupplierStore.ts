/**
 * 供应商管理 Zustand Store
 * 数据流：enhancedApiClient → Store → 页面组件
 * 三级降级：API → IndexedDB → localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Supplier } from '../components/supplier/types';
import * as supplierService from '../services/apiSupplierService';
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

/** 前端camelCase → 后端snake_case映射 */
function toBackendFields(item: any) {
  return {
    supplier_code: item.code,
    supplier_name: item.name,
    contact_person: item.contact,
    contact_phone: item.mobilePhone,
    mobile_phone: item.mobilePhone,
    work_phone: item.workPhone,
    fax: item.fax,
    address: item.address,
    supplier_type: item.supplierType,
    supplier_attribute: item.supplierAttribute,
    status: item.status === '合作中' ? 'active' : item.status === '暂停' ? 'inactive' : 'active',
    country: item.country,
    province: item.province,
    city: item.city,
    bank_name: item.bankName,
    bank_card_number: item.bankCardNumber,
    organization: item.organization,
    create_date: item.createDate,
    remarks: item.remarks,
    create_by: item.createBy,
  };
}

/** 后端snake_case → 前端camelCase映射 */
function fromBackendFields(record: any): Supplier {
  return {
    id: record.id,
    code: record.supplier_code || record.code || '',
    name: record.supplier_name || record.name || '',
    supplierType: record.supplier_type || record.supplierType || '',
    supplierAttribute: record.supplier_attribute || record.supplierAttribute || '',
    contact: record.contact_person || record.contact || '',
    mobilePhone: record.mobile_phone || record.contact_phone || record.mobilePhone || '',
    workPhone: record.work_phone || record.workPhone || '',
    fax: record.fax || '',
    status: record.status === 'active' ? '合作中' : record.status === 'inactive' ? '暂停' : record.status || '',
    country: record.country || '',
    province: record.province || '',
    city: record.city || '',
    address: record.address || '',
    bankName: record.bank_name || record.bankName || '',
    bankCardNumber: record.bank_card_number || record.bankCardNumber || '',
    organization: record.organization || '',
    createDate: record.create_date || record.createDate || '',
    remarks: record.remarks || '',
  };
}

export const useSupplierStore = create<SupplierState>()(
  persist(
    (set) => ({
      items: [],
      isLoading: false,
      error: null,

      loadItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const resp = await enhancedApiClient.get<any>('/suppliers?limit=200', {
            useCache: true, cacheStrategy: 'network-first',
          });
          const list = resp?.data || resp || [];
          const mapped = (Array.isArray(list) ? list : []).map(fromBackendFields);
          set({ items: mapped, isLoading: false });
        } catch (error) {
          console.error('[useSupplierStore] 获取供应商失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addItem: async (item) => {
        try {
          const backendData = toBackendFields(item);
          backendData.id = item.code || `SUP${Date.now()}`;
          const result = await enhancedApiClient.post<any>('/suppliers', backendData, {
            offlineQueue: true, useCache: true,
          });
          const newItem: Supplier = {
            ...item,
            id: result?.data?.id || result?.id || Date.now(),
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
          await enhancedApiClient.put(`/suppliers/${id}`, backendUpdates, {
            offlineQueue: true,
          });
          set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
          return { ...updates } as Supplier;
        } catch (error) {
          console.error('[useSupplierStore] 更新供应商失败:', error);
          return null;
        }
      },

      deleteItem: async (id) => {
        try {
          await enhancedApiClient.delete(`/suppliers/${id}`, { offlineQueue: true });
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
              enhancedApiClient.delete(`/suppliers/${id}`, { offlineQueue: true }).then(() => true).catch(() => false)
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
    }),
    { name: 'supplier-storage', partialize: (s) => ({ items: s.items }) }
  )
);
