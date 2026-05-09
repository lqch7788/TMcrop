// ApplicationTab 类型定义
// 用于领料申请单管理的类型约束

import type { MaterialItem, MaterialReceivingRecord } from '../../../types/materialReceiving';
import type { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';

// ============================================
// Props 类型
// ============================================

/** ApplicationTab 组件Props */
export interface ApplicationTabProps {
  materialData: MaterialReceivingRecord[];
  setMaterialData: React.Dispatch<React.SetStateAction<MaterialReceivingRecord[]>>;
}

// ============================================
// 状态类型
// ============================================

/** 搜索筛选状态 */
export interface SearchFilters {
  searchCode: string;
  searchApplicant: string;
  searchBatchCode: string;
  searchWarehouse: string;
  statusFilter: string;
}

/** 分页状态 */
export interface PaginationState {
  currentPage: number;
  pageSize: number;
}

/** 导出模式状态 */
export interface ExportState {
  exportMode: boolean;
  selectedRows: number[];
  showExportTypeModal: boolean;
  exportFileType: string;
}

/** 弹窗状态 */
export interface ModalState {
  showDetailModal: boolean;
  showEditModal: boolean;
  showAddModal: boolean;
  showDeleteConfirm: boolean;
  showVoidModal: boolean;
  showEditAlert: boolean;
  showBatchEditModal: boolean;
  showBatchDeleteConfirm: boolean;
  showEditWarning: boolean;
  showDeleteWarning: boolean;
}

/** 选中记录状态 */
export interface SelectedRecordState {
  selectedRecord: MaterialReceivingRecord | null;
  deletingId: number | null;
}

/** 展开行状态 */
export interface ExpandedRowsState {
  expandedRows: Set<number>;
}

/** 编辑表单状态 */
export interface EditFormState {
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

/** 新增表单状态 */
export interface AddFormState {
  code: string;
  date: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  plantArea: string;
  reviewer: string;
  productionBatchCode: string;
  batchRemark: string;
  materials: MaterialItem[];
}

/** 作废弹窗状态 */
export interface VoidState {
  showVoidModal: boolean;
  voidReason: string;
}

/** 批量编辑状态 */
export interface BatchEditState {
  batchEditMode: boolean;
  batchEditedRecords: Record<number, MaterialReceivingRecord>;
  currentBatchEditIndex: number;
}

/** 编辑提醒弹窗状态 */
export interface EditAlertState {
  showEditAlert: boolean;
  editAlertMessage: string;
}

// ============================================
// Hook 返回类型
// ============================================

/** useApplicationTab Hook 返回类型 */
export interface UseApplicationTabReturn {
  // Props 数据
  materialData: MaterialReceivingRecord[];
  setMaterialData: React.Dispatch<React.SetStateAction<MaterialReceivingRecord[]>>;

  // 搜索筛选状态
  searchCode: string;
  setSearchCode: (value: string) => void;
  searchApplicant: string;
  setSearchApplicant: (value: string) => void;
  searchBatchCode: string;
  setSearchBatchCode: (value: string) => void;
  searchWarehouse: string;
  setSearchWarehouse: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;

  // 分页状态
  currentPage: number;
  setCurrentPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;

  // 导出状态
  exportMode: boolean;
  setExportMode: (value: boolean) => void;
  selectedRows: number[];
  setSelectedRows: (value: number[]) => void;
  showExportTypeModal: boolean;
  setShowExportTypeModal: (value: boolean) => void;
  exportFileType: string;
  setExportFileType: (value: string) => void;

  // 弹窗状态
  showDetailModal: boolean;
  setShowDetailModal: (value: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (value: boolean) => void;
  showAddModal: boolean;
  setShowAddModal: (value: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (value: boolean) => void;
  showVoidModal: boolean;
  setShowVoidModal: (value: boolean) => void;
  showEditAlert: boolean;
  setShowEditAlert: (value: boolean) => void;
  showBatchEditModal: boolean;
  setShowBatchEditModal: (value: boolean) => void;
  showBatchDeleteConfirm: boolean;
  setShowBatchDeleteConfirm: (value: boolean) => void;
  showEditWarning: boolean;
  setShowEditWarning: (value: boolean) => void;
  showDeleteWarning: boolean;
  setShowDeleteWarning: (value: boolean) => void;

  // 选中记录
  selectedRecord: MaterialReceivingRecord | null;
  setSelectedRecord: (value: MaterialReceivingRecord | null) => void;
  deletingId: number | null;
  setDeletingId: (value: number | null) => void;

  // 展开行
  expandedRows: Set<number>;
  toggleExpandRow: (id: number) => void;

  // 作废状态
  voidReason: string;
  setVoidReason: (value: string) => void;

  // 批量编辑状态
  batchEditMode: boolean;
  setBatchEditMode: (value: boolean) => void;
  batchEditedRecords: Record<number, MaterialReceivingRecord>;
  setBatchEditedRecords: (value: Record<number, MaterialReceivingRecord>) => void;
  currentBatchEditIndex: number;
  setCurrentBatchEditIndex: (value: number) => void;

  // 编辑提醒
  editAlertMessage: string;
  setEditAlertMessage: (value: string) => void;

  // 编辑表单
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;

  // 新增表单
  addForm: AddFormState;
  setAddForm: React.Dispatch<React.SetStateAction<AddFormState>>;

  // 过滤后的数据
  filteredData: MaterialReceivingRecord[];
  totalPages: number;

  // 处理函数
  handleReset: () => void;
  handleSelectAll: () => void;
  handleSelectRow: (id: number) => void;
  handleExportClick: () => void;
  confirmExport: () => Promise<void>;
  handleCancelExport: () => void;
  handleView: (item: MaterialReceivingRecord) => void;
  handleEdit: (item: MaterialReceivingRecord) => void;
  handleEditAddMaterial: () => void;
  handleEditRemoveMaterial: (index: number) => void;
  handleEditMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  handleDeleteClick: (id: number) => void;
  confirmDelete: () => void;
  handleSaveEdit: () => void;
  handleVoidApply: () => void;
  submitVoidApply: () => void;
  handleAddMaterial: () => void;
  handleRemoveMaterial: (index: number) => void;
  handleMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  handleGenerateAddCode: () => void;
  handleSaveAdd: () => void;
  handleCancelAdd: () => void;
}
