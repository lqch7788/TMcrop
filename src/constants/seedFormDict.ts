/**
 * 2026-07-07：种源/育苗/采收形态单一字典
 *
 * 目标：解决项目内"形态字段"4 个并行字典 + 弹窗硬编码字面量造成的不一致。
 *
 * 设计原则：
 * 1. 每个字典条目 value/label 都用中文（前端显示 + db 存储统一）
 * 2. 不分"A类/B类"抽象组 — 全部列清晰、不隐藏层级
 * 3. 4 个独立字典对应 4 个业务语义字段，互不混淆
 *
 * 字段映射：
 *   - SEED_FORM_OPTIONS       → seed_sources.seed_form（种源入库物理形态）
 *   - SEED_TYPE_OPTIONS       → seed_sources.source_type（种源物质类型）
 *   - SEEDLING_FORM_OPTIONS   → seedlings.seedling_form（种苗状态/容器）
 *   - HARVEST_FORM_OPTIONS    → harvest_records.harvest_form（采收产物形态）
 *
 * 历史：
 *   - cropConstants.ts  SOURCE_TYPE_MAP / SEEDLING_FORM_MAP / HARVEST_FORM_MAP（旧字典）保留
 *     但加 @deprecated 注释（与本字典并存）
 *   - seedSourceDict.ts  PROPAGATION_FORM_LABELS 保留备用
 */

import type { SourceType } from '../types/crop';

// ========== 种源入库物理形态（19 项 — 全列出不分抽象类）==========
// 用于：seed_sources.seed_form、SeedSourceInboundModal.propagationForm
// 含义：物料作为种源入库时的物理形态
export const SEED_FORM_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '种子', label: '种子' },
  { value: '种苗', label: '种苗' },
  { value: '实生苗', label: '实生苗' },
  { value: '扦插苗', label: '扦插苗' },
  { value: '嫁接苗', label: '嫁接苗' },
  { value: '组培苗', label: '组培苗' },
  { value: '分株苗', label: '分株苗' },
  { value: '种球', label: '种球' },
  { value: '球根', label: '球根' },
  { value: '块根', label: '块根' },
  { value: '块茎', label: '块茎' },
  { value: '鳞茎', label: '鳞茎' },
  { value: '穗条', label: '穗条' },
  { value: '枝条', label: '枝条' },
  { value: '叶片', label: '叶片' },
  { value: '花朵', label: '花朵' },
  { value: '果实', label: '果实' },
  { value: '整株', label: '整株' },
  { value: '其他', label: '其他' },
] as const;

// ========== 种源类型（物质分类 12 项 — 全列出）==========
// 用于：seed_sources.source_type、AddModal/EditModal.sourceType 下拉
// 含义：种源作为一种物质的分类小标签
export const SEED_TYPE_OPTIONS: ReadonlyArray<{ value: SourceType | string; label: string }> = [
  { value: 'seed', label: '种子' },
  { value: 'seedling', label: '种苗' },
  { value: 'cutting', label: '扦插苗' },
  { value: 'grafting', label: '嫁接苗' },
  { value: 'tissue_culture', label: '组培苗' },
  { value: 'split', label: '分株苗' },
  { value: 'bulb', label: '种球' },
  { value: 'spore', label: '孢子' },
  { value: 'mushroom', label: '菌种' },
  { value: 'tuber_root', label: '块根类' },
  { value: 'tuber_bulb', label: '球茎类' },
  { value: 'other', label: '其他' },
] as const;

// ========== 种苗状态（10 项 — 全列出）==========
// 用于：seedlings.seedling_form、Seedling AddModal 种苗状态
// 含义：种苗作为成品的容器/状态
export const SEEDLING_FORM_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '裸根苗', label: '裸根苗' },
  { value: '穴盘苗', label: '穴盘苗' },
  { value: '杯苗', label: '杯苗' },
  { value: '盆栽苗', label: '盆栽苗' },
  { value: '土球苗', label: '土球苗' },
  { value: '嫁接苗', label: '嫁接苗' },
  { value: '扦插苗', label: '扦插苗' },
  { value: '花朵', label: '花朵' },
  { value: '枝条', label: '枝条' },
  { value: '其他', label: '其他' },
] as const;

// ========== 采收形态（11 项 — 全列出）==========
// 用于：harvest_records.harvest_form、HarvestRecordModal.harvestForm 下拉
// 含义：采收下来的成品形态
export const HARVEST_FORM_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '整株', label: '整株' },
  { value: '花朵', label: '花朵' },
  { value: '果实', label: '果实' },
  { value: '种子', label: '种子' },
  { value: '叶片', label: '叶片' },
  { value: '根茎', label: '根茎' },
  { value: '茎秆', label: '茎秆' },
  { value: '块茎', label: '块茎' },
  { value: '球根', label: '球根' },
  { value: '枝条', label: '枝条' },
  { value: '其他', label: '其他' },
] as const;

/**
 * 给定种源形态字段值，返回其合法选项集合（用于校验或下拉渲染）
 * @param field 'seedForm' | 'seedType' | 'seedlingForm' | 'harvestForm'
 */
export function getFormDict(field: 'seedForm' | 'seedType' | 'seedlingForm' | 'harvestForm') {
  switch (field) {
    case 'seedForm': return SEED_FORM_OPTIONS;
    case 'seedType': return SEED_TYPE_OPTIONS;
    case 'seedlingForm': return SEEDLING_FORM_OPTIONS;
    case 'harvestForm': return HARVEST_FORM_OPTIONS;
  }
}
