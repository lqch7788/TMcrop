/**
 * 生产计划页面 Hook
 * 将 ProductionPage 的所有状态和逻辑提取为独立 hook，便于维护和测试
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGreenhouseStore, useProductionPlanStore, useOrderDataStore, useAuthStore } from '../../../stores';
import { CropBatch, PlanType } from '../../../types';
import { useApproval } from '../../../hooks/useApproval';
import { apiClient, USE_API } from '../../../services/apiClient';
import { showAlert, showConfirm } from '../../../lib/dialogService';
import * as apiProductionPlanService from '../../../services/apiProductionPlanService';
import { batchStatusLabels } from '../constants';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { todayLocal } from '../../../lib/dateUtils';

// 表单数据类型
export interface ProductionFormData {
  batchCode: string;
  planType: PlanType;
  planTypeName: string;
  cropCode: string;
  cropName: string;
  variety: string;
  greenhouseId: string[];
  plantingArea: string;
  plantingAreaUnit: string;
  startDate: string;
  expectedHarvestDate: string;
  targetYield: string;
  unit: string;
  plantingMode: string[];
  responsiblePerson: string;
  publisher: string;
  description: string;
  planDetail: string;
  // 关联订单字段
  orderId: string[];
  orderCode: string[];
}

// 表单默认值
const getInitialFormData = (): ProductionFormData => {
  // M-02: 从 useAuthStore 获取当前登录用户；若未登录则空字符串（不硬编码 fallback 用户名）
  const initialUsername = useAuthStore.getState().currentUser?.username || '';
  return {
  batchCode: '',
  planType: PlanType.PLANTING as PlanType,
  planTypeName: '种植计划',
  cropCode: '',
  cropName: '',
  variety: '',
  greenhouseId: [],
  plantingArea: '',
  plantingAreaUnit: 'm²',
  startDate: '',
  expectedHarvestDate: '',
  targetYield: '',
  unit: 'kg',
  plantingMode: [],
  responsiblePerson: '',
  publisher: initialUsername,
  description: '',
  planDetail: '',
  // 关联订单字段
  orderId: [],
  orderCode: []
  };
};

// 编辑中的批次数据
export interface EditedBatch {
  targetQuantity?: number;
  targetYield?: number;
  cropName?: string;
  cropCode?: string;          // 2026-06-05: 作物品种编码（弹窗回显用）
  variety?: string;
  greenhouseName?: string;
  greenhouseId?: string;
  plantingArea?: number;
  plantingMode?: string;
  startDate?: string;
  expectedHarvestDate?: string;
  responsiblePerson?: string;
  remarks?: string;
  planDetail?: string;
  planDetailFileName?: string;
  isCompleted?: boolean;
}

// 返回类型
export interface UseProductionPageReturn {
  // 状态
  statusFilter: string;
  planTypeFilter: string;
  selectedBatch: CropBatch | null;
  showCreateModal: boolean;
  currentPage: number;
  pageSize: number;
  formData: ProductionFormData;
  errors: Record<string, string>;
  exportMode: boolean;
  selectedRows: string[];
  exportFormat: string;
  showExportModal: boolean;
  batchEditMode: boolean;
  showBatchEditModal: boolean;
  selectedBatchCode: string;
  editedBatchCodes: string[];
  editedBatches: Record<string, EditedBatch>;
  showVoidWarning: boolean;
  batchDeleteMode: boolean;
  showDeleteWarning: boolean;
  batches: CropBatch[];
  filteredBatches: CropBatch[];
  greenhouses: ReturnType<typeof useGreenhouseStore>['greenhouses'];
  orders: ReturnType<typeof useOrderDataStore>['orders'];
  batchesLength: number;

  // 搜索状态
  batchCodeSearch: string;
  plantingModeSearch: string;
  cropNameSearch: string;
  varietySearch: string;
  greenhouseSearch: string;

  // 操作方法
  setStatusFilter: (v: string) => void;
  setPlanTypeFilter: (v: string) => void;
  setSelectedBatch: (v: CropBatch | null) => void;
  setShowCreateModal: (v: boolean) => void;
  setCurrentPage: (v: number) => void;
  setPageSize: (v: number) => void;
  setFormData: React.Dispatch<React.SetStateAction<ProductionFormData>>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setExportMode: (v: boolean) => void;
  setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>;
  setExportFormat: (v: string) => void;
  setShowExportModal: (v: boolean) => void;
  setBatchEditMode: (v: boolean) => void;
  setShowBatchEditModal: (v: boolean) => void;
  setSelectedBatchCode: (v: string) => void;
  setEditedBatchCodes: React.Dispatch<React.SetStateAction<string[]>>;
  setEditedBatches: React.Dispatch<React.SetStateAction<Record<string, EditedBatch>>>;
  setShowVoidWarning: (v: boolean) => void;
  setBatchDeleteMode: (v: boolean) => void;
  setShowDeleteWarning: (v: boolean) => void;

  // 搜索
  setBatchCodeSearch: (v: string) => void;
  setPlantingModeSearch: (v: string) => void;
  setCropNameSearch: (v: string) => void;
  setVarietySearch: (v: string) => void;
  setGreenhouseSearch: (v: string) => void;
  resetFilters: () => void;

  // 表单
  handleFormChange: (field: string, value: unknown) => void;
  validateForm: () => boolean;
  resetForm: () => void;
  generateBatchCode: () => Promise<void>;

  // 操作
  handleSaveDraft: () => Promise<void>;
  handleSubmitForApproval: () => Promise<void>;
  handleSingleEdit: (batch: CropBatch) => void;
  handleSingleDelete: (batch: CropBatch) => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
  handlePublish: () => Promise<void>;
  handleVoidConfirm: () => Promise<void>;

  // 选择
  handleSelectRow: (id: string) => void;
  handleSelectAll: () => void;
  handleBatchSelectAll: () => void;
  handleBatchDeleteSelectAll: () => void;
  handleConfirmNext: () => void;

  // 导出
  handleExportClick: () => void;
  handleConfirmExport: () => void;
  handleDoExport: () => Promise<void>;
  handleCancelExport: () => void;

  // 关闭
  handleClose: () => void;

  // 分页
  handlePageSizeChange: (size: number) => void;
}

export function useProductionPage(): UseProductionPageReturn {
  // ==================== Store ====================
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);
  const { refreshApprovals } = useApproval();
  const {
    batches,
    fetchPlans,
    addPlan,
    updatePlan,
    deletePlan,
    deletePlans,
  } = useProductionPlanStore();
  // 订单数据（用于关联）
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

  // 加载订单数据（用于关联选择）
  useEffect(() => {
    if (orders.length === 0) {
      fetchOrders();
    }
  }, [orders.length, fetchOrders]);

  useEffect(() => {
    // H-05: 标签页回到前台时，只对高变更态（in_progress）触发拉取；其它状态本地内存已最新
    // 避免每次切回都全量 refetch 浪费流量
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && batches.some(b => b.batchStatus === 'in_progress')) {
        fetchPlans();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchPlans, batches]);

  // ==================== 状态定义 ====================
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
      const activeGreenhouses = greenhouses.filter(g => g.status === 'active');
      const firstGreenhouseId = activeGreenhouses[0]?.id ? [activeGreenhouses[0].id] : [];
      const defaultMode = ['open_field'];
      const firstResponsiblePerson = currentUsername;

      setFormData(prev => ({
        ...prev,
        greenhouseId: firstGreenhouseId,
        plantingMode: defaultMode,
        responsiblePerson: firstResponsiblePerson,
      }));
    }
  }, [showCreateModal, greenhouses]);

  // ==================== 过滤逻辑 ====================
  // H-04: 300ms debounce 全表 filter，避免每次按键都重算（百行 + 搜索输入场景卡顿）
  const [debouncedBatchCodeSearch, setDebouncedBatchCodeSearch] = useState(batchCodeSearch);
  const [debouncedPlantingModeSearch, setDebouncedPlantingModeSearch] = useState(plantingModeSearch);
  const [debouncedCropNameSearch, setDebouncedCropNameSearch] = useState(cropNameSearch);
  const [debouncedVarietySearch, setDebouncedVarietySearch] = useState(varietySearch);
  const [debouncedGreenhouseSearch, setDebouncedGreenhouseSearch] = useState(greenhouseSearch);

  useEffect(() => {
    const t1 = setTimeout(() => setDebouncedBatchCodeSearch(batchCodeSearch), 300);
    const t2 = setTimeout(() => setDebouncedPlantingModeSearch(plantingModeSearch), 300);
    const t3 = setTimeout(() => setDebouncedCropNameSearch(cropNameSearch), 300);
    const t4 = setTimeout(() => setDebouncedVarietySearch(varietySearch), 300);
    const t5 = setTimeout(() => setDebouncedGreenhouseSearch(greenhouseSearch), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [batchCodeSearch, plantingModeSearch, cropNameSearch, varietySearch, greenhouseSearch]);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchBatchCode = !debouncedBatchCodeSearch || batch.batchCode.toLowerCase().includes(debouncedBatchCodeSearch.toLowerCase());
      const matchPlantingMode = !debouncedPlantingModeSearch || batch.plantingMode.toLowerCase().includes(debouncedPlantingModeSearch.toLowerCase());
      const matchCropName = !debouncedCropNameSearch || batch.cropName.toLowerCase().includes(debouncedCropNameSearch.toLowerCase());
      const matchVariety = !debouncedVarietySearch || batch.variety.toLowerCase().includes(debouncedVarietySearch.toLowerCase());
      const matchGreenhouse = !debouncedGreenhouseSearch || batch.greenhouseName.toLowerCase().includes(debouncedGreenhouseSearch.toLowerCase());
      const matchStatus = statusFilter === 'all' || batch.batchStatus === statusFilter;
      const matchPlanType = planTypeFilter === 'all' || batch.planType === planTypeFilter;
      return matchBatchCode && matchPlantingMode && matchCropName && matchVariety && matchGreenhouse && matchStatus && matchPlanType;
    });
  }, [batches, debouncedBatchCodeSearch, debouncedPlantingModeSearch, debouncedCropNameSearch, debouncedVarietySearch, debouncedGreenhouseSearch, statusFilter, planTypeFilter]);

  // ==================== 工具函数 ====================
  const handleFormChange = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.batchCode.trim()) newErrors.batchCode = '请输入批次编号';
    if (!formData.cropName) newErrors.cropName = '请选择作物';
    if (!formData.variety.trim()) newErrors.variety = '请输入品种';
    if (formData.greenhouseId.length === 0) newErrors.greenhouseId = '请选择区域';
    if (!formData.startDate) newErrors.startDate = '请选择定植日期';
    if (!formData.expectedHarvestDate) newErrors.expectedHarvestDate = '请选择预计采收日期';
    if (!formData.targetYield) newErrors.targetYield = '请输入目标产量';
    if (formData.plantingMode.length === 0) newErrors.plantingMode = '请选择种植模式';
    if (!formData.responsiblePerson) newErrors.responsiblePerson = '请选择负责人';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
  }, []);

  const resetFilters = useCallback(() => {
    setBatchCodeSearch('');
    setPlantingModeSearch('');
    setCropNameSearch('');
    setVarietySearch('');
    setGreenhouseSearch('');
    setStatusFilter('all');
    setPlanTypeFilter('all');
  }, []);

  // H-03: 改用后端 service 生成编码（之前 batches.length+1 会导致编号重复）
  const generateBatchCode = useCallback(async () => {
    try {
      const code = await apiProductionPlanService.generateProductionPlanCode(formData.planType as string);
      if (code) {
        setFormData(prev => ({ ...prev, batchCode: code }));
      }
    } catch (error) {
      console.error('[ProductionPlan] 生成批次编号失败:', error);
      await showAlert('生成批次编号失败，请重试');
    }
  }, [formData.planType]);

  // ==================== 保存草稿 ====================
  const handleSaveDraft = useCallback(async () => {
    if (!validateForm()) return;

    const today = todayLocal();
    const greenhouseIds = formData.greenhouseId.join(',');
    // 调试：检查温室ID匹配
    const greenhouseNames = greenhouses
      .filter(g => formData.greenhouseId.includes(g.id))
      .map(g => g.name).join(',') || greenhouseIds;
    const plantingModes = formData.plantingMode.join(',');

    const apiData = {
      id: `PP${Date.now()}`,
      batchCode: formData.batchCode,
      batchName: formData.batchCode,
      planType: formData.planType,
      cropName: formData.cropName,
      cropCode: formData.cropCode,  // 2026-06-05: 写入 cropCode
      variety: formData.variety,
      greenhouseId: greenhouseIds,
      greenhouseName: greenhouseNames,
      areaName: greenhouseNames,
      areaId: '',
      targetQuantity: parseInt(formData.targetYield) || 0,
      targetYield: parseInt(formData.targetYield) || 0,
      actualYield: 0,
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      actualHarvestDate: '',
      // P0-04: 统一只用 batch_status 列；status 列由后端默认 'planning'，前端不再写入
      stage: 'seedling',
      stageName: '苗期',
      priority: 'normal',
      remarks: formData.description || '',
      publisher: formData.publisher || currentUsername,
      createBy: formData.publisher || currentUsername,
      responsiblePerson: formData.responsiblePerson,
      unit: formData.unit || 'kg',
      publishDate: '',
      batchStatus: 'draft',
      planDetail: formData.planDetail || '',
      planDetailFileName: '',
      plantingArea: parseFloat(formData.plantingArea) || 0,
      plantingAreaUnit: formData.plantingAreaUnit || 'm²',
      plantingMode: plantingModes,
      supplierName: '',
      seedlingSiteName: '',
      seedQuantity: 0,
      targetSeedlingCount: 0,
      // 关联订单
      orderId: formData.orderId.join(',') || undefined,
      orderCode: formData.orderCode.join(',') || undefined,
    };

    try {
      if (USE_API) {
        await addPlan(apiData as any);
      }
      setShowCreateModal(false);
      resetForm();
      setErrors({});
    } catch (error) {
      console.error('[ProductionPlan] 保存草稿失败:', error);
      await showAlert('保存草稿失败，请重试');
    }
  }, [formData, greenhouses, validateForm, addPlan, resetForm]);

  // ==================== 提交审批 ====================
  const handleSubmitForApproval = useCallback(async () => {
    if (!validateForm()) return;

    const today = todayLocal();
    const greenhouseIds = formData.greenhouseId.join(',');
    // 调试：检查温室ID匹配
    const greenhouseNames = greenhouses
      .filter(g => formData.greenhouseId.includes(g.id))
      .map(g => g.name).join(',') || greenhouseIds;
    const plantingModes = formData.plantingMode.join(',');

    const apiData = {
      id: `PP${Date.now()}`,
      batchCode: formData.batchCode,
      batchName: formData.batchCode,
      planType: formData.planType,
      cropName: formData.cropName,
      cropCode: formData.cropCode,  // 2026-06-05: 写入 cropCode
      variety: formData.variety,
      greenhouseName: greenhouseNames,
      areaName: greenhouseNames,
      targetQuantity: parseInt(formData.targetYield) || 0,
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      // P0-04: 统一只用 batch_status 列；status 列由后端默认 'planning'，前端不再写入
      priority: 'normal',
      remarks: formData.description || '',
      publisher: formData.publisher || currentUsername,
      createBy: formData.publisher || currentUsername,
      responsiblePerson: formData.responsiblePerson,
      unit: formData.unit || 'kg',
      publishDate: today,
      batchStatus: 'pending',
      planDetail: formData.planDetail || '',
      planDetailFileName: '',
      plantingArea: parseFloat(formData.plantingArea) || 0,
      plantingAreaUnit: formData.plantingAreaUnit || 'm²',
      plantingMode: plantingModes,
      supplierName: '',
      seedlingSiteName: '',
      seedQuantity: 0,
      targetSeedlingCount: 0,
      orderId: formData.orderId.join(',') || '',
      orderCode: formData.orderCode.join(',') || '',
    };

    try {
      if (USE_API) {
        const addResult = await addPlan(apiData as any);
        await fetchPlans(); // 刷新生产计划列表

        const approvalData = {
          id: `AP${Date.now()}`,
          type: 'production_plan',
          typeName: '生产计划',
          title: `生产计划审批：${formData.batchCode}`,
          description: `作物：${formData.cropName} ${formData.variety}\n种植区域：${greenhouseNames || greenhouseIds}\n目标产量：${formData.targetYield}kg`,
          applicantId: currentUserId,
          applicantName: formData.publisher || currentUsername,
          applicantDepartment: currentDepartment,
          applyDate: today,
          status: 'pending',
          priority: 'normal',
          businessLink: {
            type: 'production',
            requestId: apiData.id,
            requestCode: apiData.batchCode,
            cropName: formData.cropName,
            variety: formData.variety,
            greenhouseName: greenhouseNames || greenhouseIds,
            startDate: formData.startDate,
            expectedHarvestDate: formData.expectedHarvestDate,
            responsiblePerson: formData.responsiblePerson,
            targetYield: parseInt(formData.targetYield) || 0,
            plantingArea: parseFloat(formData.plantingArea) || 0,
            plantingMode: formData.plantingMode.join(','),
          },
        };
        await apiClient.post('/approvals', approvalData);
        await refreshApprovals();
      }

      setShowCreateModal(false);
      resetForm();
      setErrors({});
    } catch (error) {
      await showAlert('提交审批失败，请重试');
    }
  }, [formData, greenhouses, validateForm, addPlan, resetForm, refreshApprovals, fetchPlans]);

  // ==================== 单条编辑 ====================
  const handleSingleEdit = useCallback((batch: CropBatch) => {
    if (batch.batchStatus === 'completed' || batch.batchStatus === 'cancelled') {
      showAlert('该生产计划已归档，无法编辑');
      return;
    }
    setSelectedBatchCode(batch.batchCode);
    setSelectedRows([batch.id]);
    setShowBatchEditModal(true);
  }, []);

  // ==================== 单条删除 ====================
  const handleSingleDelete = useCallback(async (batch: CropBatch) => {
    try {
      if (USE_API) {
        await deletePlan(batch.id);
      }
      await showAlert('删除成功');
    } catch (error) {
      console.error('[ProductionPlan] 删除生产计划失败:', error);
      await showAlert('删除失败，请重试');
    }
  }, [deletePlan]);

  // ==================== 批量删除确认 ====================
  // M-04: 成功后才清 batchDeleteMode（之前先关弹窗再 await，成功后未再次清理导致 UI 残留）
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteWarning(false);
    const toDelete = selectedRows;

    if (toDelete.length === 0) {
      setSelectedRows([]);
      setBatchDeleteMode(false);
      return;
    }

    try {
      if (USE_API) {
        await deletePlans(toDelete);
      }
      setSelectedRows([]);
      setBatchDeleteMode(false); // M-04: 成功后才关闭批量删除模式
      await showAlert('删除成功');
    } catch (error) {
      console.error('[ProductionPlan] 删除生产计划失败:', error);
      await showAlert('删除失败，请重试');
      setBatchDeleteMode(false);
      setSelectedRows([]);
    }
  }, [selectedRows, deletePlans]);

  // ==================== 提交编辑审批 ====================
  const handlePublish = useCallback(async () => {
    const hasCompleteRequest = Object.values(editedBatches).some(
      edited => edited.isCompleted === true
    );

    if (hasCompleteRequest) {
      const confirmed = await showConfirm(
        '⚠️ 重要提示：\n\n' +
        '您选择将计划标记为完成状态。\n\n' +
        '完成后将进行归档：\n' +
        '• 无法进行任何编辑操作\n' +
        '• 无法删除计划\n\n' +
        '此操作不可逆，请确认！'
      );
      if (!confirmed) {
        return;
      }
    }

    if (Object.keys(editedBatches).length > 0) {
      const submittedBatchIds: string[] = [];
      const failedBatchCodes: string[] = [];

      try {
        // 直接复用 hook 顶部定义的 currentUserId/currentUsername/currentDepartment
        // 避免重复 localStorage 访问
        const currentUserIdValue = currentUserId;
        const currentUserNameValue = currentUsername;
        const currentDepartmentValue = currentDepartment;

        // P0-03: 串行 for+await 改为 Promise.allSettled 并行提交
        // 收集所有已编辑的批次作为独立任务
        const submitTasks = batches
          .map(batch => {
            const edited = editedBatches[batch.batchCode];
            if (!edited) return null;
            return { batch, edited };
          })
          .filter((t): t is { batch: CropBatch; edited: EditedBatch } => t !== null);

        const today = todayLocal();

        // 并行执行所有提交任务；任一失败不影响其他
        const results = await Promise.allSettled(
          submitTasks.map(async ({ batch, edited }) => {
            if (USE_API) {
              const apiData: Record<string, unknown> = {};
              if (edited.targetQuantity !== undefined) apiData.targetQuantity = edited.targetQuantity;
              if (edited.targetYield !== undefined) apiData.targetYield = edited.targetYield;
              if (edited.cropName !== undefined) apiData.cropName = edited.cropName;
              if (edited.cropCode !== undefined) apiData.cropCode = edited.cropCode;  // 2026-06-05
              if (edited.variety !== undefined) apiData.variety = edited.variety;
              if (edited.greenhouseName !== undefined) apiData.greenhouseName = edited.greenhouseName;
              if (edited.greenhouseId !== undefined) apiData.greenhouseId = edited.greenhouseId;
              if (edited.plantingArea !== undefined) apiData.plantingArea = edited.plantingArea;
              if (edited.plantingMode !== undefined) apiData.plantingMode = edited.plantingMode;
              if (edited.startDate !== undefined) apiData.startDate = edited.startDate;
              if (edited.expectedHarvestDate !== undefined) apiData.expectedHarvestDate = edited.expectedHarvestDate;
              if (edited.responsiblePerson !== undefined) apiData.responsiblePerson = edited.responsiblePerson;
              if (edited.remarks !== undefined) apiData.remarks = edited.remarks;
              if (edited.planDetail !== undefined) apiData.planDetail = edited.planDetail;
              if (edited.planDetailFileName !== undefined) apiData.planDetailFileName = edited.planDetailFileName;
              if (edited.executionStatus !== undefined) apiData.executionStatus = edited.executionStatus;

              apiData.batchStatus = edited.isCompleted === true ? 'pending_complete' : 'pending';

              await updatePlan(batch.id, apiData as any);
            }

            const changeId = `BC${Date.now()}_${batch.id}`;
            const changeCode = `BG${today.replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

            const changes: string[] = [];
            if (edited.cropName) changes.push(`作物名称: ${batch.cropName} → ${edited.cropName}`);
            if (edited.variety) changes.push(`品种: ${batch.variety} → ${edited.variety}`);
            if (edited.plantingArea) changes.push(`种植面积: ${batch.plantingArea} → ${edited.plantingArea}`);
            if (edited.startDate) changes.push(`开始时间: ${batch.startDate} → ${edited.startDate}`);
            if (edited.expectedHarvestDate) changes.push(`预计结束: ${batch.expectedHarvestDate} → ${edited.expectedHarvestDate}`);
            if (edited.responsiblePerson) changes.push(`负责人: ${batch.responsiblePerson} → ${edited.responsiblePerson}`);
            if (edited.targetYield) changes.push(`目标产量: ${batch.targetYield} → ${edited.targetYield}`);
            if (edited.isCompleted === true) changes.push(`计划完成: 标记为已完成（归档）`);

            const approvalData = {
              id: changeId,
              type: 'production_plan',
              typeName: '生产计划',
              title: edited.isCompleted === true
                ? `生产计划完成归档审批：${batch.batchCode}`
                : `生产计划编辑审批：${batch.batchCode}`,
              description: changes.join('\n'),
              applicantId: currentUserId,
              applicantName: currentUserName,
              applicantDepartment: currentDepartment,
              applyDate: today,
              status: 'pending',
              priority: 'normal',
              businessLink: {
                type: 'production',
                approvalAction: edited.isCompleted === true ? 'complete' : 'edit',
                requestId: batch.id,
                requestCode: batch.batchCode,
                cropName: edited.cropName || batch.cropName,
                variety: edited.variety || batch.variety,
                greenhouseName: edited.greenhouseName || batch.greenhouseName,
                startDate: edited.startDate || batch.startDate,
                expectedHarvestDate: edited.expectedHarvestDate || batch.expectedHarvestDate,
                responsiblePerson: edited.responsiblePerson || batch.responsiblePerson,
                targetYield: edited.targetYield || batch.targetYield,
                plantingArea: edited.plantingArea || batch.plantingArea,
                plantingMode: edited.plantingMode || batch.plantingMode,
              },
            };

            if (USE_API) {
              await apiClient.post('/approvals', approvalData);
            }

            return batch.id;
          })
        );

        // 收集成功 / 失败
        // 2026-06-10 修复：把每个失败的 r.reason 同步带出到 UI alert
        // （之前只 console.error，用户弹窗里只看到"失败 N 项（批次号）"，
        // 不知道是 400 字段错 / 500 后端 SQL / 网络超时 / 权限哪种，无法自助排查）
        const failedReasons: string[] = [];
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            submittedBatchIds.push(r.value);
          } else {
            const task = submitTasks[idx];
            const reason = r.reason;
            const reasonMsg = reason instanceof Error
              ? reason.message
              : typeof reason === 'string'
                ? reason
                : (() => {
                    try { return JSON.stringify(reason); } catch { return String(reason); }
                  })();
            console.error(`[handlePublish] 批次 ${task.batch.batchCode} 提交失败:`, reason);
            failedBatchCodes.push(task.batch.batchCode);
            failedReasons.push(reasonMsg);
          }
        });

        await refreshApprovals();
      } catch (error) {
        console.error('[ProductionPlan] 提交审批失败:', error);
        await showAlert('提交审批失败，请重试');
        return;
      }

      await fetchPlans();

      const remainingSelectedRows = selectedRows.filter(id => !submittedBatchIds.includes(id));
      setSelectedRows(remainingSelectedRows);

      const remainingEditedBatches: Record<string, EditedBatch> = {};
      const remainingEditedBatchCodes: string[] = [];
      batches.forEach(batch => {
        if (submittedBatchIds.includes(batch.id)) {
          // 已提交
        } else if (editedBatches[batch.batchCode]) {
          remainingEditedBatches[batch.batchCode] = editedBatches[batch.batchCode];
          remainingEditedBatchCodes.push(batch.batchCode);
        }
      });
      setEditedBatches(remainingEditedBatches);
      setEditedBatchCodes(remainingEditedBatchCodes);

      // P0-03: 最终 toast 显示成功 / 失败数
      // 2026-06-10 修复：失败 alert 同时附上每个失败的具体原因（截断避免弹窗过长）
      const successCount = submittedBatchIds.length;
      const failedCount = failedBatchCodes.length;
      if (failedCount > 0) {
        const detailLines = failedBatchCodes
          .map((code, i) => {
            const msg = failedReasons[i] || '未知错误';
            // 单行 120 字符截断（alert 弹窗宽度有限 + 避免长堆栈污染）
            const short = msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
            return `• ${code}: ${short}`;
          })
          .join('\n');
        await showAlert(
          `提交完成：成功 ${successCount} 项，失败 ${failedCount} 项（${failedBatchCodes.slice(0, 3).join('、')}${failedCount > 3 ? ' 等' : ''}）\n\n失败详情：\n${detailLines}`
        );
      }

      if (successCount === selectedRows.length && failedCount === 0) {
        setShowBatchEditModal(false);
        setEditedBatches({});
        setEditedBatchCodes([]);
        setSelectedRows([]);
      } else if (successCount > 0) {
        // 部分成功：保留剩余未提交项，弹窗不关
      } else {
        // 全部失败：保留弹窗让用户重试
      }
    } else {
      await showAlert('请先编辑至少一个生产计划');
    }
  }, [editedBatches, batches, selectedRows, updatePlan, refreshApprovals, fetchPlans]);

  // ==================== 已发布状态直接保存（不提交审批）====================
  const handleSave = useCallback(async () => {
    if (Object.keys(editedBatches).length === 0) {
      await showAlert('请先编辑至少一个生产计划');
      return;
    }

    const savedBatchCodes: string[] = [];

    try {
      for (const batch of batches) {
        const edited = editedBatches[batch.batchCode];
        if (edited) {
          if (USE_API) {
            const apiData: Record<string, unknown> = {};
            if (edited.targetQuantity !== undefined) apiData.targetQuantity = edited.targetQuantity;
            if (edited.targetYield !== undefined) apiData.targetYield = edited.targetYield;
            if (edited.cropName !== undefined) apiData.cropName = edited.cropName;
            if (edited.cropCode !== undefined) apiData.cropCode = edited.cropCode;  // 2026-06-05
            if (edited.variety !== undefined) apiData.variety = edited.variety;
            if (edited.greenhouseName !== undefined) apiData.greenhouseName = edited.greenhouseName;
            if (edited.greenhouseId !== undefined) apiData.greenhouseId = edited.greenhouseId;
            if (edited.plantingArea !== undefined) apiData.plantingArea = edited.plantingArea;
            if (edited.plantingMode !== undefined) apiData.plantingMode = edited.plantingMode;
            if (edited.startDate !== undefined) apiData.startDate = edited.startDate;
            if (edited.expectedHarvestDate !== undefined) apiData.expectedHarvestDate = edited.expectedHarvestDate;
            if (edited.responsiblePerson !== undefined) apiData.responsiblePerson = edited.responsiblePerson;
            if (edited.remarks !== undefined) apiData.remarks = edited.remarks;
            if (edited.planDetail !== undefined) apiData.planDetail = edited.planDetail;
            if (edited.planDetailFileName !== undefined) apiData.planDetailFileName = edited.planDetailFileName;
            if (edited.executionStatus !== undefined) apiData.executionStatus = edited.executionStatus;

            // 不改变 batchStatus，只保存编辑内容
            await updatePlan(batch.id, apiData as any);
          }
          savedBatchCodes.push(batch.batchCode);
        }
      }

      await showAlert('保存成功！');
    } catch (error) {
      await showAlert('保存失败，请重试');
      return;
    }

    await fetchPlans();

    const remainingSelectedRows = selectedRows.filter(id => !savedBatchCodes.includes(id));
    setSelectedRows(remainingSelectedRows);

    const remainingEditedBatches: Record<string, EditedBatch> = {};
    const remainingEditedBatchCodes: string[] = [];
    batches.forEach(batch => {
      if (savedBatchCodes.includes(batch.batchCode)) {
        // 已保存
      } else if (editedBatches[batch.batchCode]) {
        remainingEditedBatches[batch.batchCode] = editedBatches[batch.batchCode];
        remainingEditedBatchCodes.push(batch.batchCode);
      }
    });
    setEditedBatches(remainingEditedBatches);
    setEditedBatchCodes(remainingEditedBatchCodes);

    if (savedBatchCodes.length === selectedRows.length) {
      setShowBatchEditModal(false);
      setEditedBatches({});
      setEditedBatchCodes([]);
      setSelectedRows([]);
    } else {
      await showAlert(`已保存 ${savedBatchCodes.length} 项`);
    }
  }, [editedBatches, batches, selectedRows, updatePlan, fetchPlans]);

  // ==================== 申请作废 ====================
  const handleVoidConfirm = useCallback(async () => {
    // 复用 hook 顶部定义的 currentUserId/currentUsername/currentDepartment
    const today = todayLocal();

    const currentBatch = batches.find(b => b.batchCode === selectedBatchCode);
    if (!currentBatch) {
      await showAlert('请先选择一个生产计划');
      return;
    }

    // P0-05: 先确认（避免误点）+ 不再先 updatePlan('pending') 写脏数据
    // 原流程会先把状态切到 pending 再提交审批，若用户取消则留下脏数据
    // 新流程：只提交审批单，状态切换由审批通过后回调处理
    const confirmed = await showConfirm(
      `确认作废生产计划：${currentBatch.batchCode}？\n\n` +
      `作物：${currentBatch.cropName} ${currentBatch.variety}\n` +
      `区域：${currentBatch.greenhouseName}\n\n` +
      `此操作不可逆，请确认！`
    );
    if (!confirmed) {
      return;
    }

    const voidedBatchIds: string[] = [];

    try {
      const voidId = `BV${Date.now()}_${currentBatch.id}`;
      const voidCode = `BV${today.replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const approvalData = {
        id: voidId,
        type: 'production_plan',
        typeName: '生产计划',
        title: `生产计划作废审批：${currentBatch.batchCode}`,
        description: `申请作废生产计划：${currentBatch.batchCode}\n作物：${currentBatch.cropName} ${currentBatch.variety}\n区域：${currentBatch.greenhouseName}`,
        applicantId: currentUserId,
        applicantName: currentUsername,
        applicantDepartment: currentDepartment,
        applyDate: today,
        status: 'pending',
        priority: 'normal',
        businessLink: {
          type: 'production',
          approvalAction: 'void',
          requestId: currentBatch.id,
          requestCode: currentBatch.batchCode,
          cropName: currentBatch.cropName,
          variety: currentBatch.variety,
          greenhouseName: currentBatch.greenhouseName,
          startDate: currentBatch.startDate,
          expectedHarvestDate: currentBatch.expectedHarvestDate,
          responsiblePerson: currentBatch.responsiblePerson,
        },
      };

      if (USE_API) {
        // P0-05: 移除 updatePlan('pending') 步骤，直接提交审批单
        // 状态切换由审批通过后回调 / 手动审批流处理（数据库 batch_status 保持当前值）
        try {
          await apiClient.post('/approvals', approvalData);
        } catch (e: any) {
          console.error('[作废] /approvals POST 失败:', e);
          await showAlert(`作废失败[提交审批单]：${e?.message || String(e)}`);
          return;
        }
      }

      voidedBatchIds.push(currentBatch.id);
      await refreshApprovals();

      // M-03: 用 prev 闭包避免多次连续 setState 互相覆盖
      setSelectedRows(prev => prev.filter(id => !voidedBatchIds.includes(id)));

      setEditedBatches(prev => {
        const next = { ...prev };
        delete next[currentBatch.batchCode];
        return next;
      });

      await showAlert(`已提交作废申请：${currentBatch.batchCode}`);

      setShowBatchEditModal(false);
    } catch (error) {
      // 2026-06-05: 兜底也显示真实错误（之前吞错看不到原因）
      console.error('[作废] 整体失败:', error);
      await showAlert(`提交作废申请失败：${(error as Error)?.message || String(error)}`);
    }

    setShowVoidWarning(false);
  }, [batches, selectedBatchCode, refreshApprovals, editedBatches, selectedRows]);

  // ==================== 选择逻辑 ====================
  const handleSelectRow = useCallback((id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  }, [selectedRows]);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === filteredBatches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredBatches.map(b => b.id));
    }
  }, [selectedRows.length, filteredBatches]);

  const handleBatchSelectAll = useCallback(() => {
    const selectable = filteredBatches.filter(b => b.batchStatus !== 'completed' && b.batchStatus !== 'cancelled');
    if (selectedRows.length === selectable.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(selectable.map(b => b.id));
    }
  }, [selectedRows.length, filteredBatches]);

  const handleBatchDeleteSelectAll = useCallback(() => {
    // 所有状态的生产计划都可以删除
    const deletableBatches = filteredBatches;
    if (selectedRows.length === deletableBatches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(deletableBatches.map(b => b.id));
    }
  }, [selectedRows.length, filteredBatches]);

  const handleConfirmNext = useCallback(() => {
    if (selectedBatchCode && !editedBatchCodes.includes(selectedBatchCode)) {
      setEditedBatchCodes([...editedBatchCodes, selectedBatchCode]);
    }
    const currentIndex = selectedRows.findIndex(id => {
      const batch = batches.find(b => b.id === id);
      return batch?.batchCode === selectedBatchCode;
    });
    if (currentIndex < selectedRows.length - 1) {
      const nextBatch = batches.find(b => b.id === selectedRows[currentIndex + 1]);
      if (nextBatch) {
        setSelectedBatchCode(nextBatch.batchCode);
      }
    }
  }, [selectedBatchCode, editedBatchCodes, selectedRows, batches]);

  // ==================== 导出 ====================
  const handleExportClick = useCallback(() => {
    setExportMode(true);
    setSelectedRows([]);
  }, []);

  const handleConfirmExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  // L-02 + L-03: 用 xlsx 库生成真 Excel；batchStatusLabels 从 constants 复用
  const handleDoExport = useCallback(async () => {
    try {
      const selectedData = batches.filter(b => selectedRows.includes(b.id));
      const headers = ['生产计划批次号', '种植模式', '作物名称', '作物品种', '种植区域', '种植面积', '开始时间', '预计结束时间', '负责人', '目标产量', '发布人', '初次发布时间', '最后修改时间', '当前状态', '版本号', '备注'];
      const exportData = selectedData.map(row => ({
        '生产计划批次号': row.batchCode,
        '种植模式': row.plantingMode,
        '作物名称': row.cropName,
        '作物品种': row.variety,
        '种植区域': row.greenhouseName,
        '种植面积': row.plantingArea,
        '开始时间': row.startDate,
        '预计结束时间': row.expectedHarvestDate,
        '负责人': row.responsiblePerson,
        '目标产量': row.targetYield,
        '发布人': row.publisher || '-',
        '初次发布时间': row.publishDate || '-',
        '最后修改时间': row.lastModifyDate || '-',
        '当前状态': batchStatusLabels[row.batchStatus || 'draft'] || '-',
        '版本号': 'V1.0',
        '备注': row.description || '-',
      }));

      // L-02: 用 xlsx 库生成真正的 .xlsx 文件（之前是伪 HTML 后缀 xls，打开警告）
      if (exportFormat === 'excel') {
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '生产计划');
        const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `生产计划_${todayLocal()}.xlsx`);
      } else if (exportFormat === 'csv') {
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, `生产计划_${todayLocal()}.csv`);
      } else if (exportFormat === 'word') {
        // word 仍用 html 包裹（无 docx 库时是常见方案）
        const escapeHtml = (s: unknown) =>
          String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${escapeHtml(row[h as keyof typeof row])}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        const blob = new Blob([content], { type: 'application/msword' });
        saveAs(blob, `生产计划_${todayLocal()}.doc`);
      }

      setShowExportModal(false);
      setExportMode(false);
      setSelectedRows([]);
    } catch (error) {
      console.error('[ProductionPlan] 导出失败:', error);
      await showAlert('导出失败，请重试');
      setShowExportModal(false);
      setExportMode(false);
      setSelectedRows([]);
    }
  }, [batches, selectedRows, exportFormat]);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  // ==================== 关闭 ====================
  const handleClose = useCallback(() => {
    setShowCreateModal(false);
    resetForm();
    setErrors({});
  }, [resetForm]);

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
