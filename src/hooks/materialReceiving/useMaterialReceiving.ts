import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  MaterialReceivingRecord,
  MaterialItem,
  ExecuteMaterialItem,
} from '../../types/materialReceiving';
import {
  materialExecuteDetails,
} from '../../data/materialReceivingData';
import { useApprovalContext } from '../../contexts/ApprovalContext';
import { Approval, ApprovalType, ApprovalStatus } from '../../types/approval';
import { useMaterialRequestDataStore } from '../../stores';

// 领料申请表单类型
interface EditFormState {
  date: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  plantArea: string;
  reviewer: string;
  productionBatchCode: string;
  status: string;
  materials: MaterialItem[];
}

interface AddFormState {
  code: string;
  date: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  plantArea: string;
  reviewer: string;
  productionBatchCode: string;
  materials: MaterialItem[];
}

// 领料出库表单类型
interface ExecuteEditFormState {
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  productionBatchCode: string;
  executeStatus: string;
  materials: ExecuteMaterialItem[];
}

interface ExecuteAddFormState {
  code: string;
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  productionBatchCode: string;
  materials: ExecuteMaterialItem[];
}

export interface UseMaterialReceivingReturn {
  // 申请领料状态
  searchCode: string;
  setSearchCode: (v: string) => void;
  searchApplicant: string;
  setSearchApplicant: (v: string) => void;
  searchBatchCode: string;
  setSearchBatchCode: (v: string) => void;
  searchWarehouse: string;
  setSearchWarehouse: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  currentPage: number;
  setCurrentPage: (v: number) => void;
  pageSize: number;
  setPageSize: (v: number) => void;
  selectedRows: number[];
  setSelectedRows: (v: number[]) => void;
  expandedRows: Set<number>;
  setExpandedRows: (v: Set<number>) => void;
  exportMode: boolean;
  setExportMode: (v: boolean) => void;
  showDetailModal: boolean;
  setShowDetailModal: (v: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (v: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  showAddModal: boolean;
  setShowAddModal: (v: boolean) => void;
  showVoidModal: boolean;
  setShowVoidModal: (v: boolean) => void;
  showEditAlert: boolean;
  setShowEditAlert: (v: boolean) => void;
  showEditWarning: boolean;
  setShowEditWarning: (v: boolean) => void;
  showDeleteWarning: boolean;
  setShowDeleteWarning: (v: boolean) => void;
  showBatchEditModal: boolean;
  setShowBatchEditModal: (v: boolean) => void;
  showBatchDeleteConfirm: boolean;
  setShowBatchDeleteConfirm: (v: boolean) => void;
  showExportTypeModal: boolean;
  setShowExportTypeModal: (v: boolean) => void;
  selectedRecord: MaterialReceivingRecord | null;
  setSelectedRecord: (v: MaterialReceivingRecord | null) => void;
  deletingId: number | null;
  setDeletingId: (v: number | null) => void;
  editAlertMessage: string;
  setEditAlertMessage: (v: string) => void;
  voidReason: string;
  setVoidReason: (v: string) => void;
  batchEditMode: boolean;
  setBatchEditMode: (v: boolean) => void;
  batchEditedRecords: Record<number, MaterialReceivingRecord>;
  setBatchEditedRecords: (v: Record<number, MaterialReceivingRecord>) => void;
  currentBatchEditIndex: number;
  setCurrentBatchEditIndex: (v: number) => void;
  editForm: EditFormState;
  setEditForm: (v: EditFormState) => void;
  addForm: AddFormState;
  setAddForm: (v: AddFormState) => void;
  exportFileType: string;
  setExportFileType: (v: string) => void;

  // 领料出库状态
  executeSearchCode: string;
  setExecuteSearchCode: (v: string) => void;
  executeSearchApplicant: string;
  setExecuteSearchApplicant: (v: string) => void;
  executeSearchBatchCode: string;
  setExecuteSearchBatchCode: (v: string) => void;
  executeSearchWarehouse: string;
  setExecuteSearchWarehouse: (v: string) => void;
  executeStatusFilter: string;
  setExecuteStatusFilter: (v: string) => void;
  executeCurrentPage: number;
  setExecuteCurrentPage: (v: number) => void;
  executePageSize: number;
  setExecutePageSize: (v: number) => void;
  executeSelectedRows: number[];
  setExecuteSelectedRows: (v: number[]) => void;
  executeExpandedRows: Set<number>;
  setExecuteExpandedRows: (v: Set<number>) => void;
  executeExportMode: boolean;
  setExecuteExportMode: (v: boolean) => void;
  executeShowDetailModal: boolean;
  setExecuteShowDetailModal: (v: boolean) => void;
  executeShowEditModal: boolean;
  setExecuteShowEditModal: (v: boolean) => void;
  executeShowDeleteConfirm: boolean;
  setExecuteShowDeleteConfirm: (v: boolean) => void;
  executeShowAddModal: boolean;
  setExecuteShowAddModal: (v: boolean) => void;
  executeShowExportTypeModal: boolean;
  setExecuteShowExportTypeModal: (v: boolean) => void;
  executeSelectedRecord: typeof materialExecuteDetails[0] | null;
  setExecuteSelectedRecord: (v: typeof materialExecuteDetails[0] | null) => void;
  executeDeletingId: number | null;
  setExecuteDeletingId: (v: number | null) => void;
  executeBatchEditMode: boolean;
  setExecuteBatchEditMode: (v: boolean) => void;
  executeShowEditWarning: boolean;
  setExecuteShowEditWarning: (v: boolean) => void;
  executeShowDeleteWarning: boolean;
  setExecuteShowDeleteWarning: (v: boolean) => void;
  executeShowBatchEditModal: boolean;
  setExecuteShowBatchEditModal: (v: boolean) => void;
  executeShowBatchDeleteConfirm: boolean;
  setExecuteShowBatchDeleteConfirm: (v: boolean) => void;
  executeExportFileType: string;
  setExecuteExportFileType: (v: string) => void;
  executeEditForm: ExecuteEditFormState;
  setExecuteEditForm: (v: ExecuteEditFormState) => void;
  executeAddForm: ExecuteAddFormState;
  setExecuteAddForm: (v: ExecuteAddFormState) => void;
  executeSelectedApplicationCode: string;
  setExecuteSelectedApplicationCode: (v: string) => void;
  executeSelectedMaterialIndices: Set<number>;
  setExecuteSelectedMaterialIndices: (v: Set<number>) => void;
  executeMaterialActualQuantities: Record<number, number>;
  setExecuteMaterialActualQuantities: (v: Record<number, number>) => void;
  executeMaterialPool: ExecuteMaterialItem[];
  setExecuteMaterialPool: (v: ExecuteMaterialItem[]) => void;

  // 数据
  data: MaterialReceivingRecord[];
  filteredData: MaterialReceivingRecord[];
  totalPages: number;

  // 回调函数
  handleReset: () => void;
  toggleExpandRow: (id: number) => void;
  handleSelectAll: () => void;
  handleSelectRow: (id: number) => void;
  handleExportClick: () => void;
  handleCancelExport: () => void;
  confirmExport: () => void;
  handleView: (item: MaterialReceivingRecord) => void;
  handleEdit: (item: MaterialReceivingRecord) => void;
  handleDeleteClick: (id: number) => void;
  confirmDelete: () => void;
  handleSaveEdit: () => void;
  handleVoidApply: () => void;
  submitVoidApply: () => void;
  handleAddMaterial: () => void;
  handleRemoveMaterial: (index: number) => void;
  handleMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  handleSaveAdd: () => void;
  handleCancelAdd: () => void;
  handleEditAddMaterial: () => void;
  handleEditRemoveMaterial: (index: number) => void;
  handleEditMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
}

export function useMaterialReceiving(): UseMaterialReceivingReturn {
  // ============================================
  // 领料申请页面状态
  // ============================================

  // 数据从 Zustand Store 获取（不再使用 mock 数据）
  const {
    items: materialData,
    isLoading,
    loadItems,
    addItem: storeAddItem,
    updateItem: storeUpdateItem,
    deleteItem: storeDeleteItem,
    deleteItems: storeDeleteItems,
    refresh,
  } = useMaterialRequestDataStore();

  // 初始化加载数据
  useEffect(() => { loadItems(); }, [loadItems]);

  // 获取审批上下文（用于联动）
  const approvalContext = useApprovalContext();

  const [searchCode, setSearchCode] = useState('');
  const [searchApplicant, setSearchApplicant] = useState('');
  const [searchBatchCode, setSearchBatchCode] = useState('');
  const [searchWarehouse, setSearchWarehouse] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [exportMode, setExportMode] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaterialReceivingRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);
  const [exportFileType, setExportFileType] = useState('xlsx');
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [editAlertMessage, setEditAlertMessage] = useState('');
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<number, MaterialReceivingRecord>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  const [editForm, setEditForm] = useState<EditFormState>({
    date: '',
    applicant: '',
    department: '',
    warehouseLocation: '',
    plantArea: '',
    reviewer: '',
    productionBatchCode: '',
    status: '',
    materials: [],
  });

  const [addForm, setAddForm] = useState<AddFormState>({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    department: '',
    warehouseLocation: '仓库A区',
    plantArea: '',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [],
  });

  // ============================================
  // 领料出库页面状态
  // ============================================
  const [executeSearchCode, setExecuteSearchCode] = useState('');
  const [executeSearchApplicant, setExecuteSearchApplicant] = useState('');
  const [executeSearchBatchCode, setExecuteSearchBatchCode] = useState('');
  const [executeSearchWarehouse, setExecuteSearchWarehouse] = useState('');
  const [executeStatusFilter, setExecuteStatusFilter] = useState('all');
  const [executeCurrentPage, setExecuteCurrentPage] = useState(1);
  const [executePageSize, setExecutePageSize] = useState(10);
  const [executeSelectedRows, setExecuteSelectedRows] = useState<number[]>([]);
  const [executeExpandedRows, setExecuteExpandedRows] = useState<Set<number>>(new Set());
  const [executeExportMode, setExecuteExportMode] = useState(false);
  const [executeShowDetailModal, setExecuteShowDetailModal] = useState(false);
  const [executeShowEditModal, setExecuteShowEditModal] = useState(false);
  const [executeShowDeleteConfirm, setExecuteShowDeleteConfirm] = useState(false);
  const [executeShowAddModal, setExecuteShowAddModal] = useState(false);
  const [executeSelectedRecord, setExecuteSelectedRecord] = useState<typeof materialExecuteDetails[0] | null>(null);
  const [executeDeletingId, setExecuteDeletingId] = useState<number | null>(null);
  const [executeShowExportTypeModal, setExecuteShowExportTypeModal] = useState(false);
  const [executeExportFileType, setExecuteExportFileType] = useState('xlsx');
  const [executeBatchEditMode, setExecuteBatchEditMode] = useState(false);
  const [executeShowBatchEditModal, setExecuteShowBatchEditModal] = useState(false);
  const [executeShowBatchDeleteConfirm, setExecuteShowBatchDeleteConfirm] = useState(false);
  const [executeShowEditWarning, setExecuteShowEditWarning] = useState(false);
  const [executeShowDeleteWarning, setExecuteShowDeleteWarning] = useState(false);
  const [executeBatchEditedRecords, setExecuteBatchEditedRecords] = useState<Record<number, typeof materialExecuteDetails[0]>>({});
  const [executeCurrentBatchEditIndex, setExecuteCurrentBatchEditIndex] = useState(0);
  const [executeSelectedApplicationCode, setExecuteSelectedApplicationCode] = useState('');
  const [executeSelectedMaterialIndices, setExecuteSelectedMaterialIndices] = useState<Set<number>>(new Set());
  const [executeMaterialActualQuantities, setExecuteMaterialActualQuantities] = useState<Record<number, number>>({});
  const [executeMaterialPool, setExecuteMaterialPool] = useState<ExecuteMaterialItem[]>([]);

  const [executeEditForm, setExecuteEditForm] = useState<ExecuteEditFormState>({
    date: '',
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    productionBatchCode: '',
    executeStatus: '',
    materials: [],
  });

  const [executeAddForm, setExecuteAddForm] = useState<ExecuteAddFormState>({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    warehouseLocation: '仓库A区',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [],
  });

  // ============================================
  // 过滤后的数据
  // ============================================
  const filteredData = useMemo(() => {
    return materialData.filter((item) => {
      if (searchCode && !item.code.toLowerCase().includes(searchCode.toLowerCase())) return false;
      if (searchApplicant && !item.applicant.toLowerCase().includes(searchApplicant.toLowerCase())) return false;
      if (searchBatchCode && !item.productionBatchCode.toLowerCase().includes(searchBatchCode.toLowerCase())) return false;
      if (searchWarehouse && !item.warehouseLocation.toLowerCase().includes(searchWarehouse.toLowerCase())) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [materialData, searchCode, searchApplicant, searchBatchCode, searchWarehouse, statusFilter]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / pageSize);
  }, [filteredData.length, pageSize]);

  // ============================================
  // 回调函数
  // ============================================
  const handleReset = useCallback(() => {
    setSearchCode('');
    setSearchApplicant('');
    setSearchBatchCode('');
    setSearchWarehouse('');
    setStatusFilter('all');
    setCurrentPage(1);
  }, []);

  const toggleExpandRow = useCallback((id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map((item) => item.id));
    }
  }, [selectedRows.length, filteredData]);

  const handleSelectRow = useCallback((id: number) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  }, []);

  const handleExportClick = useCallback(() => {
    setShowExportTypeModal(true);
  }, []);

  const handleCancelExport = useCallback(() => {
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  const confirmExport = useCallback(() => {
    // 导出逻辑在组件中实现
    setShowExportTypeModal(false);
    setExportMode(false);
    setSelectedRows([]);
  }, []);

  const handleView = useCallback((item: MaterialReceivingRecord) => {
    setSelectedRecord(item);
    setShowDetailModal(true);
  }, []);

  const handleEdit = useCallback((item: MaterialReceivingRecord) => {
    if (item.status !== '待审批') {
      setEditAlertMessage(`该领料单当前状态为「${item.status}」，非待审批状态无法编辑。如需处理，可选择「作废申请」。`);
      setShowEditAlert(true);
      return;
    }
    setSelectedRecord(item);
    setEditForm({
      date: item.date,
      applicant: item.applicant,
      department: item.department,
      warehouseLocation: item.warehouseLocation,
      plantArea: item.plantArea,
      reviewer: item.reviewer,
      productionBatchCode: item.productionBatchCode,
      status: item.status,
      materials: [...item.materials],
    });
    setShowEditModal(true);
  }, []);

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    // 调用 API 删除记录
    if (deletingId !== null) {
      await storeDeleteItem(deletingId);
      await loadItems();
    }
    setShowDeleteConfirm(false);
    setDeletingId(null);
  }, [deletingId, storeDeleteItem, loadItems]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedRecord) return;

    const updates = {
      date: editForm.date,
      applicant: editForm.applicant,
      department: editForm.department,
      warehouseLocation: editForm.warehouseLocation,
      plantArea: editForm.plantArea,
      reviewer: editForm.reviewer,
      productionBatchCode: editForm.productionBatchCode,
      status: '待审批',
      statusClass: 'pending',
      materials: editForm.materials.map((m) => ({ ...m, actualQuantity: 0 })),
    };

    await storeUpdateItem(selectedRecord.id, updates as any);
    await loadItems();
    setShowEditModal(false);
  }, [selectedRecord, editForm, storeUpdateItem, loadItems]);

  const handleVoidApply = useCallback(() => {
    if (!selectedRecord) return;
    setVoidReason('');
    setShowVoidModal(true);
  }, [selectedRecord]);

  const submitVoidApply = useCallback(async () => {
    if (!voidReason.trim()) {
      console.warn('作废申请需要填写作废原因');
      return;
    }
    if (!selectedRecord) return;

    await storeUpdateItem(selectedRecord.id, { status: '已作废', statusClass: 'voided' } as any);
    await loadItems();
    setShowVoidModal(false);
    setShowEditModal(false);
    setVoidReason('');
  }, [voidReason, selectedRecord, storeUpdateItem, loadItems]);

  const handleAddMaterial = useCallback(() => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      category: '种质资源',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: '',
    };
    setAddForm((prev) => ({ ...prev, materials: [...prev.materials, newMaterial] }));
  }, []);

  const handleRemoveMaterial = useCallback((index: number) => {
    setAddForm((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  }, []);

  const handleMaterialChange = useCallback(
    (index: number, field: keyof MaterialItem, value: string | number) => {
      setAddForm((prev) => {
        const newMaterials = [...prev.materials];
        newMaterials[index] = { ...newMaterials[index], [field]: value };
        return { ...prev, materials: newMaterials };
      });
    },
    []
  );

  const handleSaveAdd = useCallback(async () => {
    if (!addForm.applicant) {
      console.warn('新增领料单需要选择申请人');
      return;
    }
    if (addForm.materials.length === 0) {
      console.warn('新增领料单需要添加至少一个物料');
      return;
    }

    const now = new Date().toISOString();
    // 通过 Store 调用 API 创建
    const result = await storeAddItem({
      date: addForm.date,
      applicant: addForm.applicant,
      department: addForm.department,
      warehouseLocation: addForm.warehouseLocation,
      plantArea: addForm.plantArea,
      reviewer: addForm.reviewer,
      productionBatchCode: addForm.productionBatchCode,
      materials: addForm.materials.map((m) => ({ ...m, actualQuantity: 0 })),
    });

    const newRecord = result;
    const newCode = newRecord?.code || '';

    // 同步创建审批记录（核心联动功能）
    if (approvalContext && newRecord) {
      const approval: Approval = {
        id: `MAT-AP-${Date.now()}`,
        code: newCode,
        type: ApprovalType.MATERIAL_REQUEST,
        typeName: '领料单',
        category: 'business',
        title: `${addForm.applicant}的领料申请`,
        description: `申请从${addForm.warehouseLocation}领取物料，用于${addForm.plantArea}`,
        applicantId: `user_${addForm.applicant}`,
        applicantName: addForm.applicant,
        applicantDepartment: addForm.department,
        applyDate: addForm.date,
        applyTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        currentStep: 1,
        totalSteps: 1,
        approvers: [{
          userId: `user_${addForm.reviewer}`,
          userName: addForm.reviewer,
          role: '审批人',
          order: 1,
          status: 'pending'
        }],
        records: [],
        status: ApprovalStatus.PENDING,
        priority: 'normal',
        reminderCount: 0,
        createdAt: now,
        updatedAt: now,
        notificationSent: false,
        materials: addForm.materials.map((m) => ({
          materialId: m.materialCode,
          materialCode: m.materialCode,
          materialName: m.materialName,
          requestedQuantity: m.requestedQuantity,
          unit: m.unit
        })),
        businessLink: {
          type: 'material',
          requestId: String(newRecord?.id || ''),
          requestCode: newCode,
          materials: addForm.materials.map((m) => ({
            materialId: m.materialCode,
            materialCode: m.materialCode,
            materialName: m.materialName,
            requestedQuantity: m.requestedQuantity,
            unit: m.unit
          }))
        }
      };
      approvalContext.addApproval(approval);
    }

    setShowAddModal(false);
    setAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      department: '',
      warehouseLocation: '仓库A区',
      plantArea: '',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: [],
    });
  }, [addForm, storeAddItem, approvalContext]);

  const handleCancelAdd = useCallback(() => {
    setShowAddModal(false);
    setAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      department: '',
      warehouseLocation: '仓库A区',
      plantArea: '',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: [],
    });
  }, []);

  const handleEditAddMaterial = useCallback(() => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      category: '种质资源',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: '',
    };
    setEditForm((prev) => ({ ...prev, materials: [...prev.materials, newMaterial] }));
  }, []);

  const handleEditRemoveMaterial = useCallback((index: number) => {
    setEditForm((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  }, []);

  const handleEditMaterialChange = useCallback(
    (index: number, field: keyof MaterialItem, value: string | number) => {
      setEditForm((prev) => {
        const newMaterials = [...prev.materials];
        newMaterials[index] = { ...newMaterials[index], [field]: value };
        return { ...prev, materials: newMaterials };
      });
    },
    []
  );

  return {
    // 申请领料状态
    searchCode,
    setSearchCode,
    searchApplicant,
    setSearchApplicant,
    searchBatchCode,
    setSearchBatchCode,
    searchWarehouse,
    setSearchWarehouse,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    selectedRows,
    setSelectedRows,
    expandedRows,
    setExpandedRows,
    exportMode,
    setExportMode,
    showDetailModal,
    setShowDetailModal,
    showEditModal,
    setShowEditModal,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showAddModal,
    setShowAddModal,
    showVoidModal,
    setShowVoidModal,
    showEditAlert,
    setShowEditAlert,
    showEditWarning,
    setShowEditWarning,
    showDeleteWarning,
    setShowDeleteWarning,
    showBatchEditModal,
    setShowBatchEditModal,
    showBatchDeleteConfirm,
    setShowBatchDeleteConfirm,
    showExportTypeModal,
    setShowExportTypeModal,
    selectedRecord,
    setSelectedRecord,
    deletingId,
    setDeletingId,
    editAlertMessage,
    setEditAlertMessage,
    voidReason,
    setVoidReason,
    batchEditMode,
    setBatchEditMode,
    batchEditedRecords,
    setBatchEditedRecords,
    currentBatchEditIndex,
    setCurrentBatchEditIndex,
    editForm,
    setEditForm,
    addForm,
    setAddForm,
    exportFileType,
    setExportFileType,

    // 领料出库状态
    executeSearchCode,
    setExecuteSearchCode,
    executeSearchApplicant,
    setExecuteSearchApplicant,
    executeSearchBatchCode,
    setExecuteSearchBatchCode,
    executeSearchWarehouse,
    setExecuteSearchWarehouse,
    executeStatusFilter,
    setExecuteStatusFilter,
    executeCurrentPage,
    setExecuteCurrentPage,
    executePageSize,
    setExecutePageSize,
    executeSelectedRows,
    setExecuteSelectedRows,
    executeExpandedRows,
    setExecuteExpandedRows,
    executeExportMode,
    setExecuteExportMode,
    executeShowDetailModal,
    setExecuteShowDetailModal,
    executeShowEditModal,
    setExecuteShowEditModal,
    executeShowDeleteConfirm,
    setExecuteShowDeleteConfirm,
    executeShowAddModal,
    setExecuteShowAddModal,
    executeShowExportTypeModal,
    setExecuteShowExportTypeModal,
    executeSelectedRecord,
    setExecuteSelectedRecord,
    executeDeletingId,
    setExecuteDeletingId,
    executeBatchEditMode,
    setExecuteBatchEditMode,
    executeShowEditWarning,
    setExecuteShowEditWarning,
    executeShowDeleteWarning,
    setExecuteShowDeleteWarning,
    executeShowBatchEditModal,
    setExecuteShowBatchEditModal,
    executeShowBatchDeleteConfirm,
    setExecuteShowBatchDeleteConfirm,
    executeExportFileType,
    setExecuteExportFileType,
    executeEditForm,
    setExecuteEditForm,
    executeAddForm,
    setExecuteAddForm,
    executeSelectedApplicationCode,
    setExecuteSelectedApplicationCode,
    executeSelectedMaterialIndices,
    setExecuteSelectedMaterialIndices,
    executeMaterialActualQuantities,
    setExecuteMaterialActualQuantities,
    executeMaterialPool,
    setExecuteMaterialPool,

    // 数据
    data: materialData,
    filteredData,
    totalPages,

    // 回调函数
    handleReset,
    toggleExpandRow,
    handleSelectAll,
    handleSelectRow,
    handleExportClick,
    handleCancelExport,
    confirmExport,
    handleView,
    handleEdit,
    handleDeleteClick,
    confirmDelete,
    handleSaveEdit,
    handleVoidApply,
    submitVoidApply,
    handleAddMaterial,
    handleRemoveMaterial,
    handleMaterialChange,
    handleSaveAdd,
    handleCancelAdd,
    handleEditAddMaterial,
    handleEditRemoveMaterial,
    handleEditMaterialChange,
  };
}
