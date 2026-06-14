/**
 * 生产计划页面 — 类型定义
 * C5 阶段 2 拆分：从 useProductionPage.ts 抽出
 */
import { PlanType } from '../../../types';
import { useGreenhouseStore, useOrderDataStore } from '../../../stores';
import type { CropBatch } from '../../../types';

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
  executionStatus?: string;
}

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
  // 2026-06-14: 目标语义分流（区分"目标投入 / 目标产出 / 扩繁目标"）
  targetSeedlingCount?: number;  // 兼容字段（总目标，= targetOutputCount 兜底）
  targetInputCount?: number;     // 目标投入（母株数 / 种子数 / 分株基数）
  targetOutputCount?: number;    // 目标产出（成活苗 / 扩繁子苗 / 嫁接苗）
  targetExpandedCount?: number;  // 母株类的扩繁产出目标（仅 layering/tissue_culture/cutting 用）
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
  handleSave: () => Promise<void>;
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
