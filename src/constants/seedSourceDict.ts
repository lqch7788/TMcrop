/**
 * 种源管理 UI 字典 & 共享配置
 *
 * - SOURCE_ORIGINS: 9 枚举 source_origin 中文标签
 * - SOURCE_TYPES: 9 枚举 source_type 中文标签
 * - SEED_SOURCE_FILTER_DEFAULTS: 筛选栏初始值（SeedSourcePage + handleReset 共用）
 * - SEED_SOURCE_EXPORT_HEADERS: 导出 Excel 表头（SeedSourcePage 用）
 * - getSeedSourceVarietyName: 种源「作物品种」名称口径（跨模块共用的单一真理源）
 * - getSeedSourceOriginOrSupplier: 种源「种源来源/原始供应商」显示口径
 */
import type { SeedSource } from '../types/crop';
import { SOURCE_ORIGIN_MAP } from './cropConstants';

/**
 * 种源「作物品种」名称（2026-10-17）
 *
 * 口径：cropVariety（作物品种，最细） > varietyName（后端按品种库解析的最细名称） > cropName（兜底）
 *
 * 为什么需要：cropName 是作物级名称（如"草莓"），同一作物下多个品种无法区分；
 *   品种判断/展示必须用品种级名称（如"红颜"/"宁玉"/"章姬"）。
 *   后端 findAll 返回的 varietyName = COALESCE(品种库子品种, 品种库品种, crop_variety, variety_name)，
 *   故作为 cropVariety 为空时的解析兜底。
 */
export function getSeedSourceVarietyName(
  record: Pick<SeedSource, 'cropVariety' | 'varietyName' | 'cropName'>,
): string {
  return record.cropVariety || record.varietyName || record.cropName || '';
}

/**
 * 种源「种源来源 / 原始供应商」显示值（2026-10-17）
 *
 * 口径与内部种源列表的「来源途径」「原始供应商」两列一致：
 *   1. 有原始供应商（调拨来源优先 originalSupplierName，其余取 supplierName）→ 显示供应商名称
 *   2. 没有供应商（如种植留种回流、无供应商的调拨）→ 回退显示来源途径中文（如"种植留种"）
 *
 * 为什么调拨优先取 originalSupplierName：种源的 supplierName 是入库时复制过来的，
 *   originalSupplierName 才是来源库存真正的供应商（与列表列注释一致）。
 */
export function getSeedSourceOriginOrSupplier(
  record: Pick<SeedSource, 'sourceOrigin' | 'supplierName' | 'originalSupplierName'>,
): string {
  const supplier = record.sourceOrigin === 'inventory_transfer'
    ? (record.originalSupplierName || record.supplierName)
    : record.supplierName;
  if (supplier && supplier.trim()) return supplier.trim();
  return SOURCE_ORIGIN_MAP[record.sourceOrigin]?.label || record.sourceOrigin || '';
}

/**
 * 9 种 source_origin 中文标签
 */
export const SOURCE_ORIGINS = [
  { value: 'external_purchase', label: '外购种子' },
  { value: 'direct_seedling', label: '外购种苗' },
  { value: 'tissue_culture', label: '组培繁育' },
  { value: 'grafting', label: '嫁接繁育' },
  { value: 'internal_seed', label: '内部留种' },
  { value: 'seedling_split', label: '分株繁殖' },
  { value: 'cutting', label: '扦插繁殖' },
  { value: 'direct_planting', label: '直接播种' },
  { value: 'external_harvest', label: '外购成品' },
] as const

/**
 * 9 种 source_type 形态中文标签
 */
export const SOURCE_TYPES = [
  { value: 'seed', label: '种子' },
  { value: 'seedling', label: '实生苗' },
  { value: 'cutting', label: '扦插苗' },
  { value: 'grafting', label: '嫁接苗' },
  { value: 'tissue_culture', label: '组培苗' },
  { value: 'split', label: '分株苗' },
  { value: 'bulb', label: '种球' },
  { value: 'self_produced', label: '自繁苗' },
  { value: 'external', label: '外购' },
] as const

// 2026-07-01 P2-1：种源类型 → 供应商类型缩写（AddModal 专用，EditModal 类型不同）
export const ADD_SOURCE_TYPE_TO_SUPPLIER_TYPE: Record<string, string | null> = {
  seed: 'SP',              // 种子 → 原材料供应
  seedling: 'SP',          // 种苗 → 原材料供应
  cutting: 'SP',           // 扦插苗 → 原材料供应
  grafting: 'SP',          // 嫁接苗 → 原材料供应
  tissue_culture: 'SP',    // 组培苗 → 原材料供应
  split: 'SP',             // 分株苗 → 原材料供应
  bulb: 'SP',              // 种球 → 原材料供应
  other: null,             // 其他 → 显示全部供应商
};

// 2026-07-01 P2-12：种源形态 → 简化标签（DetailModal 重复定义）
export const PROPAGATION_FORM_LABELS: Record<string, string> = {
  seed: '种子',
  seedling: '种苗',
  cutting: '扦插苗',
  grafting: '嫁接苗',
  tissue_culture: '组培苗',
  split: '分株苗',
  bulb: '种球',
  flower: '花朵',
  scion: '穗条',
  branch: '枝条',
  root: '块根',
  stem: '块茎',
  bulb_scale: '鳞茎',
  leaf: '叶片',
  whole_plant: '整株',
  other: '其他',
};

// 2026-07-14：筛选默认值抽到共享常量（SeedSourcePage useState + handleReset 共用，避免字段漂移）
export const SEED_SOURCE_FILTER_DEFAULTS = {
  cropCategory: '',
  cropName: '',
  seedCode: '',
  sourceType: '',
  supplierName: '',
  startDate: '',
  endDate: '',
  status: '',
  createBy: '',
  cropType: '',
  orgId: '',
  recorderId: '',
  surplusMin: undefined as number | undefined,
  surplusMax: undefined as number | undefined,
  propagationType: undefined as string | undefined,
  propagationStatus: undefined as string | undefined,
  // 2026-07-21：回流合并筛选（列表已删除回流次数字段，移到筛选器）
  reflowFilter: '' as 'has_reflow' | 'no_reflow' | '',
};

// 2026-07-14：导出 Excel 表头抽到共享常量（避免硬编码在组件内）
// 2026-07-21：与列表字段对齐（删除列表已移除的列）
export const SEED_SOURCE_EXPORT_HEADERS = [
  // 2026-10-18 P1 修复：表头必须与 SeedSourcePage.exportData 的 key 完全一致，
  // 原「形态/供应商/采购入库日期/剩余数量/创建人时间」与数据 key 不匹配 → 5 列导出空白
  '种源批号', '作物编码', '作物品种', '品种路径', '种源形态', '来源途径',
  '原始供应商', '入库日期', '入库数量', '可用数量', '单位',
  '库存状态', '备注', '创建人 / 创建时间',
] as const;
