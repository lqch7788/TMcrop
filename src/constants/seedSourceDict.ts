/**
 * 种源管理 UI 字典
 * 任务 12: Phase 3 UI 流程
 *
 * - SEED_SOURCE_CATEGORIES: UI 4 类来源分组 (purchase/breeding/retain/asexual)
 * - SOURCE_ORIGIN_TO_CATEGORY: 9 枚举 source_origin → 4 类 UI 分组映射
 * - SOURCE_ORIGINS: 9 枚举 source_origin 中文标签
 * - SOURCE_TYPES: 9 枚举 source_type 中文标签
 */
export const SEED_SOURCE_CATEGORIES = [
  { value: 'purchase', label: '外购', color: 'blue' },
  { value: 'breeding', label: '育种', color: 'green' },
  { value: 'retain', label: '留种', color: 'amber' },
  { value: 'asexual', label: '无性繁殖', color: 'purple' },
] as const

export type SeedSourceCategory = typeof SEED_SOURCE_CATEGORIES[number]['value']

/**
 * 9 种 source_origin 映射到 4 类 UI 分组
 */
export const SOURCE_ORIGIN_TO_CATEGORY: Record<string, SeedSourceCategory> = {
  external_purchase: 'purchase',
  direct_seedling: 'purchase',
  external_harvest: 'purchase',
  tissue_culture: 'breeding',
  grafting: 'breeding',
  internal_seed: 'retain',
  seedling_split: 'asexual',
  cutting: 'asexual',
  direct_planting: 'purchase',
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
