/**
 * 作物管理模块共享常量
 * 所有状态映射、标签、颜色配置均从此文件导出
 * 各组件禁止在内部硬编码这些映射
 */

import type { SourceOrigin } from '../types/crop';

// ========== 种源状态映射 ==========
export const SEED_SOURCE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '活跃', color: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: '已用完', color: 'bg-gray-100 text-gray-500' },
  draft: { label: '草稿', color: 'bg-amber-100 text-amber-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

// ========== 种源类型映射 ==========
export const SOURCE_TYPE_MAP: Record<string, string> = {
  seed: '种子',
  seedling: '种苗/实生苗',
  tissue_culture: '组培苗',
  grafting: '嫁接苗',
  cutting: '扦插苗',
  division: '分株苗',
  spore: '孢子/菌种',
  other: '其他',
};

// ========== 种源来源途径映射 ==========
export const SOURCE_ORIGIN_MAP: Record<SourceOrigin | string, string> = {
  internal_seed: '内部种源',
  external_purchase: '外部采购',
  self_produced: '自产',
  commissioned: '委托生产',
  gift: '赠送/受赠',
  tissue_culture: '组培苗',
  grafting: '嫁接苗',
  seedling_split: '分株繁殖',
  cutting: '扦插繁殖',
  direct_seedling: '直接育苗',
  direct_planting: '直接种植',
  external_harvest: '外购入库',
};

// ========== 单位映射（英文→中文） ==========
export const UNIT_MAP: Record<string, string> = {
  g: '克',
  kg: '公斤',
  t: '吨',
  plant: '株',
  seed: '粒',
  bag: '袋',
  box: '箱',
  bundle: '捆',
  bottle: '瓶',
  tray: '盘',
  pot: '盆',
  group: '组',
  batch: '批',
  piece: '个',
  meter: '米',
  square_meter: '平方米',
};

// ========== 育苗状态映射 ==========
export const SEEDLING_STATUS_MAP: Record<string, { label: string; color: string }> = {
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  transplant_ready: { label: '待定植', color: 'bg-amber-100 text-amber-700' },
  completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
  abnormal: { label: '异常', color: 'bg-red-100 text-red-700' },
};

// ========== 定植记录状态映射 ==========
export const TRANSPLANT_STATUS_MAP: Record<string, string> = {
  in_stock: '库存中',
  transplanting: '定植中',
  growing: '生长期',
  harvested: '已采收',
};

// ========== 种植状态映射 ==========
export const PLANTING_STATUS_MAP: Record<string, { label: string; color: string }> = {
  planted: { label: '已定植', color: 'bg-blue-100 text-blue-700' },
  growing: { label: '生长期', color: 'bg-emerald-100 text-emerald-700' },
  harvesting: { label: '采收期', color: 'bg-amber-100 text-amber-700' },
  harvested: { label: '已采收', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

// ========== 作物实例状态映射 ==========
export const CROP_INSTANCE_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  seedling: { label: '育苗中', bg: 'bg-blue-100', text: 'text-blue-700' },
  planted: { label: '已定植', bg: 'bg-amber-100', text: 'text-amber-700' },
  growing: { label: '生长期', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  harvesting: { label: '采收期', bg: 'bg-purple-100', text: 'text-purple-700' },
  harvested: { label: '已采收', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  terminated: { label: '已终止', bg: 'bg-gray-100', text: 'text-gray-500' },
};

// ========== 入库类型映射 ==========
export const INBOUND_TYPE_MAP: Record<string, { label: string; bg: string; text: string }> = {
  seed_source: { label: '种源入库', bg: 'bg-blue-100', text: 'text-blue-700' },
  seedling: { label: '育苗成活', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  planting_harvest: { label: '种植采收', bg: 'bg-orange-100', text: 'text-orange-700' },
};

// ========== 补录状态映射 ==========
export const SUPPLEMENTARY_STATUS_MAP: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

// ========== 品质等级映射 ==========
export const QUALITY_GRADE_MAP: Record<string, { label: string; bg: string; text: string }> = {
  A: { label: 'A级', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  B: { label: 'B级', bg: 'bg-blue-100', text: 'text-blue-700' },
  C: { label: 'C级', bg: 'bg-amber-100', text: 'text-amber-700' },
  D: { label: '次品', bg: 'bg-red-100', text: 'text-red-700' },
};

// ========== 库存状态映射（ProduceInventory） ==========
export const INVENTORY_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  in_stock: { label: '正常', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  low_stock: { label: '库存不足', bg: 'bg-blue-100', text: 'text-blue-700' },
  expired: { label: '已过期', bg: 'bg-red-100', text: 'text-red-700' },
  out_of_stock: { label: '缺货', bg: 'bg-gray-100', text: 'text-gray-700' },
};

// ========== 采收状态映射 ==========
export const HARVEST_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待采收', color: 'bg-amber-100 text-amber-700' },
  harvested: { label: '已采收', color: 'bg-emerald-100 text-emerald-700' },
  graded: { label: '已分级', color: 'bg-blue-100 text-blue-700' },
  stored: { label: '已入库', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

// ========== 库存预警默认值 ==========
export const DEFAULT_ALERT_SETTINGS = {
  enableStorageTimeAlert: false,
  storageTimeThreshold: 0,
  enableQuantityAlert: false,
  minQuantityThreshold: 0,
  maxQuantityThreshold: 0,
  minStock: 0,
  maxStock: 0,
  expirationDays: 0,
};

// ========== 分页选项 ==========
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

// ========== 等级选项 ==========
export const GRADE_OPTIONS = [
  { value: 'A', label: 'A级' },
  { value: 'B', label: 'B级' },
  { value: 'C', label: 'C级' },
] as const;

// ========== 库存状态选项 ==========
export const INVENTORY_STATUS_OPTIONS = [
  { value: 'in_stock', label: '正常' },
  { value: 'low_stock', label: '库存不足' },
  { value: 'expired', label: '已过期' },
  { value: 'out_of_stock', label: '缺货' },
] as const;

// ========== 种源库存状态映射（StockStatus） ==========
// 状态3 修复: 移除 'out_of_stock' 死代码（无对应 enum，永远不会显示）
// 推荐统一从 @/lib/stockStatus 的 STOCK_STATUS_COLOR / getStatusLabel 取
export const STOCK_STATUS_MAP: Record<string, { label: string; color: string }> = {
  sufficient: { label: '充足', color: 'text-green-600 bg-green-50' },
  low: { label: '不足', color: 'text-amber-600 bg-amber-50' },
  depleted: { label: '耗尽', color: 'text-red-600 bg-red-50' },
  active: { label: '充足', color: 'text-green-600 bg-green-50' },
};

// ========== 默认作物编码（兜底值） ==========
export const DEFAULT_CROP_CODE = 'OT0000000000';
