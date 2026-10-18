/**
 * 肥料库共享常量（2026-07-12）
 * 消除 AddFertilizerModal / EditFertilizerModal 中的重复定义
 */

/**
 * 肥料大类选项（2026-10-18 重分类：原 7 类合并为 4 大类）
 * organic   有机肥料
 * inorganic 无机肥料（下含 4 个中类，见 FERTILIZER_SUB_TYPE_OPTIONS）
 * microbial 微生物肥料
 * functional 功能性肥料（原水溶肥、缓释肥合并）
 */
export const FERTILIZER_TYPE_OPTIONS = [
  { value: 'organic', label: '有机肥料' },
  { value: 'inorganic', label: '无机肥料' },
  { value: 'microbial', label: '微生物肥料' },
  { value: 'functional', label: '功能性肥料' },
] as const;

/**
 * 无机肥料中类选项（仅大类为 inorganic 时使用）
 * 其余大类没有中类
 */
export const FERTILIZER_SUB_TYPE_OPTIONS = [
  { value: 'macro', label: '大量元素' },
  { value: 'medium', label: '中量元素' },
  { value: 'trace', label: '微量元素' },
  { value: 'compound', label: '复合肥料' },
] as const;

/** 只有无机肥料需要选择中类 */
export const FERTILIZER_TYPE_WITH_SUB = 'inorganic' as const;

/** 库存单位选项（覆盖液体/颗粒/块状/容器等形态） */
export const STOCK_UNIT_OPTIONS = [
  { value: 'kg', label: 'kg（千克）' },
  { value: 'g', label: 'g（克）' },
  { value: 't', label: 't（吨）' },
  { value: 'L', label: 'L（升）' },
  { value: 'mL', label: 'mL（毫升）' },
  { value: '袋', label: '袋' },
  { value: '包', label: '包' },
  { value: '桶', label: '桶' },
  { value: '瓶', label: '瓶' },
  { value: '块', label: '块' },
] as const;

/** 施肥时期选项（可多选） */
export const APPLICATION_TIMING_OPTIONS = [
  { value: 'base', label: '底肥' },
  { value: 'dressing', label: '追肥' },
  { value: 'foliar', label: '叶面肥' },
] as const;

/** 施肥时期 Badge 配色（2026-08-15 从 Detail/StockIn 两弹窗重复定义中提取） */
export const TIMING_BADGE_OPTIONS = [
  { value: 'base', label: '底肥', bg: 'bg-amber-100', text: 'text-amber-700' },
  { value: 'dressing', label: '追肥', bg: 'bg-green-100', text: 'text-green-700' },
  { value: 'foliar', label: '叶面肥', bg: 'bg-blue-100', text: 'text-blue-700' },
] as const;

/** Tab 分类类型（4 大类） */
export type FertilizerType = typeof FERTILIZER_TYPE_OPTIONS[number]['value'];

/** 无机肥料中类类型 */
export type FertilizerSubType = typeof FERTILIZER_SUB_TYPE_OPTIONS[number]['value'];

/** 大类 + 中类的中文显示（列表/详情/导出共用） */
export function getFertilizerTypeLabel(type?: string | null, subType?: string | null): string {
  if (!type) return '-';
  const typeLabel = FERTILIZER_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;
  if (type !== FERTILIZER_TYPE_WITH_SUB || !subType) return typeLabel;
  const subLabel = FERTILIZER_SUB_TYPE_OPTIONS.find((o) => o.value === subType)?.label || subType;
  return `${typeLabel} · ${subLabel}`;
}
