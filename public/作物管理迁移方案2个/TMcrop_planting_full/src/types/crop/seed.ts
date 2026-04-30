/**
 * 种源管理模块 - 类型定义
 * 用于种子/种苗采购入库管理
 */

// ============================================
// 种源记录
// ============================================

/**
 * 种源记录状态
 */
export const SEED_STATUS = {
  IN_STOCK: 'in_stock',     // 库存中
  USED: 'used',             // 已使用
  EXPIRED: 'expired',       // 已过期
  LOW_STOCK: 'low_stock',   // 库存不足
} as const;

export type SeedStatus = typeof SEED_STATUS[keyof typeof SEED_STATUS];

export const SEED_STATUS_LABELS: Record<string, string> = {
  [SEED_STATUS.IN_STOCK]: '库存中',
  [SEED_STATUS.USED]: '已使用',
  [SEED_STATUS.EXPIRED]: '已过期',
  [SEED_STATUS.LOW_STOCK]: '库存不足',
};

/**
 * 种源记录
 */
export interface SeedRecord {
  // 主键
  seedId: string;
  // 种源批号（系统生成）
  seedCode: string;
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
  // 种源类型ID
  seedTypeId: string;
  // 种源类型名称
  seedTypeName: string;
  // 采购商ID
  purchaserId: string;
  // 采购商名称
  purchaserName: string;
  // 采购日期
  purchaseDate: string;
  // 采购数量（袋）
  bagCount: number;
  // 每袋单位数量
  unitPerBag: number;
  // 总数量 = bagCount * unitPerBag
  totalQuantity: number;
  // 已使用数量（用于育苗）
  usedCount: number;
  // 剩余数量
  surplusCount: number;
  // 单位（袋/株/粒）
  unit: string;
  // 备注
  description?: string;
  // 图片
  picture?: string;
  // 记录人ID
  userId: string;
  // 记录人名称
  userName: string;
  // 组织ID
  orgId: string;
  // 组织名称
  orgName: string;
  // 状态
  status: SeedStatus;
  // 创建时间
  createdAt: string;
  // 更新时间
  updatedAt: string;
}

/**
 * 种源录入表单
 */
export interface SeedFormData {
  cropTypeId: string;
  cropId: string;
  varietyId: string;
  seedTypeId: string;
  purchaserId: string;
  purchaseDate: string;
  bagCount: number;
  unitPerBag: number;
  unit: string;
  description?: string;
  picture?: string;
}

/**
 * 种源筛选条件
 */
export interface SeedFilters {
  cropTypeId?: string;
  cropId?: string;
  seedTypeId?: string;
  purchaserId?: string;
  seedCode?: string;
  userId?: string;
  orgId?: string;
  status?: SeedStatus;
  dateFrom?: string;
  dateTo?: string;
  quantityMin?: number;
  quantityMax?: number;
  surplusMin?: number;
  surplusMax?: number;
}

// ============================================
// 作物类型
// ============================================

/**
 * 作物类型
 */
export interface CropType {
  cropTypeId: string;
  cropTypeName: string;
  description?: string;
}

/**
 * 作物
 */
export interface Crop {
  cropId: string;
  cropTypeId: string;
  cropTypeName: string;
  cropName: string;
  description?: string;
}

/**
 * 品种
 */
export interface Variety {
  varietyId: string;
  cropId: string;
  cropName: string;
  varietyName: string;
  description?: string;
}

// ============================================
// 种源类型
// ============================================

/**
 * 种源类型（种子、种苗、嫁接苗等）
 */
export interface SeedType {
  seedTypeId: string;
  seedTypeName: string;
  seedTypeCode: string;
  description?: string;
}

// ============================================
// 采购商
// ============================================

/**
 * 采购商
 */
export interface Purchaser {
  purchaserId: string;
  purchaserCode: string;
  purchaserName: string;
  contact?: string;
  phone?: string;
  address?: string;
  description?: string;
}

// ============================================
// 统计卡片
// ============================================

/**
 * 种源统计
 */
export interface SeedStats {
  totalRecords: number;       // 总记录数
  totalQuantity: number;       // 库存总量
  monthlyInCount: number;     // 本月入库
  lowStockCount: number;      // 预警数量
  usedCount: number;         // 已使用
  expiredCount: number;       // 已过期
}

// ============================================
// 导出
// ============================================

export const seedExports = {
  SEED_STATUS,
  SEED_STATUS_LABELS,
};
