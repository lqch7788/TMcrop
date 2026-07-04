/**
 * 2026-07-03 v3：RecordModal 共享常量
 * - 操作类型按繁殖模式分类
 * - 世代选项（27 个，覆盖有性+无性）
 * - 繁殖方式 + 目标性状
 */

import type { BreedingOperationType, PropagationMethod } from '@/services/apiPlantingSubRecordService'

// ============ 操作类型分类 ============

export const SEXUAL_OPERATION_TYPES: BreedingOperationType[] = [
  'cross', 'self', 'backcross', 'selection', 'marker', 'other',
]

/**
 * @deprecated 2026-07-03 v5：无性繁殖（组培/扦插/嫁接/压条/分株）已迁移至育苗模块
 * 保留此数组用于历史记录展示和导出，前端 UI 不再创建新的无性繁殖记录
 */
export const ASEXUAL_OPERATION_TYPES: BreedingOperationType[] = [
  'clonal', 'cutting', 'grafting', 'layering', 'tissue', 'division',
]

/** 活跃的操作类型（仅有性，UI 使用） */
export const ACTIVE_OPERATION_TYPES: BreedingOperationType[] = [...SEXUAL_OPERATION_TYPES]

/**
 * @deprecated 保留用于历史记录展示，新记录不再包含无性类型
 */
export const OPERATION_TYPES: BreedingOperationType[] = [
  ...SEXUAL_OPERATION_TYPES,
  ...ASEXUAL_OPERATION_TYPES,
]

export const OPERATION_TYPE_LABELS: Record<BreedingOperationType, string> = {
  // 有性
  cross: '杂交',
  self: '自交',
  selection: '选育',
  backcross: '回交',
  marker: '标记',
  other: '其他',
  // 无性
  clonal: '无性选育',
  cutting: '扦插',
  grafting: '嫁接',
  layering: '压条',
  tissue: '组培',
  division: '分株',
}

// ============ 繁殖方式（无性专用）============
export const PROPAGATION_METHOD_LABELS: Record<PropagationMethod, string> = {
  cutting: '扦插',
  grafting: '嫁接',
  layering: '压条',
  tissue_culture: '组培',
  division: '分株',
  bulb: '球茎',
  tuber: '块茎',
  runner: '匍匐茎',
}

// ============ 目标性状（与后端 TARGET_TRAIT_VALUES 对齐）============
export const TARGET_TRAIT_OPTIONS = ['抗病', '优质', '早熟', '丰产', '抗逆', '雄性不育', '其他'] as const

// ============ 世代选项 ============

export interface GenerationOption {
  value: string
  label: string
  group: string
}

export const GENERATION_OPTIONS: GenerationOption[] = [
  // 亲本
  { value: 'P', label: 'P — 亲本（Parent）', group: '亲本世代' },
  // 杂交世代
  { value: 'F1', label: 'F1 — 子一代（杂交种）', group: '杂交世代' },
  { value: 'F2', label: 'F2 — 子二代', group: '杂交世代' },
  { value: 'F3', label: 'F3 — 子三代', group: '杂交世代' },
  { value: 'F4', label: 'F4 — 子四代', group: '杂交世代' },
  { value: 'F5', label: 'F5 — 子五代', group: '杂交世代' },
  { value: 'F6', label: 'F6 — 子六代', group: '杂交世代' },
  { value: 'F7', label: 'F7 — 子七代', group: '杂交世代' },
  { value: 'F8', label: 'F8 — 子八代', group: '杂交世代' },
  // 回交世代
  { value: 'BC1', label: 'BC1 — 回交一代', group: '回交世代' },
  { value: 'BC2', label: 'BC2 — 回交二代', group: '回交世代' },
  { value: 'BC3', label: 'BC3 — 回交三代', group: '回交世代' },
  { value: 'BC4', label: 'BC4 — 回交四代', group: '回交世代' },
  // 自交世代
  { value: 'S1', label: 'S1 — 自交一代', group: '自交世代' },
  { value: 'S2', label: 'S2 — 自交二代', group: '自交世代' },
  { value: 'S3', label: 'S3 — 自交三代', group: '自交世代' },
  { value: 'S4', label: 'S4 — 自交四代', group: '自交世代' },
  { value: 'S5', label: 'S5 — 自交五代', group: '自交世代' },
  { value: 'S6', label: 'S6 — 自交六代', group: '自交世代' },
  // 双单倍体
  { value: 'DH', label: 'DH — 双单倍体（Doubled Haploid）', group: '特殊世代' },
  // 种子生产级别
  { value: '原原种', label: '原原种（Breeder Seed / Pre-basic）', group: '种子生产级别' },
  { value: '原种', label: '原种（Basic Seed / Foundation）', group: '种子生产级别' },
  { value: '良种', label: '良种（Certified Seed）', group: '种子生产级别' },
  { value: '商品种', label: '商品种（Commercial Seed）', group: '种子生产级别' },
  // 无性世代
  { value: 'G0', label: 'G0 — 原种母株（Founder）', group: '无性世代' },
  { value: 'G1', label: 'G1 — 一级扩繁', group: '无性世代' },
  { value: 'G2', label: 'G2 — 二级扩繁', group: '无性世代' },
  { value: 'G3', label: 'G3 — 三级扩繁', group: '无性世代' },
  { value: 'G4', label: 'G4 — 四级扩繁', group: '无性世代' },
  { value: 'G5', label: 'G5 — 五级扩繁', group: '无性世代' },
  { value: 'G6', label: 'G6 — 六级扩繁', group: '无性世代' },
  { value: 'G7', label: 'G7 — 七级扩繁', group: '无性世代' },
  { value: 'G8', label: 'G8 — 八级扩繁', group: '无性世代' },
  { value: 'G9', label: 'G9 — 九级扩繁', group: '无性世代' },
  { value: 'G10', label: 'G10 — 十级扩繁', group: '无性世代' },
]

// ============ 工具：颜色阈值 ============

/**
 * 根据比率返回颜色 class
 * - sexual 结实率：≥ 50% 优良，20-50% 一般，< 20% 偏低
 * - asexual 繁殖系数：≥ 80% 优良，50-80% 一般，< 50% 偏低
 */
export function getRateColor(rate: number, type: 'sexual' | 'asexual'): string {
  const thresholds = type === 'asexual' ? [80, 50] : [50, 20]
  if (rate >= thresholds[0]) return 'text-emerald-700'
  if (rate >= thresholds[1]) return 'text-amber-600'
  return 'text-red-600'
}
