/**
 * 绩效考核数据 Hook
 * 统一管理考核相关的数据和操作逻辑
 */
import { useState, useCallback, useMemo } from 'react';
import {
  PerformanceRecord,
  PerformanceFilters,
  MOCK_PERFORMANCE_DATA,
} from '../types';

export interface UsePerformanceReturn {
  // 数据
  filters: PerformanceFilters;
  pagination: { currentPage: number; pageSize: number };
  selectedRecord: PerformanceRecord | null;
  showDetailModal: boolean;

  // 计算属性
  filteredData: PerformanceRecord[];
  paginatedData: PerformanceRecord[];
  totalPages: number;
  totalCount: number;

  // 操作方法
  setFilters: (filters: Partial<PerformanceFilters>) => void;
  setPagination: (pagination: Partial<{ currentPage: number; pageSize: number }>) => void;
  handleViewDetail: (record: PerformanceRecord) => void;
  handleCloseDetail: () => void;
  handleResetFilters: () => void;
}

export function usePerformance(): UsePerformanceReturn {
  // 筛选条件状态
  const [filters, setFiltersState] = useState<PerformanceFilters>({
    month: '',
    department: '',
    keyword: '',
  });

  // 分页状态
  const [pagination, setPaginationState] = useState({
    currentPage: 1,
    pageSize: 10,
  });

  // 详情弹窗状态
  const [selectedRecord, setSelectedRecord] = useState<PerformanceRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 筛选数据
  const filteredData = useMemo(() => {
    return MOCK_PERFORMANCE_DATA.filter((item) => {
      // 月份筛选
      if (filters.month && item.month !== filters.month) return false;
      // 部门筛选
      if (filters.department && item.department !== filters.department) return false;
      // 关键词筛选
      if (filters.keyword && !item.staffName.includes(filters.keyword) && !item.staffId.includes(filters.keyword)) return false;
      return true;
    }).sort((a, b) => {
      // 按月份和总分排序
      if (a.month !== b.month) return b.month.localeCompare(a.month);
      return b.totalScore - a.totalScore;
    });
  }, [filters]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination]);

  // 总页数
  const totalPages = Math.ceil(filteredData.length / pagination.pageSize) || 1;

  // 总记录数
  const totalCount = filteredData.length;

  // 更新筛选条件
  const setFilters = useCallback((newFilters: Partial<PerformanceFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPaginationState((prev) => ({ ...prev, currentPage: 1 })); // 重置页码
  }, []);

  // 更新分页
  const setPagination = useCallback((newPagination: Partial<{ currentPage: number; pageSize: number }>) => {
    setPaginationState((prev) => ({ ...prev, ...newPagination }));
    if (newPagination.currentPage === undefined) {
      setPaginationState((prev) => ({ ...prev, currentPage: 1 }));
    }
  }, []);

  // 查看详情
  const handleViewDetail = useCallback((record: PerformanceRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  }, []);

  // 关闭详情
  const handleCloseDetail = useCallback(() => {
    setShowDetailModal(false);
    setSelectedRecord(null);
  }, []);

  // 重置筛选
  const handleResetFilters = useCallback(() => {
    setFiltersState({ month: '', department: '', keyword: '' });
    setPaginationState((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  return {
    // 数据
    filters,
    pagination,
    selectedRecord,
    showDetailModal,

    // 计算属性
    filteredData,
    paginatedData,
    totalPages,
    totalCount,

    // 操作方法
    setFilters,
    setPagination,
    handleViewDetail,
    handleCloseDetail,
    handleResetFilters,
  };
}
