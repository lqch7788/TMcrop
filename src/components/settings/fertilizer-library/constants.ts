/**
 * 肥料库共享常量（2026-07-12）
 * 消除 AddFertilizerModal / EditFertilizerModal 中的重复定义
 */

/** 肥料类型选项（按化学性质分类） */
export const FERTILIZER_TYPE_OPTIONS = [
  { value: 'organic', label: '有机肥' },
  { value: 'inorganic', label: '无机肥' },
  { value: 'water_soluble', label: '水溶肥' },
  { value: 'compound', label: '复合肥' },
  { value: 'bio', label: '生物肥' },
  { value: 'slow_release', label: '缓释肥' },
  { value: 'trace', label: '微量元素肥' },
] as const;

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

/** Tab 分类类型 */
export type FertilizerType = 'organic' | 'inorganic' | 'water_soluble' | 'compound' | 'bio' | 'slow_release' | 'trace';
