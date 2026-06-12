/**
 * 生产计划页面 Hook — 主入口
 * C5 阶段 2 拆分：原 1195 行单文件 → 7 个职责单一子文件 + 本主入口
 *
 * 拆分后子文件：
 * - types.ts                        类型定义（ProductionFormData、EditedBatch、UseProductionPageReturn）
 * - initialFormData.ts              表单默认值
 * - useProductionForm.ts            表单状态变更 + 验证 + 编码生成
 * - useProductionFilters.ts         5 搜索 + 2 筛选 + 300ms debounce + filteredBatches
 * - useProductionActions.ts         保存草稿/提交审批/编辑/删除/批量/作废 8 个业务方法
 * - useProductionSelection.ts       单行/全选/批量选择 + 下一行
 * - useProductionExport.ts          Excel/CSV/Word 导出
 *
 * 本文件职责：useState ownership + 数据加载 effect + 组装子 hook + 关闭/分页 + 统一返回
 */
import { useState, useEffect, useCallback } from 'react';
import {
  useGreenhouseStore,
  useProductionPlanStore,
  useOrderDataStore,
  useAuthStore,
} from '../../../stores';
import type { CropBatch } from '../../../types';
import { getInitialFormData } from './initialFormData';
import { useProductionForm } from './useProductionForm';
import { useProductionFilters } from './useProductionFilters';
import { useProductionActions } from './useProductionActions';
import { useProductionSelection } from './useProductionSelection';
import { useProductionExport } from './useProductionExport';
import type { ProductionFormData, EditedBatch } from './types';

export type { ProductionFormData, EditedBatch, UseProductionPageReturn } from './types';
export { getInitialFormData } from './initialFormData';

export function useProductionPage() {
  // ==================== Store ====================
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);
  const {
    batches,
    fetchPlans,
    addPlan,
    updatePlan,
    deletePlan,
    deletePlans,
  } = useProductionPlanStore();
  const orders = useOrderDataStore((s) => s.orders);
  const fetchOrders = useOrderDataStore((s) => s.fetchOrders);

  // M-02: 从 useAuthStore 获取当前登录用户；若未登录则空字符串
  const currentUsername = useAuthStore((s) => s.currentUser?.username || '');
  const currentUserId = useAuthStore((s) => s.currentUser?.oid || '');
  const currentDepartment = useAuthStore((s) => s.currentUser?.orgOid || '');

  // ==================== 数据加载 ====================
  useEffect(() => {
    if (greenhouses.length === 0) {
      loadGreenhouses();
    }
  }, [greenhouses.length, loadGreenhouses]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (orders.length === 0) {
      fetchOrders();
    }
  }, [orders.length, fetchOrders]);

  useEffect(() => {
    // H-05: 标签页回到前台时，只对高变更态（in_progress）触发拉取；其它状态本地内存已最新
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        batches.some((b) => b.batchStatus === 'in_progress')
      ) {
        fetchPlans();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchPlans, batches]);

  // ==================== 状态定义（25+ useState）====================
  const [statusFilter, setStatusFilter] = useState('all');
  const [planTypeFilter, setPlanTypeFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<CropBatch | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState<ProductionFormData>(getInitialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [selectedBatchCode, setSelectedBatchCode] = useState('');
  const [editedBatchCodes, setEditedBatchCodes] = useState<string[]>([]);
  const [editedBatches, setEditedBatches] = useState<Record<string, EditedBatch>>({});
  const [showVoidWarning, setShowVoidWarning] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // 搜索状态
  const [batchCodeSearch, setBatchCodeSearch] = useState('');
  const [plantingModeSearch, setPlantingModeSearch] = useState('');
  const [cropNameSearch, setCropNameSearch] = useState('');
  const [varietySearch, setVarietySearch] = useState('');
  const [greenhouseSearch, setGreenhouseSearch] = useState('');

  // ==================== 表单默认值初始化 ====================
  useEffect(() => {
    if (showCreateModal) {
      const activeGreenhouses = greenhouses.filter((g) => g.status === 'active');
      const firstGreenhouseId = activeGreenhouses[0]?.id ? [activeGreenhouses[0].id] : [];
      const defaultMode = ['open_field'];
      const firstResponsiblePerson = currentUsername;

      setFormData((prev) => ({
        ...prev,
        greenhouseId: firstGreenhouseId,
        plantingMode: defaultMode,
        responsiblePerson: firstResponsiblePerson,
        // 2026-06-12 修复: 同步发布人 — useState lazy initializer 只在首次渲染跑一次,
        // 首次渲染时 auth 可能未就绪导致 publisher 被冻结成空字符串,
        // 这里在弹窗打开时(且 publisher 仍为空)兜底同步为当前用户名
        publisher: prev.publisher || currentUsername,
      }));
    }
  }, [showCreateModal, greenhouses, currentUsername]);

  // ==================== 子 hook 装配 ====================
  const { handleFormChange, validateForm, resetForm, generateBatchCode } = useProductionForm({
    formData,
    setFormData,
    setErrors,
  });

  const { filteredBatches, resetFilters } = useProductionFilters({
    batches,
    statusFilter,
    planTypeFilter,
    batchCodeSearch,
    plantingModeSearch,
    cropNameSearch,
    varietySearch,
    greenhouseSearch,
    setBatchCodeSearch,
    setPlantingModeSearch,
    setCropNameSearch,
    setVarietySearch,
    setGreenhouseSearch,
    setStatusFilter,
    setPlanTypeFilter,
  });

  const {
    handleSaveDraft,
    handleSubmitForApproval,
    handleSingleEdit,
    handleSingleDelete,
    handleDeleteConfirm,
    handlePublish,
    handleSave,
    handleVoidConfirm,
  } = useProductionActions({
    formData,
    batches,
    selectedRows,
    selectedBatchCode,
    editedBatches,
    editedBatchCodes,
    greenhouses: greenhouses as { id: string; name: string; status?: string }[],
    currentUserId,
    currentUsername,
    currentDepartment,
    addPlan,
    updatePlan,
    deletePlan,
    deletePlans,
    fetchPlans,
    validateForm,
    resetForm,
    setShowCreateModal,
    setErrors,
    setSelectedBatchCode,
    setSelectedRows,
    setShowBatchEditModal,
    setShowDeleteWarning,
    setBatchDeleteMode,
    setEditedBatches,
    setEditedBatchCodes,
  });

  const {
    handleSelectRow,
    handleSelectAll,
    handleBatchSelectAll,
    handleBatchDeleteSelectAll,
    handleConfirmNext,
  } = useProductionSelection({
    batches,
    filteredBatches,
    selectedRows,
    selectedBatchCode,
    editedBatchCodes,
    setSelectedRows,
    setSelectedBatchCode,
    setEditedBatchCodes,
  });

  const { handleExportClick, handleConfirmExport, handleDoExport, handleCancelExport } =
    useProductionExport({
      batches,
      selectedRows,
      exportFormat,
      setExportMode,
      setSelectedRows,
      setShowExportModal,
    });

  // ==================== 关闭 ====================
  const handleClose = useCallback(() => {
    setShowCreateModal(false);
    resetForm();
    setErrors({});
  }, [resetForm, setShowCreateModal, setErrors]);

  // ==================== 分页 ====================
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    // 状态
    statusFilter,
    planTypeFilter,
    selectedBatch,
    showCreateModal,
    currentPage,
    pageSize,
    formData,
    errors,
    exportMode,
    selectedRows,
    exportFormat,
    showExportModal,
    batchEditMode,
    showBatchEditModal,
    selectedBatchCode,
    editedBatchCodes,
    editedBatches,
    showVoidWarning,
    batchDeleteMode,
    showDeleteWarning,
    batches,
    filteredBatches,
    greenhouses,
    orders,
    batchesLength: batches.length,

    // 搜索状态
    batchCodeSearch,
    plantingModeSearch,
    cropNameSearch,
    varietySearch,
    greenhouseSearch,

    // 设置方法
    setStatusFilter,
    setPlanTypeFilter,
    setSelectedBatch,
    setShowCreateModal,
    setCurrentPage,
    setPageSize,
    setFormData,
    setErrors,
    setExportMode,
    setSelectedRows,
    setExportFormat,
    setShowExportModal,
    setBatchEditMode,
    setShowBatchEditModal,
    setSelectedBatchCode,
    setEditedBatchCodes,
    setEditedBatches,
    setShowVoidWarning,
    setBatchDeleteMode,
    setShowDeleteWarning,

    // 搜索
    setBatchCodeSearch,
    setPlantingModeSearch,
    setCropNameSearch,
    setVarietySearch,
    setGreenhouseSearch,
    resetFilters,

    // 表单
    handleFormChange,
    validateForm,
    resetForm,
    generateBatchCode,

    // 操作
    handleSaveDraft,
    handleSubmitForApproval,
    handleSingleEdit,
    handleSingleDelete,
    handleDeleteConfirm,
    handlePublish,
    handleSave,
    handleVoidConfirm,

    // 选择
    handleSelectRow,
    handleSelectAll,
    handleBatchSelectAll,
    handleBatchDeleteSelectAll,
    handleConfirmNext,

    // 导出
    handleExportClick,
    handleConfirmExport,
    handleDoExport,
    handleCancelExport,

    // 关闭
    handleClose,

    // 分页
    handlePageSizeChange,
  };
}
