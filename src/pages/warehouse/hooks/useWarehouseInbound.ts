/**
 * 仓库入库数据管理 Hook
 * 从 WarehouseInboundPage 拆分出来，集中管理状态和业务逻辑
 * 数据来源：Zustand Store → enhancedApiClient → API
 * 无缓存层，直接调用 API（V2.1 铁律：禁用 IndexedDB / localStorage / persist）
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  InboundRecord,
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
  handleSelectAll as utilSelectAll,
  handleSelectRow as utilSelectRow,
  handleCancelSelection,
} from '../utils/warehouseInbound.utils';
import { useInboundStore } from '../../../stores';
import { useWarehouseMaterialStore } from '../../../stores';
import { showAlert } from '@/lib/dialogService';

/**
 * 仓库入库 Hook
 * 集中管理入库页面的所有状态和业务逻辑
 * 数据从 Zustand Store 获取，无缓存层，直接调用 API（V2.1 铁律）
 */
export function useWarehouseInbound() {
  const navigate = useNavigate();

  // ========== 数据获取（从 Zustand Store）==========
  const {
    items: inboundRecords,
    isLoading,
    // 2026-09-28 审计修复：把 store.error 暴露给页面——
    // 此前加载失败（断网/500）只写进 store 无人消费，页面显示旧快照或空表却毫无提示
    error: inboundError,
    loadItems,
    addItem: storeAddItem,
    updateItem: storeUpdateItem,
    deleteItem: storeDeleteItem,
  } = useInboundStore();

  // 加载物料主数据（编码生成器依赖它算 max+1；2026-09-28 审计修复：此前本页从不加载，
  // 直开本页时列表为空 → 生成器从 001 起算，产出与库中已有物料重码的编码）
  const loadWarehouseMaterials = useWarehouseMaterialStore((s) => s.loadItems);

  // 初始化加载数据（始终从 API 拉取最新数据，避免 persist 缓存过期）
  useEffect(() => {
    loadItems();
    loadWarehouseMaterials();
  }, [loadItems, loadWarehouseMaterials]);

  // 刷新数据
  const refreshData = useCallback(() => {
    loadItems();
  }, [loadItems]);

  // 编码生成相关状态
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);
  const [codeGen, setCodeGen] = useState<CodeGenState>({
    bigCategory: '',
    midCategory: '',
    subCategory: '',
    generatedCode: '',
  });

  // 仓库物料主数据（用于编码生成器查 max+1）
  const warehouseMaterials = useWarehouseMaterialStore((s) => s.items);
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 分页相关状态
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundPageSize, setInboundPageSize] = useState(10);

  // 选择相关状态
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // 模式状态（2026-09-28：editMode 死分支已移除）
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  // 弹窗状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInboundDetailModal, setShowInboundDetailModal] = useState(false);
  const [showInboundEditModal, setShowInboundEditModal] = useState(false);
  const [showInboundAddModal, setShowInboundAddModal] = useState(false);
  const [showInboundDeleteModal, setShowInboundDeleteModal] = useState(false);
  // 2026-09-27：冲销弹窗（红字单，处理"货已被领用无法作废"的场景）
  const [showReversalModal, setShowReversalModal] = useState(false);

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

  // 2026-09-28 审计修复：筛选条件变化后必须回到第 1 页——
  // 此前在第 3 页输入筛选，命中记录在旧页码上 slice 越界 → 表格空白且无任何提示
  // （实测：第 3 页搜"喷雾器"，API 确认命中 2 单却显示空表 + "共 1 页"）
  useEffect(() => {
    setInboundPage(1);
  }, [inboundSearchCode, inboundSearchSupplier, inboundSearchStatus, inboundSearchMaterialName, inboundSearchMaterialCode]);

  // 页码越界兜底（删除记录/筛选后总页数减少时）
  useEffect(() => {
    if (totalPages > 0 && inboundPage > totalPages) setInboundPage(totalPages);
  }, [inboundPage, totalPages]);

  // 选中的记录列表
  const selectedRecords = useMemo(() => {
    return inboundRecords.filter(r => selectedRows.includes(r.id));
  }, [inboundRecords, selectedRows]);

  // 是否全选
  const isAllSelected = useMemo(() => {
    // 2026-08-10 修复：删除模式不再限定 pending，取消过滤以保证"全选"逻辑与行复选框一致。
    // 2026-09-28 审计修复：改为"当前页是否都已勾选"的集合判定——
    // 此前用长度相等判定，跨页全选（第1页10条+第2页10条 → selectedRows=20≠10）会误判为未全选，
    // 再点一次还会把前一页的选择静默清空。
    return displayedRecords.length > 0 && displayedRecords.every(r => selectedRows.includes(r.id));
  }, [displayedRecords, selectedRows]);

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

  // 编码生成（按现有物料编码 max+1 生成下一个，避免随机重码）
  const handleGenerateCode = useCallback(() => {
    // 从仓库物料主数据 Store 取已用编码列表
    const existingCodes = (warehouseMaterials ?? []).map((m) => m.code).filter((c): c is string => typeof c === 'string' && c.length > 0);
    // 2026-09-28 审计修复：主数据未加载时按空列表生成会产出已存在的编码
    // （实测：直开本页生成 SP0103001，而库中 SP0103001 早已存在 → 重码）。
    // 宁可报错也不给出错误编码。
    if (existingCodes.length === 0) {
      setCodeGenError('物料主数据未加载完成，暂不能生成编码（避免重码），请稍后重试');
      setCodeGenSuccess('');
      return;
    }
    handleCodeGen(codeGen, setCodeGen, setCodeGenError, setCodeGenSuccess, existingCodes);
  }, [codeGen, warehouseMaterials]);

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
    utilSelectAll(displayedRecords, selectedRows, deleteMode, setSelectedRows);
  }, [displayedRecords, selectedRows, deleteMode]);

  // 选择/取消单行
  const onSelectRow = useCallback((id: number) => {
    utilSelectRow(id, selectedRows, setSelectedRows);
  }, [selectedRows]);

  // 取消选择模式
  const onCancelSelection = useCallback(() => {
    handleCancelSelection(setDeleteMode, setExportMode, setSelectedRows);
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
      // 调用 Store 删除每条记录（2026-09-27 fail-loud：逐条检查结果，
      // 后端拒绝"已完成"单时把原因告知用户，此前静默失败导致"点了没反应"）
      const failedCodes: string[] = [];
      for (const record of selectedInboundRecords) {
        const ok = await storeDeleteItem(record.id);
        if (!ok) failedCodes.push(record.code || `#${record.id}`);
      }
      if (failedCodes.length > 0) {
        const reason = useInboundStore.getState().error || '未知原因';
        await showAlert(`以下入库单删除失败：${failedCodes.join('、')}\n原因：${reason}`);
      }
      // 刷新数据
      loadItems();
    }
    setShowInboundDeleteModal(false);
    setSelectedInboundRecords([]);
  }, [selectedInboundRecords, storeDeleteItem, loadItems]);

  /** 打开冲销弹窗（已完成单：原单保留，红字冲销，冲销量=实际可冲回量） */
  const onRequestReversal = useCallback((record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowReversalModal(true);
  }, []);

  /** 冲销成功：刷新列表 */
  const onReversalSuccess = useCallback(() => {
    loadItems();
  }, [loadItems]);

  // 保存编辑（含"已完成单作废"：后端回收库存后状态转 voided）
  const onSaveInboundEdit = useCallback(async (record: InboundRecord) => {
    const result = await storeUpdateItem(record.id, record);
    if (!result) {
      const reason = useInboundStore.getState().error || '未知原因';
      await showAlert(`保存失败：${reason}`);
      return;
    }
    await loadItems();
    setShowInboundEditModal(false);
    setSelectedInboundRecord(null);
  }, [storeUpdateItem, loadItems]);


  // 添加记录
  const onAddRecord = useCallback(() => {
    setShowInboundAddModal(true);
  }, []);

  // 生成入库单号
  const onGenerateOrderCode = useCallback(() => {
    return generateSequentialOrderCode(inboundRecords);
  }, [inboundRecords]);

  // 保存新记录
  // 2026-09-28 审计修复：必须检查创建结果——此前 try/catch 形同虚设（store 内部吞错不抛），
  // 无论成败都关弹窗 + CreateModal 清空表单 → 用户以为已提交，实际什么都没保存。
  const onSaveNewInbound = useCallback(async (record: Omit<InboundRecord, 'id'>) => {
    const created = await storeAddItem(record as any);
    if (!created) {
      const reason = useInboundStore.getState().error || '未知原因';
      await showAlert(`保存失败：${reason}`);
      return false; // 保留弹窗与已填内容，用户修正后可直接重试
    }
    await loadItems();
    setShowInboundAddModal(false);
    return true;
  }, [storeAddItem, loadItems]);


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
    inboundError,
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
    // 2026-09-27 冲销
    showReversalModal,
    setShowReversalModal,
    onRequestReversal,
    onReversalSuccess,

    // 数据相关
    inboundRecords,
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
    onAddRecord,
    onGenerateOrderCode,
    onSaveNewInbound,
    onConfirmDelete,

    // 配置常量
    categoryConfig,
    bigCategoriesList,
  };
}
