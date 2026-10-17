/**
 * 作物管理通用回收站类型定义（2026-10-17）
 */

export type RecycleEntityType =
  | 'seed_source'
  | 'seedling'
  | 'planting'
  | 'fertilizer_record'
  | 'pesticide_record'
  | 'daily_record'
  | 'inventory_stock'
  | 'harvest_record'
  | 'planting_harvest_record'
  | 'watering_record'
  | 'propagation_record'
  | 'inventory_transaction'
  | 'material_flow_log';

export type RecycleRestoreStatus = 'pending' | 'restored' | 'purged' | 'failed';

export interface RecycleBinItem {
  id: string;
  module: string;
  entityType: RecycleEntityType | string;
  entityId: string;
  entityCode: string;
  displayName: string;
  /** 主表快照（JSON 字符串） */
  snapshot: string;
  dependencies: string | null;
  restoreInfo: string | null;
  deleteMode: 'soft' | 'hard' | string;
  sourcePage: string;
  deletedBy: string;
  deletedById: string;
  deletedAt: string;
  restoreStatus: RecycleRestoreStatus | string;
  restoredBy: string | null;
  restoredAt: string | null;
  restoreError: string | null;
  createdAt: string;
}

export interface RecycleBinListResult {
  items: RecycleBinItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RecycleBinStats {
  total: number;
  /** 数组形式：避免 camelCase 响应中间件把 entity_type 键名改写 */
  byType: Array<{ entityType: string; count: number }>;
}

export interface RecycleBinFilters {
  entityType?: string;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/** 业务类型中文名（与后端实体注册表 label 对齐） */
export const RECYCLE_ENTITY_LABELS: Record<string, string> = {
  seed_source: '种源',
  seedling: '育苗记录',
  planting: '种植记录',
  fertilizer_record: '水肥记录',
  pesticide_record: '病虫害记录',
  daily_record: '每日记录',
  inventory_stock: '作物库存',
  harvest_record: '采收入库记录',
  planting_harvest_record: '种植采收记录',
  watering_record: '浇水记录',
  propagation_record: '育苗繁殖记录',
  inventory_transaction: '出库流水',
  material_flow_log: '流转记录',
};

/** 流水类：只归档查看，不提供恢复（与后端 restoreMode='view_only' 对齐） */
export const RECYCLE_VIEW_ONLY_TYPES = new Set([
  'inventory_transaction',
  'material_flow_log',
]);

export const RECYCLE_STATUS_LABELS: Record<string, string> = {
  pending: '待恢复',
  restored: '已恢复',
  purged: '已彻底删除',
  failed: '归档失败',
};
