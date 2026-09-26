// ApplicationTab 类型定义
// 用于领料申请单管理的类型约束

import type { MaterialItem, MaterialReceivingRecord, SelectedArea } from '../../../types/materialReceiving';
import type { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';

// ============================================
// Props 类型
// ============================================

/** ApplicationTab 组件Props */
export interface ApplicationTabProps {
  // 组件不再需要外部传入数据，内部使用 Zustand Store
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
  selectedRows: (string | number)[];
  showExportTypeModal: boolean;
  exportFileType: string;
}

/** 弹窗状态（2026-09-26：批量编辑相关状态已随死代码删除） */
export interface ModalState {
  showDetailModal: boolean;
  showEditModal: boolean;
  showAddModal: boolean;
  showDeleteConfirm: boolean;
  showVoidModal: boolean;
  showEditAlert: boolean;
  showBatchDeleteConfirm: boolean;
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
  /** 2026-08-10：选区域(多选) */
  plantAreas: SelectedArea[];
  reviewer: string;
  status: string;
  /** 2026-09-26 改进批次四：恢复生产批次号 + 预计日期 + 优先级 */
  productionBatchCode: string;
  expectedDate: string;
  priority: string;
  materials: MaterialItem[];
}

/** 新增表单状态 */
export interface AddFormState {
  code: string;
  date: string;
  applicant: string;
  department: string;
  warehouseLocation: string;
  /** 2026-08-10：选区域(多选) */
  plantAreas: SelectedArea[];
  reviewer: string;
  /** 2026-09-26 改进批次四：恢复生产批次号 + 预计日期 + 优先级 + 附件 */
  productionBatchCode: string;
  expectedDate: string;
  priority: string;
  attachments: Array<{ name: string; dataUrl: string }>;
  materials: MaterialItem[];
}

/** 作废弹窗状态 */
export interface VoidState {
  showVoidModal: boolean;
  voidReason: string;
}

/** 批量删除模式状态（2026-09-26：批量编辑已删除） */
export interface BatchEditState {
  batchEditMode: 'edit' | 'delete' | null;
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
  // 2026-09-26 批次三/四：日期范围 + 优先级筛选
  searchDateFrom: string;
  setSearchDateFrom: (value: string) => void;
  searchDateTo: string;
  setSearchDateTo: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;

  // 提交锁（2026-09-26 防双击重复提交）
  isSubmitting: boolean;

  // 分页状态
  currentPage: number;
  setCurrentPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;

  // 导出状态
  exportMode: boolean;
  setExportMode: (value: boolean) => void;
  selectedRows: (string | number)[];
  setSelectedRows: (value: (string | number)[]) => void;
  showExportTypeModal: boolean;
  setShowExportTypeModal: (value: boolean) => void;
  exportFileType: string;
  setExportFileType: (value: string) => void;

  // 详情附加数据（2026-09-26 批次二：审批进度 + 操作历史）
  detailApproval: Record<string, unknown> | null;
  detailLogs: Record<string, unknown>[];

  // 弹窗状态（2026-09-26：批量编辑相关状态已随死代码删除）
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
  showBatchDeleteConfirm: boolean;
  setShowBatchDeleteConfirm: (value: boolean) => void;

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

  // 批量删除模式状态（2026-09-26：批量编辑已删除）
  batchEditMode: 'edit' | 'delete' | null;
  setBatchEditMode: (value: 'edit' | 'delete' | null) => void;

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
  materialData: MaterialReceivingRecord[];
  filteredData: MaterialReceivingRecord[];
  totalPages: number;

  // 处理函数
  handleReset: () => void;
  handleSelectAll: () => void;
  handleSelectRow: (id: string | number) => void;
  handleExportClick: () => void;
  confirmExport: () => Promise<void>;
  handleCancelExport: () => void;
  handleView: (item: MaterialReceivingRecord) => void;
  // 2026-09-26 批次二/四：复制、撤回、物料批次/历史价提示
  handleDuplicate: (item: MaterialReceivingRecord) => void;
  handleWithdraw: (item: MaterialReceivingRecord) => Promise<void>;
  getMaterialStockInfo: (materialCode: string) => Promise<string>;
  handleEdit: (item: MaterialReceivingRecord) => void;
  handleEditAddMaterial: () => void;
  handleEditRemoveMaterial: (index: number) => void;
  handleEditMaterialChange: (index: number, field: keyof MaterialItem, value: string | number) => void;
  handleDeleteClick: (id: number) => void;
  confirmDelete: () => void;
  handleBatchDelete: () => void;
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
