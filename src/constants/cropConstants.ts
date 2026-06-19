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
// V3.1 库存来源字典（与 inventory.ts 的 SourceType enum 一一对应）
// key 同时支持短码（gift）和带后缀的（external_purchased）以兼容不同来源
export const SOURCE_ORIGIN_MAP: Record<SourceOrigin | string, { label: string; bg: string; text: string }> = {
  internal_seed:       { label: '内部种源',     bg: 'bg-emerald-100', text: 'text-emerald-700' },
  external_purchase:   { label: '外部采购',     bg: 'bg-blue-100',    text: 'text-blue-700' },
  external_purchased:  { label: '外购入库',     bg: 'bg-blue-100',    text: 'text-blue-700' },
  external_harvest:    { label: '外购入库',     bg: 'bg-blue-100',    text: 'text-blue-700' },
  self_produced:       { label: '自产',         bg: 'bg-orange-100',  text: 'text-orange-700' },
  commissioned:        { label: '委托生产',     bg: 'bg-amber-100',   text: 'text-amber-700' },
  gift:                { label: '赠送/受赠',    bg: 'bg-purple-100',  text: 'text-purple-700' },
  transfer:            { label: '调拨入库',     bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  manual:              { label: '手动录入',     bg: 'bg-slate-100',   text: 'text-slate-700' },
  // 老数据兼容
  tissue_culture:      { label: '组培苗',       bg: 'bg-pink-100',    text: 'text-pink-700' },
  grafting:            { label: '嫁接苗',       bg: 'bg-pink-100',    text: 'text-pink-700' },
  seedling_split:      { label: '分株繁殖',     bg: 'bg-lime-100',    text: 'text-lime-700' },
  cutting:             { label: '扦插繁殖',     bg: 'bg-lime-100',    text: 'text-lime-700' },
  direct_seedling:     { label: '直接育苗',     bg: 'bg-teal-100',    text: 'text-teal-700' },
  direct_planting:     { label: '直接种植',     bg: 'bg-teal-100',    text: 'text-teal-700' },
  // 2026-06-19: source_module 类（行级采收入库/库存写入时 sourceType 落入 source_module 值）
  planting:            { label: '种植采收',     bg: 'bg-orange-100',  text: 'text-orange-700' },
  seedling:            { label: '育苗',         bg: 'bg-emerald-100', text: 'text-emerald-700' },
  seed_source:         { label: '种源',         bg: 'bg-emerald-100', text: 'text-emerald-700' },
  harvest:             { label: '采收入库',     bg: 'bg-orange-100',  text: 'text-orange-700' },
};

/** 兼容旧用法：仅返回 label（避免破坏老代码） */
export const SOURCE_ORIGIN_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SOURCE_ORIGIN_MAP).map(([k, v]) => [k, v.label])
);

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
// 品质等级徽章（key 用字典码：special / excellent / good / qualified / unqualified）
// 数据源：seedBasicData.ts 的 quality_level 字典
export const QUALITY_GRADE_MAP: Record<string, { label: string; bg: string; text: string }> = {
  special:     { label: '特优',   bg: 'bg-emerald-600', text: 'text-white' },
  excellent:   { label: '优',     bg: 'bg-emerald-500', text: 'text-white' },
  good:        { label: '良',     bg: 'bg-blue-600',    text: 'text-white' },
  qualified:   { label: '合格',   bg: 'bg-amber-600',   text: 'text-white' },
  unqualified: { label: '不合格', bg: 'bg-red-600',     text: 'text-white' },
  // 兼容老 A/B/C/D 数据（v1.0 时代留下的）
  A: { label: 'A级', bg: 'bg-emerald-500', text: 'text-white' },
  B: { label: 'B级', bg: 'bg-blue-600',    text: 'text-white' },
  C: { label: 'C级', bg: 'bg-amber-600',   text: 'text-white' },
  D: { label: '次品', bg: 'bg-red-600',     text: 'text-white' },
};

// 种植模式中文标签（key = 字典码）
// 数据源：seedBasicData.ts 的 planting_mode 字典
// 兼容：单值 / 逗号分隔多值 / JSON 数组字符串
export const PLANTING_MODE_MAP: Record<string, string> = {
  // 字典标准码
  direct_seeding:         '直播',
  transplanting:          '移栽',
  grafting:               '嫁接',
  tissue_culture:         '组培',
  greenhouse:             '温室种植',
  open_field:             '露天种植',
  hydroponic:             '水培',
  substrate:              '基质栽培',
  greenhouse_planting:    '大棚种植',
  open_field_planting:    '露地种植',
  // 育苗/种源相关（实际数据里也存了这些 key，复用同一字段）
  plug_seedling:          '穴盘育苗',
  nutrient_block:         '营养块育苗',
  seedling_split:         '分株',
  cutting:                '扦插',
  division:               '分株繁殖',
  spore:                  '孢子/菌种',
  soil_seedling:          '土壤育苗', // 2026-06-08 补：出库记录 1 条数据漏翻译
  // 老数据兼容（v1.0 时代用过的中文写法）
  '温室':     '温室种植',
  '水培':     '水培',
  '土壤':     '露天种植',
  '基质':     '基质栽培',
  '露天':     '露天种植',
  '大棚':     '大棚种植',
  '直播':     '直播',
  '移栽':     '移栽',
  '嫁接':     '嫁接',
  '组培':     '组培',
  '穴盘':     '穴盘育苗',
  '营养块':   '营养块育苗',
  '扦插':     '扦插',
  '分株':     '分株',
};

/**
 * 获取种植模式中文标签
 * @param code 字典码 / 逗号分隔多值 / JSON 数组字符串 / 原始中文
 * @returns 中文标签（多值用顿号连接），未匹配单项原样返回
 */
export function getPlantingModeLabel(code: string | undefined | null | string[]): string {
  if (code === null || code === undefined) return '';
  // 已经是数组：直接 map
  if (Array.isArray(code)) {
    return code.map(c => PLANTING_MODE_MAP[c] || c).join('、');
  }
  const raw = String(code).trim();
  if (!raw) return '';
  // JSON 数组字符串：["open_field","greenhouse"]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr.map(c => PLANTING_MODE_MAP[c] || c).join('、');
      }
    } catch {
      // 解析失败则按字符串处理
    }
  }
  // 逗号分隔：open_field,greenhouse → 露天种植、温室种植
  if (raw.includes(',')) {
    return raw.split(',').map(c => {
      const t = c.trim();
      return PLANTING_MODE_MAP[t] || t;
    }).filter(Boolean).join('、');
  }
  // 单值
  return PLANTING_MODE_MAP[raw] || raw;
}

/**
 * 安全解析采收人员数组
 * 兼容：直接数组 / JSON 字符串 / null / undefined / 字符串（按 JSON 解析，失败回退空数组）
 * @param value 任意来源的 harvesterNames 字段
 * @returns string[] 统一数组
 */
export function parseHarvesterNames(value: string[] | string | null | undefined): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  const raw = String(value).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// ========== 繁殖途径标签（种源管理专用） ==========
// 2026-06-06: 抽离重复 3 处（SeedSourceTable / PropagationRecordModal / PropagationStageModal）
export const PROPAGATION_TYPE_LABELS: Record<string, string> = {
  external: '外购入库',
  breeding: '育种计划',
  seed_saving: '种植留种',
  asexual: '无性繁殖',
};
export const PROPAGATION_TYPE_COLORS: Record<string, string> = {
  external: 'bg-gray-100 text-gray-600',
  breeding: 'bg-orange-100 text-orange-700',
  seed_saving: 'bg-green-100 text-green-700',
  asexual: 'bg-purple-100 text-purple-700',
};

// ========== 繁殖阶段状态标签（种源管理专用） ==========
export const PROPAGATION_STATUS_LABELS: Record<string, string> = {
  planned: '已计划',
  in_progress: '进行中',
  harvested: '已采收',
  quality_checked: '已质检',
  // 2026-06-19: 补 in_stock 映射（circulation.service 写入的硬编码值）
  in_stock: '已入库',
  completed: '已入库',
  failed: '失败',
};
export const PROPAGATION_STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  harvested: 'bg-green-100 text-green-700',
  quality_checked: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

// ========== 库存状态映射（ProduceInventory） ==========
export const INVENTORY_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  in_stock: { label: '正常', bg: 'bg-emerald-600', text: 'text-white' },
  low_stock: { label: '库存不足', bg: 'bg-blue-600', text: 'text-white' },
  expired: { label: '已过期', bg: 'bg-red-600', text: 'text-white' },
  out_of_stock: { label: '缺货', bg: 'bg-slate-600', text: 'text-white' },
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
