/**
 * 入职办理页面 Hook
 * 使用 Zustand Store 替代 React Query
 * 数据流：Store → Hook → 组件
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useOnboardingStore } from '@/stores';
import type { OnboardingData } from '@/stores';
import type { OnboardingRecord } from '../../../../services/apiOnboardingService';

// Store 数据已通过 normalize 完成格式转换，这里做最终适配
function adaptStoreItem(storeItem: OnboardingData): OnboardingRecord {
  return {
    id: storeItem.id,
    oid: storeItem.oid,
    name: storeItem.name,
    idCard: storeItem.idCard,
    phone: storeItem.phone,
    position: storeItem.position,
    department: storeItem.department,
    departmentOid: storeItem.departmentOid,
    contractType: storeItem.contractType,
    dailyWage: storeItem.dailyWage,
    hourlyWage: storeItem.hourlyWage,
    joinDate: storeItem.joinDate,
    status: storeItem.status as '待入职' | '办理中' | '已入职',
    progress: storeItem.progress,
    requestCode: storeItem.requestCode || '',
    recruitmentId: storeItem.recruitmentId || '',
    operatorId: storeItem.operatorId,
    operatorName: storeItem.operatorName,
    approvedAt: storeItem.approvedAt || '',
    remarks: storeItem.remarks || '',
    createTime: storeItem.createTime || '',
    updateTime: storeItem.updateTime || '',
  };
}

export interface OnboardingFilters {
  status: string;
  keyword: string;
}

export interface OnboardingPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

export interface OnboardingFormData {
  name: string;
  idCard: string;
  phone: string;
  position: string;
  department: string;
  contractType: string;
  dailyWage?: number;
  hourlyWage?: number;
  joinDate: string;
}

export type OnboardingStatus = '待入职' | '办理中' | '已入职';

export interface UseOnboardingReturn {
  data: OnboardingRecord[];
  filters: OnboardingFilters;
  pagination: OnboardingPagination;
  setFilters: (filters: OnboardingFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  createOnboarding: (data: OnboardingFormData, operatorId: string, operatorName: string) => void;
  updateOnboarding: (id: string, data: Partial<OnboardingFormData>) => void;
  updateStatus: (id: string, status: OnboardingStatus, operatorId: string, operatorName: string) => void;
  deleteOnboarding: (id: string) => void;
  getOnboardingById: (id: string) => OnboardingRecord | undefined;
  filteredData: OnboardingRecord[];
  isLoading: boolean;
}

export function useOnboarding(): UseOnboardingReturn {
  // 筛选条件
  const [filters, setFilters] = useState<OnboardingFilters>({
    status: '',
    keyword: '',
  });

  // 分页状态
  const [pagination, setPaginationState] = useState<OnboardingPagination>({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });

  // ============================================================
  // Zustand Store
  // ============================================================

  const items = useOnboardingStore((s) => s.items);
  const isLoading = useOnboardingStore((s) => s.isLoading);
  const fetchItems = useOnboardingStore((s) => s.fetchItems);
  const createItem = useOnboardingStore((s) => s.createItem);
  const updateItem = useOnboardingStore((s) => s.updateItem);
  const storeUpdateStatus = useOnboardingStore((s) => s.updateStatus);
  const storeDeleteItem = useOnboardingStore((s) => s.deleteItem);

  // 组件挂载时加载数据
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 将 Store 数据转换为页面格式
  const records: OnboardingRecord[] = useMemo(() => {
    return items.map(adaptStoreItem);
  }, [items]);

  // 基于筛选条件的前端过滤
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filters.status && r.status !== filters.status) return false;
      if (filters.keyword && !r.name.includes(filters.keyword) && !r.idCard.includes(filters.keyword)) return false;
      return true;
    });
  }, [records, filters]);

  // 更新分页总数（纯前端计算）
  useEffect(() => {
    setPaginationState(prev => ({ ...prev, total: filteredRecords.length }));
  }, [filteredRecords.length]);

  // 设置页码
  const setPage = useCallback((page: number) => {
    setPaginationState(prev => ({ ...prev, currentPage: page }));
  }, []);

  // 设置每页数量
  const setPageSize = useCallback((size: number) => {
    setPaginationState(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // 创建入职记录
  const createOnboarding = useCallback((formData: OnboardingFormData, operatorId: string, operatorName: string) => {
    createItem({
      name: formData.name,
      idCard: formData.idCard,
      phone: formData.phone,
      position: formData.position,
      department: formData.department,
      contractType: formData.contractType,
      dailyWage: formData.dailyWage,
      hourlyWage: formData.hourlyWage,
      joinDate: formData.joinDate,
      operatorId,
      operatorName,
    });
  }, [createItem]);

  // 更新入职记录
  const updateOnboarding = useCallback((id: string, data: Partial<OnboardingFormData>) => {
    updateItem(id, {
      name: data.name,
      idCard: data.idCard,
      phone: data.phone,
      position: data.position,
      department: data.department,
      contractType: data.contractType,
      dailyWage: data.dailyWage,
      hourlyWage: data.hourlyWage,
      joinDate: data.joinDate,
    });
  }, [updateItem]);

  // 更新入职状态
  const updateStatus = useCallback((id: string, status: OnboardingStatus, operatorId: string, operatorName: string) => {
    const statusMap: Record<OnboardingStatus, string> = {
      '待入职': 'pending',
      '办理中': 'processing',
      '已入职': 'onboarded',
    };
    storeUpdateStatus(id, statusMap[status], operatorId, operatorName);
  }, [storeUpdateStatus]);

  // 删除入职记录
  const deleteOnboarding = useCallback((id: string) => {
    storeDeleteItem(id);
  }, [storeDeleteItem]);

  // 根据ID获取记录
  const getOnboardingById = useCallback((id: string): OnboardingRecord | undefined => {
    return records.find(r => r.id === id);
  }, [records]);

  // 过滤后的数据
  const filteredData = filteredRecords;

  return {
    data: records,
    filters,
    pagination: pagination,
    setFilters,
    setPage,
    setPageSize,
    createOnboarding,
    updateOnboarding,
    updateStatus,
    deleteOnboarding,
    getOnboardingById,
    filteredData,
    isLoading,
  };
}
