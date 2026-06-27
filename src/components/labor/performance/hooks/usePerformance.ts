/**
 * 绩效考核数据 Hook
 * 统一管理考核相关的数据和操作逻辑
 * V2.0: 数据源迁移到 usePerformanceStore (Zustand)
 * 2026-06-27 P0：改为 API 持久化（替换原 mock + persist），暴露 CRUD async actions
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePerformanceStore } from '@/stores';
import type {
  PerformanceRecord,
  PerformanceFilters,
} from '../types';
import type { CreatePerformanceParams, UpdatePerformanceParams } from '@/services/apiPerformanceService';

export interface UsePerformanceReturn {
  // 数据
  filters: PerformanceFilters;
  pagination: { currentPage: number; pageSize: number };
  selectedRecord: PerformanceRecord | null;
  showDetailModal: boolean;
  isLoading: boolean;
  error: string | null;

  // 计算属性
  filteredData: PerformanceRecord[];
  paginatedData: PerformanceRecord[];
  totalPages: number;
  totalCount: number;

  // 视图操作
  setFilters: (filters: Partial<PerformanceFilters>) => void;
  setPagination: (pagination: Partial<{ currentPage: number; pageSize: number }>) => void;
  handleViewDetail: (record: PerformanceRecord) => void;
  handleCloseDetail: () => void;
  handleResetFilters: () => void;

  // CRUD 操作（async，2026-06-27 P0：保证数据进后端）
  refresh: () => Promise<void>;
  addItem: (item: CreatePerformanceParams) => Promise<PerformanceRecord>;
  updateItem: (id: string, updates: UpdatePerformanceParams) => Promise<PerformanceRecord>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
}

export function usePerformance(): UsePerformanceReturn {
  // ========== Zustand Store ==========
  const items = usePerformanceStore((state) => state.items);
  const storeFilters = usePerformanceStore((state) => state.filters);
  const isLoading = usePerformanceStore((state) => state.isLoading);
  const error = usePerformanceStore((state) => state.error);
  const storeSetFilters = usePerformanceStore((state) => state.setFilters);
  const storeResetFilters = usePerformanceStore((state) => state.resetFilters);
  const fetchItems = usePerformanceStore((state) => state.fetchItems);
  const addItem = usePerformanceStore((state) => state.addItem);
  const updateItem = usePerformanceStore((state) => state.updateItem);
  const deleteItem = usePerformanceStore((state) => state.deleteItem);
  const deleteItems = usePerformanceStore((state) => state.deleteItems);

  // 初始化：从后端加载（V2.1 铁律：API 直连，无缓存兜底）
  useEffect(() => {
    fetchItems().catch((e) => {
      console.error('[usePerformance] fetchItems failed:', e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== 本地状态 ==========
  const [pagination, setPaginationState] = useState({
    currentPage: 1,
    pageSize: 10,
  });
  const [selectedRecord, setSelectedRecord] = useState<PerformanceRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ========== 筛选/分页（纯前端计算）==========

  const filteredData = useMemo(() => {
    return items.filter((item) => {
      if (storeFilters.month && item.month !== storeFilters.month) return false;
      if (storeFilters.department && item.department !== storeFilters.department) return false;
      if (storeFilters.keyword && !item.staffName.includes(storeFilters.keyword) && !item.staffId.includes(storeFilters.keyword)) return false;
      return true;
    }).sort((a, b) => {
      if (a.month !== b.month) return b.month.localeCompare(a.month);
      return b.totalScore - a.totalScore;
    });
  }, [items, storeFilters]);

  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination]);

  const totalPages = Math.ceil(filteredData.length / pagination.pageSize) || 1;
  const totalCount = filteredData.length;

  const setFilters = useCallback((newFilters: Partial<PerformanceFilters>) => {
    storeSetFilters(newFilters);
    setPaginationState((prev) => ({ ...prev, currentPage: 1 }));
  }, [storeSetFilters]);

  const setPagination = useCallback((newPagination: Partial<{ currentPage: number; pageSize: number }>) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
    if (newPagination.currentPage === undefined) {
      setPaginationState((prev) => ({ ...prev, currentPage: 1 }));
    }
  }, []);

  const handleViewDetail = useCallback((record: PerformanceRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetailModal(false);
    setSelectedRecord(null);
  }, []);

  const handleResetFilters = useCallback(() => {
    storeResetFilters();
    setPaginationState((prev) => ({ ...prev, currentPage: 1 }));
  }, [storeResetFilters]);

  return {
    filters: storeFilters,
    pagination,
    selectedRecord,
    showDetailModal,
    isLoading,
    error,
    filteredData,
    paginatedData,
    totalPages,
    totalCount,
    setFilters,
    setPagination,
    handleViewDetail,
    handleCloseDetail,
    handleResetFilters,
    refresh: () => fetchItems(),
    addItem,
    updateItem,
    deleteItem,
    deleteItems,
  };
}
