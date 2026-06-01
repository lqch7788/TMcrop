/**
 * 生产计划页面 Hook
 * 将 ProductionPage 的所有状态和逻辑提取为独立 hook，便于维护和测试
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGreenhouseStore, useProductionPlanStore, useOrderDataStore, useAuthStore } from '../../../stores';
import { CropBatch, PlanType, PlanTypeCodePrefix } from '../../../types';
import { useApproval } from '../../../hooks/useApproval';
import { apiClient, USE_API } from '../../../services/apiClient';
import { showAlert, showConfirm } from '../../../lib/dialogService';

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
  // 从 useAuthStore 获取当前登录用户（避免直接读 localStorage）
  const initialUsername = useAuthStore.getState().currentUser?.username || '陆启闯';
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
  generateBatchCode: () => void;

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
    plans: batches,
    fetchPlans,
    addPlan,
    updatePlan,
    deletePlan,
    deletePlans,
  } = useProductionPlanStore();
  // 订单数据（用于关联）
  const orders = useOrderDataStore((s) => s.orders);
  const fetchOrders = useOrderDataStore((s) => s.fetchOrders);

  // 从 useAuthStore 获取当前登录用户（避免直接读 localStorage）
  const currentUsername = useAuthStore((s) => s.currentUser?.username || '陆启闯');
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPlans();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchPlans]);

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
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchBatchCode = !batchCodeSearch || batch.batchCode.toLowerCase().includes(batchCodeSearch.toLowerCase());
      const matchPlantingMode = !plantingModeSearch || batch.plantingMode.toLowerCase().includes(plantingModeSearch.toLowerCase());
      const matchCropName = !cropNameSearch || batch.cropName.toLowerCase().includes(cropNameSearch.toLowerCase());
      const matchVariety = !varietySearch || batch.variety.toLowerCase().includes(varietySearch.toLowerCase());
      const matchGreenhouse = !greenhouseSearch || batch.greenhouseName.toLowerCase().includes(greenhouseSearch.toLowerCase());
      const matchStatus = statusFilter === 'all' || batch.batchStatus === statusFilter;
      const matchPlanType = planTypeFilter === 'all' || batch.planType === planTypeFilter;
      return matchBatchCode && matchPlantingMode && matchCropName && matchVariety && matchGreenhouse && matchStatus && matchPlanType;
    });
  }, [batches, batchCodeSearch, plantingModeSearch, cropNameSearch, varietySearch, greenhouseSearch, statusFilter, planTypeFilter]);

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

  const generateBatchCode = useCallback(() => {
    const year = new Date().getFullYear();
    const num = batches.length + 1;
    const prefix = PlanTypeCodePrefix[formData.planType as PlanType] || 'FQ';
    const code = `${prefix}${year}-${String(num).padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, batchCode: code }));
  }, [batches.length, formData.planType]);

  // ==================== 保存草稿 ====================
  const handleSaveDraft = useCallback(async () => {
    if (!validateForm()) return;

    const today = new Date().toISOString().slice(0, 10);
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
      status: 'draft',
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
      // logger.error('保存草稿失败:', error);
      await showAlert('保存草稿失败，请重试');
    }
  }, [formData, greenhouses, validateForm, addPlan, resetForm]);

  // ==================== 提交审批 ====================
  const handleSubmitForApproval = useCallback(async () => {
    if (!validateForm()) return;

    const today = new Date().toISOString().slice(0, 10);
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
      variety: formData.variety,
      greenhouseName: greenhouseNames,
      areaName: greenhouseNames,
      targetQuantity: parseInt(formData.targetYield) || 0,
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      status: 'pending',
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
      // logger.error('删除生产计划失败:', error);
      await showAlert('删除失败，请重试');
    }
  }, [deletePlan]);

  // ==================== 批量删除确认 ====================
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteWarning(false);
    setBatchDeleteMode(false);
    const toDelete = selectedRows;

    if (toDelete.length === 0) {
      setSelectedRows([]);
      return;
    }

    try {
      if (USE_API) {
        await deletePlans(toDelete);
      }
      setSelectedRows([]);
      await showAlert('删除成功');
    } catch (error) {
      // logger.error('删除生产计划失败:', error);
      await showAlert('删除失败，请重试');
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

      try {
        // 直接复用 hook 顶部定义的 currentUserId/currentUsername/currentDepartment
        // 避免重复 localStorage 访问
        const currentUserIdValue = currentUserId;
        const currentUserNameValue = currentUsername;
        const currentDepartmentValue = currentDepartment;

        for (const batch of batches) {
          const edited = editedBatches[batch.batchCode];
          if (edited) {
            if (USE_API) {
              const apiData: Record<string, unknown> = {};
              if (edited.targetQuantity !== undefined) apiData.targetQuantity = edited.targetQuantity;
              if (edited.targetYield !== undefined) apiData.targetYield = edited.targetYield;
              if (edited.cropName !== undefined) apiData.cropName = edited.cropName;
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

            const today = new Date().toISOString().slice(0, 10);
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

            submittedBatchIds.push(batch.id);
          }
        }

        await refreshApprovals();
      } catch (error) {
        // logger.error('提交审批失败:', error);
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

      if (submittedBatchIds.length === selectedRows.length) {
        setShowBatchEditModal(false);
        setEditedBatches({});
        setEditedBatchCodes([]);
        setSelectedRows([]);
      } else {
        await showAlert(`已提交 ${submittedBatchIds.length} 项编辑申请，还有 ${remainingSelectedRows.length} 项待处理`);
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
    const today = new Date().toISOString().slice(0, 10);

    const currentBatch = batches.find(b => b.batchCode === selectedBatchCode);
    if (!currentBatch) {
      await showAlert('请先选择一个生产计划');
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
        applicantName: currentUserName,
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
        await updatePlan(currentBatch.id, { batchStatus: 'pending' } as any);
        await apiClient.post('/approvals', approvalData);
      }

      voidedBatchIds.push(currentBatch.id);
      await refreshApprovals();

      setSelectedRows(selectedRows.filter(id => !voidedBatchIds.includes(id)));

      setEditedBatches(prev => {
        const next = { ...prev };
        delete next[currentBatch.batchCode];
        return next;
      });

      await showAlert(`已提交作废申请：${currentBatch.batchCode}`);

      setShowBatchEditModal(false);
    } catch (error) {
      // logger.error('提交作废申请失败:', error);
      await showAlert('提交作废申请失败，请重试');
    }

    setShowVoidWarning(false);
  }, [batches, selectedBatchCode, updatePlan, refreshApprovals, editedBatches]);

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

  const handleDoExport = useCallback(async () => {
    try {
      const selectedData = batches.filter(b => selectedRows.includes(b.id));
      const headers = ['生产计划批次号', '种植模式', '作物名称', '作物品种', '种植区域', '种植面积', '开始时间', '预计结束时间', '负责人', '目标产量', '发布人', '初次发布时间', '最后修改时间', '当前状态', '版本号', '备注'];
      const batchStatusLabels: Record<string, string> = {
        draft: '草稿',
        pending: '待审批',
        approved: '已通过',
        rejected: '已拒绝',
        completed: '已完成',
        cancelled: '已作废',
        pending_complete: '待完成',
      };
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

      let content = '';
      let mimeType = '';
      let extension = '';

      if (exportFormat === 'csv') {
        content = headers.join(',') + '\n' + exportData.map(row =>
          headers.map(h => `"${row[h] || ''}"`).join(',')
        ).join('\n');
        mimeType = 'text/csv;charset=utf-8';
        extension = 'csv';
      } else if (exportFormat === 'excel') {
        content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        mimeType = 'application/vnd.ms-excel;charset=utf-8';
        extension = 'xls';
      } else if (exportFormat === 'word') {
        content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">${headers.map(h => `<th>${h}</th>`).join('')}${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        mimeType = 'application/vnd.ms-word;charset=utf-8';
        extension = 'doc';
      }

      const fileName = `生产计划_${new Date().toISOString().slice(0, 10)}.${extension}`;

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setShowExportModal(false);
      setExportMode(false);
      setSelectedRows([]);
    } catch (error) {
      // logger.error('导出失败:', error);
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
