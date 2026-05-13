/**
 * 仓库入库数据管理 Hook
 * 从 WarehouseInboundPage 拆分出来，集中管理状态和业务逻辑
 * 数据来源：API → enhancedApiClient → React Query
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InboundRecord,
  InboundMaterial,
  InboundSearchFilters,
  CodeGenState,
  categoryConfig,
  bigCategoriesList,
} from '../../../types/warehouseInbound.types';
import {
  handleCodeGen,
  copyToClipboard,
  resetCodeGen,
  generateSequentialOrderCode,
  filterInboundRecords,
  calculatePagination,
  handleSelectAll,
  handleSelectRow,
  handleCancelSelection,
} from '../utils/warehouseInbound.utils';
import { useInboundRecords, useCreateInbound, useDeleteInbound } from '../../../hooks/useWarehouseQueries';
import { queryClient } from '../../../lib/queryClient';

/**
 * 仓库入库 Hook
 * 集中管理入库页面的所有状态和业务逻辑
 * 数据从 API 获取，支持缓存和自动刷新
 */
export function useWarehouseInbound() {
  const navigate = useNavigate();

  // ========== 数据获取（从 API）==========
  // 使用 React Query 获取数据，支持缓存和自动刷新
  const { data: apiInboundRecords = [], refetch, isLoading } = useInboundRecords();
  const createInboundMutation = useCreateInbound();
  const deleteInboundMutation = useDeleteInbound();

  // 将 API 数据同步到本地状态
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>([]);

  // 当 API 数据变化时同步到本地状态
  useEffect(() => {
    if (apiInboundRecords.length > 0) {
      setInboundRecords(apiInboundRecords);
    }
  }, [apiInboundRecords]);

  // 刷新数据
  const refreshData = useCallback(() => {
    refetch();
  }, [refetch]);

  // 编码生成相关状态
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);
  const [codeGen, setCodeGen] = useState<CodeGenState>({
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    generatedCode: '',
  });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 分页相关状态
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundPageSize, setInboundPageSize] = useState(10);

  // 选择相关状态
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // 模式状态
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  // 弹窗状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInboundDetailModal, setShowInboundDetailModal] = useState(false);
  const [showInboundEditModal, setShowInboundEditModal] = useState(false);
  const [showInboundAddModal, setShowInboundAddModal] = useState(false);
  const [showInboundDeleteModal, setShowInboundDeleteModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);

  // 数据状态（现在从 API 获取）
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // 搜索筛选状态
  const [inboundSearchCode, setInboundSearchCode] = useState('');
  const [inboundSearchSupplier, setInboundSearchSupplier] = useState('');
  const [inboundSearchStatus, setInboundSearchStatus] = useState('');
  const [inboundSearchMaterialName, setInboundSearchMaterialName] = useState('');
  const [inboundSearchMaterialCode, setInboundSearchMaterialCode] = useState('');

  // 选中记录状态
  const [selectedInboundRecord, setSelectedInboundRecord] = useState<InboundRecord | null>(null);
  const [selectedInboundRecords, setSelectedInboundRecords] = useState<InboundRecord[]>([]);

  // 搜索条件对象
  const searchFilters: InboundSearchFilters = {
    code: inboundSearchCode,
    supplier: inboundSearchSupplier,
    status: inboundSearchStatus,
    materialName: inboundSearchMaterialName,
    materialCode: inboundSearchMaterialCode,
  };

  // 过滤后的记录
  const filteredRecords = useMemo(() => {
    return filterInboundRecords(inboundRecords, searchFilters);
  }, [inboundRecords, searchFilters]);

  // 分页计算
  const { totalPages, startIdx, endIdx } = useMemo(() => {
    return calculatePagination(filteredRecords.length, inboundPage, inboundPageSize);
  }, [filteredRecords.length, inboundPage, inboundPageSize]);

  // 当前页显示的记录
  const displayedRecords = useMemo(() => {
    return filteredRecords.slice(startIdx, endIdx);
  }, [filteredRecords, startIdx, endIdx]);

  // 选中的记录列表
  const selectedRecords = useMemo(() => {
    return inboundRecords.filter(r => selectedRows.includes(r.id));
  }, [inboundRecords, selectedRows]);

  // 是否全选
  const isAllSelected = useMemo(() => {
    if (deleteMode) {
      return displayedRecords.filter(r => r.status === 'pending').every(r => selectedRows.includes(r.id));
    }
    return displayedRecords.length > 0 && selectedRows.length === displayedRecords.length;
  }, [displayedRecords, selectedRows, deleteMode]);

  // 切换展开行
  const toggleExpandRow = useCallback((id: number) => {
    setExpandedRows(prev => {
      const newExpandedRows = new Set(prev);
      if (newExpandedRows.has(id)) {
        newExpandedRows.delete(id);
      } else {
        newExpandedRows.add(id);
      }
      return newExpandedRows;
    });
  }, []);

  // 重置搜索条件
  const resetSearchFilters = useCallback(() => {
    setInboundSearchCode('');
    setInboundSearchSupplier('');
    setInboundSearchStatus('');
    setInboundSearchMaterialName('');
    setInboundSearchMaterialCode('');
    setInboundPage(1);
  }, []);

  // 编码生成
  const handleGenerateCode = useCallback(() => {
    handleCodeGen(codeGen, setCodeGen, setCodeGenError, setCodeGenSuccess);
  }, [codeGen]);

  // 复制编码
  const handleCopyCode = useCallback(() => {
    if (codeGen.generatedCode) {
      copyToClipboard(codeGen.generatedCode, setCopySuccess);
    }
  }, [codeGen.generatedCode]);

  // 重置编码生成器
  const handleResetCodeGen = useCallback(() => {
    resetCodeGen(setCodeGen, setCodeGenError, setCodeGenSuccess);
  }, []);

  // 全选/取消全选
  const onSelectAll = useCallback(() => {
    handleSelectAll(displayedRecords, selectedRows, deleteMode, setSelectedRows);
  }, [displayedRecords, selectedRows, deleteMode]);

  // 选择/取消单行
  const onSelectRow = useCallback((id: number) => {
    handleSelectRow(id, selectedRows, setSelectedRows);
  }, [selectedRows]);

  // 取消选择模式
  const onCancelSelection = useCallback(() => {
    handleCancelSelection(setEditMode, setDeleteMode, setExportMode, setSelectedRows);
  }, []);

  // 确认导出
  const onConfirmExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  // 查看记录
  const onViewRecord = useCallback((record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowInboundDetailModal(true);
  }, []);

  // 编辑记录
  const onEditRecord = useCallback((record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowInboundEditModal(true);
  }, []);

  // 删除记录
  const onDeleteRecord = useCallback((record: InboundRecord) => {
    setSelectedInboundRecords([record]);
    setShowInboundDeleteModal(true);
  }, []);

  // 批量删除记录
  const onBatchDeleteRecords = useCallback((records: InboundRecord[]) => {
    setSelectedInboundRecords(records);
    setShowInboundDeleteModal(true);
  }, []);

  // 确认删除
  const onConfirmInboundDelete = useCallback(async () => {
    if (selectedInboundRecords.length > 0) {
      // 调用 API 删除每条记录
      for (const record of selectedInboundRecords) {
        await deleteInboundMutation.mutateAsync(record.id);
      }
      // 刷新数据
      refetch();
    }
    setShowInboundDeleteModal(false);
    setSelectedInboundRecords([]);
  }, [selectedInboundRecords, deleteInboundMutation, refetch]);

  // 保存编辑
  const onSaveInboundEdit = useCallback((record: InboundRecord) => {
    setShowInboundEditModal(false);
    setSelectedInboundRecord(null);
  }, []);

  // 批量保存记录
  const onBatchSaveRecord = useCallback((records: InboundRecord[]) => {
    setInboundRecords(prev => {
      const idsToUpdate = records.map(r => r.id);
      const otherRecords = prev.filter(r => !idsToUpdate.includes(r.id));
      return [...otherRecords, ...records];
    });
    setShowInboundEditModal(false);
  }, []);

  // 添加记录
  const onAddRecord = useCallback(() => {
    setShowInboundAddModal(true);
  }, []);

  // 生成入库单号
  const onGenerateOrderCode = useCallback(() => {
    return generateSequentialOrderCode(inboundRecords);
  }, [inboundRecords]);

  // 保存新记录
  const onSaveNewInbound = useCallback(async (record: Omit<InboundRecord, 'id'>) => {
    try {
      // 调用 API 创建记录
      await createInboundMutation.mutateAsync(record);
      // 刷新数据
      refetch();
    } catch (error) {
      console.error('创建入库记录失败:', error);
    }
    setShowInboundAddModal(false);
  }, [createInboundMutation, refetch]);

  // 确认编辑
  const onConfirmEdit = useCallback(() => {
    if (selectedRows.length === 0) {
      alert('请先选择要编辑的记录');
      return;
    }
    setShowBatchEditModal(true);
  }, [selectedRows]);

  // 确认删除（批量）
  const onConfirmDelete = useCallback(() => {
    if (selectedRows.length > 0 && selectedRecords.length > 0) {
      onBatchDeleteRecords(selectedRecords);
    }
    onCancelSelection();
  }, [selectedRows, selectedRecords, onBatchDeleteRecords, onCancelSelection]);

  // 编码生成器选择变化处理
  const handleCodeGenChange = useCallback((field: 'bigCategory' | 'midCategory' | 'subCategory', value: string) => {
    setCodeGen(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'bigCategory') {
        newState.midCategory = '';
        newState.subCategory = '';
        newState.generatedCode = '';
      } else if (field === 'midCategory') {
        newState.subCategory = '';
        newState.generatedCode = '';
      } else if (field === 'subCategory') {
        newState.generatedCode = '';
      }
      return newState;
    });
    setCodeGenError('');
    setCodeGenSuccess('');
  }, []);

  return {
    // 导航
    navigate,

    // 数据加载状态
    isLoading,
    refreshData,

    // 编码生成相关
    codeGenExpanded,
    setCodeGenExpanded,
    codeGen,
    setCodeGen,
    codeGenError,
    codeGenSuccess,
    copySuccess,
    handleGenerateCode,
    handleCopyCode,
    handleResetCodeGen,
    handleCodeGenChange,

    // 分页相关
    inboundPage,
    setInboundPage,
    inboundPageSize,
    setInboundPageSize,
    totalPages,

    // 选择相关
    selectedRows,
    setSelectedRows,
    editMode,
    setEditMode,
    deleteMode,
    setDeleteMode,
    exportMode,
    setExportMode,

    // 弹窗相关
    showExportModal,
    setShowExportModal,
    showInboundDetailModal,
    setShowInboundDetailModal,
    showInboundEditModal,
    setShowInboundEditModal,
    showInboundAddModal,
    setShowInboundAddModal,
    showInboundDeleteModal,
    setShowInboundDeleteModal,
    showBatchEditModal,
    setShowBatchEditModal,

    // 数据相关
    inboundRecords,
    setInboundRecords,
    expandedRows,
    setExpandedRows,

    // 搜索筛选相关
    inboundSearchCode,
    setInboundSearchCode,
    inboundSearchSupplier,
    setInboundSearchSupplier,
    inboundSearchStatus,
    setInboundSearchStatus,
    inboundSearchMaterialName,
    setInboundSearchMaterialName,
    inboundSearchMaterialCode,
    setInboundSearchMaterialCode,
    resetSearchFilters,

    // 选中记录相关
    selectedInboundRecord,
    setSelectedInboundRecord,
    selectedInboundRecords,
    setSelectedInboundRecords,

    // 计算属性
    displayedRecords,
    selectedRecords,
    isAllSelected,
    filteredRecords,

    // 行展开
    onToggleExpand: toggleExpandRow,

    // 操作方法
    onSelectAll,
    onSelectRow,
    onCancelSelection,
    onConfirmExport,
    onViewRecord,
    onEditRecord,
    onDeleteRecord,
    onBatchDeleteRecords,
    onConfirmInboundDelete,
    onSaveInboundEdit,
    onBatchSaveRecord,
    onAddRecord,
    onGenerateOrderCode,
    onSaveNewInbound,
    onConfirmEdit,
    onConfirmDelete,

    // 配置常量
    categoryConfig,
    bigCategoriesList,
  };
}
