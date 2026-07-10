/**
 * 业务枚举常量（2026-07-10 P1-6）
 * 抽自 8 个作物管理页面分散硬编码的 enum → label/color 映射。
 *
 * 设计原则：
 * - enum 值（key）保持与后端 snake_case 一致
 * - label 是中文显示
 * - color 是 badge 颜色 class
 * - 提供 lookup 函数 `lookupEnumLabel()` 兜底英文
 */

import type { StockStatus, SourceType, InventoryStatus, SeedlingStatus } from '../types/crop';

// ==================== 种源类型 (SOURCE_TYPE) ====================
export interface EnumOption {
  value: string;
  label: string;
  color: string;       // tailwind bg + text
}

export const SOURCE_TYPE_OPTIONS: EnumOption[] = [
  { value: 'seed', label: '种子', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'seedling', label: '种苗', color: 'bg-green-100 text-green-700' },
  { value: 'cutting', label: '扦插苗', color: 'bg-amber-100 text-amber-700' },
  { value: 'grafting', label: '嫁接苗', color: 'bg-amber-100 text-amber-700' },
  { value: 'tissue_culture', label: '组培苗', color: 'bg-purple-100 text-purple-700' },
  { value: 'split', label: '分株苗', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'bulb', label: '种球/球根', color: 'bg-pink-100 text-pink-700' },
  { value: 'self_produced', label: '自繁苗', color: 'bg-blue-100 text-blue-700' },
  { value: 'external', label: '外购苗', color: 'bg-orange-100 text-orange-700' },
];

// ==================== 库存状态 (INVENTORY_STATUS) ====================
export const INVENTORY_STATUS_OPTIONS: EnumOption[] = [
  { value: 'in_stock', label: '库存中', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'low_stock', label: '低库存', color: 'bg-amber-100 text-amber-700' },
  { value: 'frozen', label: '已冻结', color: 'bg-blue-100 text-blue-700' },
  { value: 'outbound', label: '已出库', color: 'bg-gray-100 text-gray-700' },
  { value: 'depleted', label: '已用完', color: 'bg-red-100 text-red-700' },
];

// ==================== 育苗状态 (SEEDLING_STATUS) ====================
export const SEEDLING_STATUS_OPTIONS: EnumOption[] = [
  { value: 'sown', label: '已播种', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: '生长中', color: 'bg-amber-100 text-amber-700' },
  { value: 'transplant_ready', label: '待出圃', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'completed', label: '已出圃', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: '已取消', color: 'bg-gray-100 text-gray-700' },
  { value: 'abnormal', label: '异常结束', color: 'bg-red-100 text-red-700' },
];

// ==================== 流转类型 (FLOW_TYPE) ====================
export const FLOW_TYPE_OPTIONS: EnumOption[] = [
  { value: 'seed_source→seedling', label: '种源→育苗', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'seed_source→planting', label: '种源→种植', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'seedling→planting', label: '育苗→种植', color: 'bg-green-100 text-green-700' },
  { value: 'planting→harvest', label: '种植→采收', color: 'bg-amber-100 text-amber-700' },
  { value: 'seedling→harvest', label: '育苗→采收', color: 'bg-amber-100 text-amber-700' },
  { value: 'inventory→external', label: '库存→出库', color: 'bg-blue-100 text-blue-700' },
  { value: 'inventory→planting', label: '库存→种植', color: 'bg-blue-100 text-blue-700' },
  { value: 'inventory→seedling', label: '库存→育苗', color: 'bg-blue-100 text-blue-700' },
  { value: 'inventory→seed_source', label: '库存→种源', color: 'bg-blue-100 text-blue-700' },
  { value: 'external→planting', label: '外部→种植', color: 'bg-orange-100 text-orange-700' },
  { value: 'external→seedling', label: '外部→育苗', color: 'bg-orange-100 text-orange-700' },
  { value: 'seed_source→harvest', label: '种源→采收', color: 'bg-amber-100 text-amber-700' },
  { value: 'correction', label: '修正', color: 'bg-gray-100 text-gray-700' },
  { value: 'manual_correction', label: '手动修正', color: 'bg-gray-100 text-gray-700' },
  { value: 'plan→seed_source', label: '计划→种源', color: 'bg-purple-100 text-purple-700' },
  { value: 'planting→seed_source', label: '种植→种源', color: 'bg-purple-100 text-purple-700' },
];

// ==================== 病虫害类型 (CONTROL_TYPE) ====================
export const CONTROL_TYPE_OPTIONS: EnumOption[] = [
  { value: 'chemical', label: '化学防治', color: 'bg-red-100 text-red-700' },
  { value: 'bio', label: '生物防治', color: 'bg-green-100 text-green-700' },
  { value: 'physical', label: '物理防治', color: 'bg-blue-100 text-blue-700' },
];

// ==================== 品质等级 ====================
export const QUALITY_GRADE_OPTIONS: EnumOption[] = [
  { value: 'special', label: '特优', color: 'bg-purple-100 text-purple-700' },
  { value: 'excellent', label: '优', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'good', label: '良', color: 'bg-blue-100 text-blue-700' },
  { value: 'qualified', label: '合格', color: 'bg-amber-100 text-amber-700' },
  { value: 'unqualified', label: '不合格', color: 'bg-red-100 text-red-700' },
];

// ==================== 通用 lookup 函数 ====================
/**
 * 在选项数组中查找 value 对应的 label，找不到时返回 value 原始字符串（兜底英文）。
 * 业务场景：后端新增枚举值时 UI 不会崩。
 */
export function lookupEnumLabel(options: EnumOption[], value: string | null | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const opt = options.find((o) => o.value === value);
  return opt?.label || value;
}

/** 查找 color class，兜底灰色 */
export function lookupEnumColor(options: EnumOption[], value: string | null | undefined): string {
  if (!value) return 'bg-gray-100 text-gray-700';
  const opt = options.find((o) => o.value === value);
  return opt?.color || 'bg-gray-100 text-gray-700';
}