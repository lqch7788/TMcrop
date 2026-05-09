// ExecuteTab 类型定义
// 领料出库页面的类型定义

import { MaterialReceivingRecord, ExecuteMaterialItem } from '@/types/materialReceiving';

// Props接口定义
export interface ExecuteTabProps {
  materialData: MaterialReceivingRecord[];
}

// 搜索状态接口
export interface ExecuteSearchState {
  code: string;
  applicant: string;
  batchCode: string;
  warehouse: string;
  status: string;
}

// 导出模式状态
export interface ExecuteExportState {
  mode: boolean;
  selectedRows: number[];
  showModal: boolean;
  fileType: string;
}

// 编辑表单状态
export interface ExecuteEditFormState {
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  productionBatchCode: string;
  executeStatus: string;
  materials: ExecuteMaterialItem[];
}

// 新增表单状态
export interface ExecuteAddFormState {
  code: string;
  date: string;
  applicant: string;
  warehouseLocation: string;
  reviewer: string;
  productionBatchCode: string;
  materials: ExecuteMaterialItem[];
}

// 物料池状态
export interface ExecuteMaterialPoolState {
  selectedApplicationCode: string;
  selectedMaterialIndices: Set<number>;
  materialActualQuantities: Record<number, number>;
  pool: ExecuteMaterialItem[];
}

// Hook返回类型
export interface UseExecuteTabReturn {
  // Props 数据
  materialData: MaterialReceivingRecord[];

  // 搜索状态
  executeSearchCode: string;
  setExecuteSearchCode: (code: string) => void;
  executeSearchApplicant: string;
  setExecuteSearchApplicant: (applicant: string) => void;
  executeSearchBatchCode: string;
  setExecuteSearchBatchCode: (code: string) => void;
  executeSearchWarehouse: string;
  setExecuteSearchWarehouse: (warehouse: string) => void;
  executeStatusFilter: string;
  setExecuteStatusFilter: (status: string) => void;

  // 分页状态
  executeCurrentPage: number;
  setExecuteCurrentPage: (page: number) => void;
  executePageSize: number;
  setExecutePageSize: (size: number) => void;

  // 导出模式状态
  executeExportMode: boolean;
  setExecuteExportMode: (mode: boolean) => void;
  executeSelectedRows: number[];
  setExecuteSelectedRows: (rows: number[]) => void;
  executeShowExportTypeModal: boolean;
  setExecuteShowExportTypeModal: (show: boolean) => void;
  executeExportFileType: string;
  setExecuteExportFileType: (type: string) => void;

  // 详情/编辑/新增弹窗状态
  executeShowDetailModal: boolean;
  setExecuteShowDetailModal: (show: boolean) => void;
  executeShowEditModal: boolean;
  setExecuteShowEditModal: (show: boolean) => void;
  executeShowDeleteConfirm: boolean;
  setExecuteShowDeleteConfirm: (show: boolean) => void;
  executeShowAddModal: boolean;
  setExecuteShowAddModal: (show: boolean) => void;
  executeSelectedRecord: any;
  setExecuteSelectedRecord: (record: any) => void;
  executeDeletingId: number | null;
  setExecuteDeletingId: (id: number | null) => void;

  // 展开行状态
  executeExpandedRows: Set<number>;
  toggleExecuteExpandRow: (id: number) => void;

  // 批量编辑模式状态
  executeBatchEditMode: boolean;
  setExecuteBatchEditMode: (mode: boolean) => void;
  executeShowBatchEditModal: boolean;
  setExecuteShowBatchEditModal: (show: boolean) => void;
  executeShowBatchDeleteConfirm: boolean;
  setExecuteShowBatchDeleteConfirm: (show: boolean) => void;
  executeShowEditWarning: boolean;
  setExecuteShowEditWarning: (show: boolean) => void;
  executeShowDeleteWarning: boolean;
  setExecuteShowDeleteWarning: (show: boolean) => void;
  executeBatchEditedRecords: Record<number, any>;
  setExecuteBatchEditedRecords: (records: Record<number, any>) => void;
  executeCurrentBatchEditIndex: number;
  setExecuteCurrentBatchEditIndex: (index: number) => void;

  // 物料池状态
  executeSelectedApplicationCode: string;
  setExecuteSelectedApplicationCode: (code: string) => void;
  executeSelectedMaterialIndices: Set<number>;
  setExecuteSelectedMaterialIndices: (indices: Set<number>) => void;
  executeMaterialActualQuantities: Record<number, number>;
  setExecuteMaterialActualQuantities: (quantities: Record<number, number>) => void;
  executeMaterialPool: ExecuteMaterialItem[];
  setExecuteMaterialPool: (pool: ExecuteMaterialItem[]) => void;

  // 编辑表单状态
  executeEditForm: ExecuteEditFormState;
  setExecuteEditForm: (form: ExecuteEditFormState) => void;

  // 新增表单状态
  executeAddForm: ExecuteAddFormState;
  setExecuteAddForm: (form: ExecuteAddFormState) => void;

  // 过滤后的数据
  executeFilteredData: any[];
  executeTotalPages: number;

  // 处理函数
  handleExecuteReset: () => void;
  handleExecuteSelectAll: () => void;
  handleExecuteSelectRow: (id: number) => void;
  handleExecuteExportClick: () => void;
  confirmExecuteExport: () => Promise<void>;
  handleExecuteCancelExport: () => void;
  handleExecuteView: (item: any) => void;
  handleExecuteAdd: () => void;
  handleAddToMaterialPool: () => void;
  handleRemoveFromMaterialPool: (index: number) => void;
  handleUpdateMaterialPoolQuantity: (index: number, actualQuantity: number) => void;
  handleExecuteEdit: (item: any) => void;
  handleExecuteDeleteClick: (id: number) => void;
  confirmExecuteDelete: () => void;
  handleExecuteSaveEdit: () => void;
  handleExecuteSaveAdd: () => void;
  handleExecuteCancelAdd: () => void;
  handleExecuteCancelEdit: () => void;
  handleExecuteCancelDetail: () => void;
  handleExecuteEditAddMaterial: () => void;
  handleExecuteEditRemoveMaterial: (index: number) => void;
  handleExecuteEditMaterialChange: (index: number, field: keyof ExecuteMaterialItem, value: any) => void;
  handleExecuteAddAddMaterial: () => void;
  handleExecuteAddRemoveMaterial: (index: number) => void;
  handleExecuteAddMaterialChange: (index: number, field: keyof ExecuteMaterialItem, value: any) => void;
}
