/**
 * 2026-07-03 v4：留种记录常量 + 校验器
 * - 保存模式分类（种子保存 / 营养体保存）
 * - 采收部位 13 种（含 6 个无性器官）
 * - 用途/去向、处理方式、种子处理、成熟度、规格、检疫、休眠状态 各枚举
 * - validateSeedSavingForm 前端校验
 */

import type { SeedSavingPart } from '@/services/apiPlantingSubRecordService'

// ============ 模式分类 ============
export const VEGETATIVE_HARVEST_PARTS: SeedSavingPart[] = ['tuber', 'bulb', 'corm', 'rhizome', 'cutting', 'stolon', 'root', 'stem', 'leaf']
export const SEED_HARVEST_PARTS: SeedSavingPart[] = ['seed', 'fruit']

// ============ 采收部位文案 ============
export const HARVEST_PART_LABELS: Record<SeedSavingPart, string> = {
  // 有性
  fruit: '果实',
  seed: '种子',
  whole_plant: '全株',
  // 无性器官（v4 新增）
  tuber: '块茎（马铃薯/甘薯/山药）',
  bulb: '鳞茎（大蒜/洋葱/百合）',
  corm: '球茎（芋头/荸荠/唐菖蒲）',
  rhizome: '根茎（生姜/莲藕/鸢尾）',
  cutting: '插穗（葡萄/甘蔗/月季）',
  stolon: '匍匐茎（草莓/薄荷）',
  // 原有
  root: '根',
  stem: '茎',
  leaf: '叶',
  other: '其他',
}

// ============ 用途/去向 ============
export const PURPOSE_OPTIONS = [
  { value: 'direct_planting', label: '直接播种/定植' },
  { value: 'cold_storage', label: '入库冷藏' },
  { value: 'distribution', label: '分发/交换' },
  { value: 'sale', label: '销售' },
  { value: 'germplasm_bank', label: '种质保存' },
  { value: 'propagation', label: '继续扩繁' },
  { value: 'other', label: '其他' },
]

// ============ 处理方式 ============
export const PROCESSING_OPTIONS = [
  { value: 'air_dry', label: '晾晒' },
  { value: 'oven_dry', label: '烘干' },
  { value: 'cleaning', label: '清选/筛选' },
  { value: 'threshing', label: '脱粒' },
  { value: 'disinfection', label: '消毒' },
  { value: 'sand_storage', label: '沙藏' },
  { value: 'cold_treatment', label: '低温处理' },
  { value: 'sprouting', label: '催芽' },
  { value: 'none', label: '无处理' },
  { value: 'other', label: '其他' },
]

// ============ 种子处理方式 ============
export const SEED_TREATMENT_OPTIONS = [
  { value: 'none', label: '无处理' },
  { value: 'coating', label: '包衣' },
  { value: 'priming', label: '引发处理' },
  { value: 'stratification', label: '层积处理' },
  { value: 'scarification', label: '破休眠/破皮' },
  { value: 'fungicide', label: '杀菌处理' },
  { value: 'other', label: '其他' },
]

// ============ 成熟度 ============
export const MATURITY_OPTIONS = [
  { value: 'green', label: '绿熟期' },
  { value: 'breaker', label: '转色期' },
  { value: 'ripe', label: '完熟期' },
  { value: 'overripe', label: '过熟期' },
]

// ============ 规格等级 ============
export const SIZE_GRADE_OPTIONS = [
  { value: 'large', label: '大（一等）' },
  { value: 'medium', label: '中（二等）' },
  { value: 'small', label: '小（三等）' },
]

// ============ 检疫状态 ============
export const HEALTH_STATUS_OPTIONS = [
  { value: 'healthy', label: '健康（无病斑/虫害）' },
  { value: 'suspicious', label: '可疑（需隔离观察）' },
  { value: 'diseased', label: '带病（已标记，建议销毁）' },
]

// ============ 休眠状态 ============
export const DORMANCY_OPTIONS = [
  { value: 'dormant', label: '休眠中' },
  { value: 'breaking', label: '打破休眠' },
  { value: 'sprouted', label: '已萌芽' },
]

// ============ 容器类型 ============
export const CONTAINER_OPTIONS = [
  { value: 'paper_bag', label: '纸袋' },
  { value: 'cloth_bag', label: '布袋' },
  { value: 'sealed_jar', label: '密封罐' },
  { value: 'mesh_bag', label: '网袋' },
  { value: 'sand_pit', label: '沙藏坑' },
  { value: 'cold_room', label: '冷库/冰箱' },
  { value: 'crate', label: '木箱/塑料筐' },
  { value: 'other', label: '其他' },
]

// ============ 工具：颜色阈值 ============
export function getSeedSavingRateColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-700'
  if (rate >= 50) return 'text-amber-600'
  return 'text-red-600'
}

// ============ 扩展 form 状态 ============
import type { SeedSavingRecordInput } from '@/services/apiPlantingSubRecordService'
export type SeedSavingFormState = SeedSavingRecordInput & { preservationMode?: 'seed' | 'vegetative' }

// ============ Label lookup maps（历史表/导出中文显示用）============

export const PURPOSE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  PURPOSE_OPTIONS.map((o) => [o.value, o.label])
)
export const PROCESSING_LABEL_MAP: Record<string, string> = Object.fromEntries(
  PROCESSING_OPTIONS.map((o) => [o.value, o.label])
)
export const SEED_TREATMENT_LABEL_MAP: Record<string, string> = Object.fromEntries(
  SEED_TREATMENT_OPTIONS.map((o) => [o.value, o.label])
)
export const MATURITY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  MATURITY_OPTIONS.map((o) => [o.value, o.label])
)
export const SIZE_GRADE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  SIZE_GRADE_OPTIONS.map((o) => [o.value, o.label])
)
export const HEALTH_STATUS_LABEL_MAP: Record<string, string> = Object.fromEntries(
  HEALTH_STATUS_OPTIONS.map((o) => [o.value, o.label])
)
export const DORMANCY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  DORMANCY_OPTIONS.map((o) => [o.value, o.label])
)
export const CONTAINER_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CONTAINER_OPTIONS.map((o) => [o.value, o.label])
)

// ============ 校验 ============
export function validateSeedSavingForm(form: SeedSavingFormState): string | null {
  if (!form.recordDate) return '请选择记录日期'
  if (!form.plantMarker) return '请输入留种株号'
  return null
}
