/**
 * 种植管理模块 - 类型定义
 * 用于定植记录管理
 */

// ============================================
// 种植记录
// ============================================

/**
 * 种植状态
 */
export const PLANTING_STATUS = {
  GROWING: 'growing',       // 生长期
  HARVESTING: 'harvesting', // 采收中
  HARVESTED: 'harvested',   // 已采收
  CANCELLED: 'cancelled',   // 已取消
} as const;

export type PlantingStatus = typeof PLANTING_STATUS[keyof typeof PLANTING_STATUS];

export const PLANTING_STATUS_LABELS: Record<string, string> = {
  [PLANTING_STATUS.GROWING]: '生长期',
  [PLANTING_STATUS.HARVESTING]: '采收中',
  [PLANTING_STATUS.HARVESTED]: '已采收',
  [PLANTING_STATUS.CANCELLED]: '已取消',
};

/**
 * 种植记录
 */
export interface PlantingRecord {
  // 主键
  plantingId: string;
  // 种植序号（系统生成）
  plantingCode: string;
  // 关联育苗批次ID
  seedlingId?: string;
  // 关联育苗批号
  seedlingCode?: string;
  // 作物类型ID
  cropTypeId: string;
  // 作物类型名称
  cropTypeName: string;
  // 作物ID
  cropId: string;
  // 作物名称
  cropName: string;
  // 品种ID
  varietyId: string;
  // 品种名称
  varietyName: string;
  // 温室/区域ID
  greenhouseId: string;
  // 温室/区域名称
  greenhouseName: string;
  // 种植模式ID
  plantingModeId: string;
  // 种植模式名称
  plantingModeName: string;
  // 定植日期
  plantingDate: string;
  // 预计采收日期
  expectedHarvestDate?: string;
  // 实际采收日期
  actualHarvestDate?: string;
  // 定植数量
  plantingCount: number;
  // 成活数量
  survivalCount: number;
  // 已采收数量
  harvestedCount: number;
  // 采收进度
  harvestProgress: number;
  // 目标产量(kg)
  targetYield: number;
  // 实际产量(kg)
  actualYield: number;
  // 状态
  status: PlantingStatus;
  // 备注
  description?: string;
  // 关联的农事记录数
  farmRecordCount?: number;
  // 关联的施肥记录数
  fertilizeRecordCount?: number;
  // 关联的采收记录数
  harvestRecordCount?: number;
  // 记录人ID
  userId: string;
  // 记录人名称
  userName: string;
  // 创建时间
  createdAt: string;
  // 更新时间
  updatedAt: string;
}

/**
 * 种植录入表单
 */
export interface PlantingFormData {
  seedlingId?: string;
  cropTypeId: string;
  cropId: string;
  varietyId: string;
  greenhouseId: string;
  plantingModeId: string;
  plantingDate: string;
  expectedHarvestDate?: string;
  plantingCount: number;
  survivalCount?: number;
  targetYield?: number;
  description?: string;
}

/**
 * 种植筛选条件
 */
export interface PlantingFilters {
  greenhouseId?: string;
  plantingCode?: string;
  seedlingCode?: string;
  cropId?: string;
  cropTypeId?: string;
  plantingModeId?: string;
  userId?: string;
  status?: PlantingStatus;
  plantingDateFrom?: string;
  plantingDateTo?: string;
  harvestDateFrom?: string;
  harvestDateTo?: string;
}

// ============================================
// 统计
// ============================================

/**
 * 种植统计
 */
export interface PlantingStats {
  totalBatches: number;      // 在种批次
  growingCount: number;       // 生长期
  harvestingCount: number;    // 采收中
  harvestedCount: number;     // 已采收
  monthlyNewCount: number;    // 本月新增
  harvestProgress: number;    // 平均采收进度
}

// ============================================
// 关联履历
// ============================================

/**
 * 种植关联记录
 */
export interface PlantingRelation {
  // 种源信息
  seed?: {
    seedCode: string;
    cropName: string;
    purchaseDate: string;
    purchaserName: string;
  };
  // 育苗信息
  seedling?: {
    seedlingCode: string;
    seedlingDate: string;
    seedlingCount: number;
    plantingCount: number;
  };
  // 施肥记录摘要
  fertilizeSummary?: {
    totalCount: number;
    lastFertilizeDate?: string;
    fertilizerTypes: string[];
  };
  // 采收记录摘要
  harvestSummary?: {
    totalCount: number;
    totalYield: number;
    lastHarvestDate?: string;
  };
}

// ============================================
// 导出
// ============================================

export const plantingExports = {
  PLANTING_STATUS,
  PLANTING_STATUS_LABELS,
};
