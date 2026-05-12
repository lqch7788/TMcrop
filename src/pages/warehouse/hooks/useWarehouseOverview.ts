/**
 * 仓库物料总览 Hook
 * 使用 React Query 管理物料数据的获取和缓存
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMaterials, useUpdateMaterial, useDeleteMaterial } from '../../../hooks/useWarehouseQueries';
import type { Material } from '../../../services/apiWarehouseMaterialService';

export interface MaterialFiltersState {
  code: string;
  name: string;
  category: string;
  supplier: string;
  location: string;
  searchBigCategory: string;
  searchMidCategory: string;
  searchSubCategory: string;
  showLowStock: boolean;
}

const initialFilters: MaterialFiltersState = {
  code: '',
  name: '',
  category: '全部',
  supplier: '',
  location: '',
  searchBigCategory: '',
  searchMidCategory: '',
  searchSubCategory: '',
  showLowStock: false,
};

export function useWarehouseOverview() {
  // 数据获取（从 API）
  const { data: apiMaterials = [], refetch, isLoading } = useMaterials();
  const updateMaterialMutation = useUpdateMaterial();
  const deleteMaterialMutation = useDeleteMaterial();

  // 将 API 数据同步到本地状态
  const [warehouseData, setWarehouseData] = useState<Material[]>([]);

  // 当 API 数据变化时同步到本地状态
  useEffect(() => {
    if (apiMaterials.length > 0) {
      setWarehouseData(apiMaterials);
    }
  }, [apiMaterials]);

  // 刷新数据
  const refreshData = useCallback(() => {
    refetch();
  }, [refetch]);

  // 筛选状态
  const [filters, setFilters] = useState<MaterialFiltersState>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  // 低库存数量
  const lowStockCount = useMemo(() => {
    return warehouseData.filter(m => m.quantity < m.minStock).length;
  }, [warehouseData]);

  // 过滤后的物料
  const filteredMaterials = useMemo(() => {
    return warehouseData.filter(m => {
      if (filters.code && !m.code.includes(filters.code)) return false;
      if (filters.name && !m.name.includes(filters.name)) return false;
      if (filters.category && filters.category !== '全部' && m.category !== filters.category) return false;
      if (filters.supplier && !m.supplier.includes(filters.supplier)) return false;
      if (filters.location && !m.location.includes(filters.location)) return false;
      if (filters.showLowStock && m.quantity >= m.minStock) return false;
      return true;
    });
  }, [warehouseData, filters]);

  // 筛选条件变化
  const handleFiltersChange = useCallback((newFilters: MaterialFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === filteredMaterials.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredMaterials.map(m => m.id));
    }
  }, [filteredMaterials, selectedRows]);

  // 选择/取消单行
  const handleSelectRow = useCallback((id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  }, [selectedRows]);

  // 取消选择
  const handleCancelSelection = useCallback(() => {
    setExportMode(false);
    setBatchEditMode(false);
    setDeleteMode(false);
    setSelectedRows([]);
  }, []);

  // 删除物料
  const handleConfirmDelete = useCallback(async (materialId: number) => {
    await deleteMaterialMutation.mutateAsync(materialId);
    refetch();
  }, [deleteMaterialMutation, refetch]);

  // 批量删除
  const handleBatchDelete = useCallback(async (ids: number[]) => {
    for (const id of ids) {
      await deleteMaterialMutation.mutateAsync(id);
    }
    refetch();
  }, [deleteMaterialMutation, refetch]);

  // 更新物料
  const handleUpdateMaterial = useCallback(async (id: number, updates: Partial<Material>) => {
    await updateMaterialMutation.mutateAsync({ id, updates });
    refetch();
  }, [updateMaterialMutation, refetch]);

  return {
    // 数据
    materials: filteredMaterials,
    allMaterials: warehouseData,
    isLoading,
    refreshData,

    // 筛选
    filters,
    handleFiltersChange,
    lowStockCount,

    // 分页
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    // 选择
    selectedRows,
    setSelectedRows,
    batchEditMode,
    setBatchEditMode,
    deleteMode,
    setDeleteMode,
    exportMode,
    setExportMode,

    // 操作
    handleSelectAll,
    handleSelectRow,
    handleCancelSelection,
    handleConfirmDelete,
    handleBatchDelete,
    handleUpdateMaterial,
  };
}
