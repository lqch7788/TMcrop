/**
 * 育苗管理模块 - 类型定义
 * 用于种子育苗批次管理
 */

// ============================================
// 育苗记录
// ============================================

/**
 * 育苗状态
 */
export const SEEDLING_STATUS = {
  SEEDLING: 'seedling',     // 育苗中
  READY: 'ready',           // 待定植
  PLANTED: 'planted',       // 已定植
  CANCELLED: 'cancelled',   // 已取消
} as const;

export type SeedlingStatus = typeof SEEDLING_STATUS[keyof typeof SEEDLING_STATUS];

export const SEEDLING_STATUS_LABELS: Record<string, string> = {
  [SEEDLING_STATUS.SEEDLING]: '育苗中',
  [SEEDLING_STATUS.READY]: '待定植',
  [SEEDLING_STATUS.PLANTED]: '已定植',
  [SEEDLING_STATUS.CANCELLED]: '已取消',
};

/**
 * 育苗记录
 */
export interface SeedlingRecord {
  // 主键
  seedlingId: string;
  // 育苗批号（系统生成）
  seedlingCode: string;
  // 关联种源ID
  seedId?: string;
  // 关联种源批号
  seedCode?: string;
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
  // 育苗日期
  seedlingDate: string;
  // 预计定植日期
  expectedPlantDate?: string;
  // 实际定植日期
  actualPlantDate?: string;
  // 育苗数量
  seedlingCount: number;
  // 成活数量
  survivalCount: number;
  // 定植数量
  plantingCount: number;
  // 损耗数量
  attritionCount: number;
  // 损耗率
  attritionRate: number;
  // 状态
  status: SeedlingStatus;
  // 备注
  description?: string;
  // 图片
  picture?: string;
  // 标签二维码内容
  qrCode?: string;
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
 * 育苗录入表单
 */
export interface SeedlingFormData {
  seedId?: string;
  cropTypeId: string;
  cropId: string;
  varietyId: string;
  greenhouseId: string;
  seedlingDate: string;
  expectedPlantDate?: string;
  seedlingCount: number;
  survivalCount?: number;
  description?: string;
  picture?: string;
}

/**
 * 育苗筛选条件
 */
export interface SeedlingFilters {
  greenhouseId?: string;
  seedlingCode?: string;
  seedCode?: string;
  cropId?: string;
  cropTypeId?: string;
  userId?: string;
  status?: SeedlingStatus;
  seedlingDateFrom?: string;
  seedlingDateTo?: string;
  plantDateFrom?: string;
  plantDateTo?: string;
}

// ============================================
// 统计
// ============================================

/**
 * 育苗统计
 */
export interface SeedlingStats {
  totalBatches: number;      // 总批次
  seedlingCount: number;      // 育苗中数量
  readyCount: number;        // 待定植数量
  plantedCount: number;      // 已定植数量
  survivalRate: number;       // 成活率
}

// ============================================
// 标签打印
// ============================================

/**
 * 标签数据
 */
export interface LabelData {
  seedlingCode: string;
  cropName: string;
  varietyName: string;
  seedlingCount: number;
  seedlingDate: string;
  expectedPlantDate?: string;
  qrCode: string;
}

// ============================================
// 导出
// ============================================

export const seedlingExports = {
  SEEDLING_STATUS,
  SEEDLING_STATUS_LABELS,
};
