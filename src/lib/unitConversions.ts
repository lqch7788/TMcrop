/**
 * 单位换算工具（2026-07-05）
 *
 * 背景：施肥记录的 quantity 默认存 kg（基准单位），但用户输入时可任选单位（克/千克/毫升/升 等）。
 * 之前的实现直接比 number 大小，导致"1000 克 > 100 kg 库存"误报。
 *
 * 策略：前端用户输入时不做强制转换，但所有比较/提交都用 BASE_UNIT 算出的实际值。
 * - 重量统一为 kg（base = 'kg'）
 * - 体积统一为 L（base = 'L'）
 * - 不可换算的单位（包/袋/株/颗）返回 null，提示用户"无法自动校验库存"
 *
 * 数据库约定：
 * - quantity 字段永远是数字 + base 单位（kg 或 L）
 * - unit 字段是字符串，仅用于显示（不参与计算）
 */

/** 基准单位枚举 */
export type UnitCategory = 'weight' | 'volume' | 'count' | 'unknown';

/** 单位 → 基准单位换算系数（基准单位系数=1） */
const UNIT_TO_BASE_FACTOR: Record<string, { category: UnitCategory; factor: number }> = {
  // 重量类（基准 kg）
  克: { category: 'weight', factor: 0.001 },
  g: { category: 'weight', factor: 0.001 },
  千克: { category: 'weight', factor: 1 },
  公斤: { category: 'weight', factor: 1 },
  kg: { category: 'weight', factor: 1 },
  担: { category: 'weight', factor: 50 },         // 1 担 = 50 kg
  吨: { category: 'weight', factor: 1000 },
  t: { category: 'weight', factor: 1000 },
  // 体积类（基准 L）
  毫升: { category: 'volume', factor: 0.001 },
  ml: { category: 'volume', factor: 0.001 },
  升: { category: 'volume', factor: 1 },
  L: { category: 'volume', factor: 1 },
  // 计数类（不可自动换算）
  包: { category: 'count', factor: 0 },
  袋: { category: 'count', factor: 0 },
  株: { category: 'count', factor: 0 },
  颗: { category: 'count', factor: 0 },
  粒: { category: 'count', factor: 0 },
  桶: { category: 'count', factor: 0 },
};

/** 单位显示用的友好名称（用于"换算预览"展示） */
const BASE_UNIT_LABEL: Record<UnitCategory, string> = {
  weight: 'kg',
  volume: 'L',
  count: '',
  unknown: '',
};

/**
 * 单位换算为基准单位
 * @param quantity 用户输入的数量
 * @param unit 用户选择的单位
 * @returns { baseQuantity, baseUnit, category } | null（不可换算单位返回 null）
 */
export function toBaseUnit(
  quantity: number,
  unit: string,
): { baseQuantity: number; baseUnit: string; category: UnitCategory } | null {
  if (!quantity || quantity <= 0) return null;
  const trimmed = (unit || '').trim();
  if (!trimmed) return null;
  // 精确匹配（中文/英文都不区分大小写）
  const lookup = UNIT_TO_BASE_FACTOR[trimmed] || UNIT_TO_BASE_FACTOR[trimmed.toLowerCase()];
  if (!lookup) return null;
  // 不可换算的单位（包/袋/株/颗）
  if (lookup.category === 'count') return null;
  return {
    baseQuantity: quantity * lookup.factor,
    baseUnit: BASE_UNIT_LABEL[lookup.category],
    category: lookup.category,
  };
}

/**
 * 判断单位是否可以自动换算（用于 UI 警告）
 */
export function isConvertibleUnit(unit: string): boolean {
  if (!unit) return false;
  const trimmed = unit.trim();
  const lookup = UNIT_TO_BASE_FACTOR[trimmed] || UNIT_TO_BASE_FACTOR[trimmed.toLowerCase()];
  return !!lookup && lookup.category !== 'count';
}

/**
 * 获取单位所属类别（用于显示）
 */
export function getUnitCategory(unit: string): UnitCategory {
  if (!unit) return 'unknown';
  const trimmed = unit.trim();
  const lookup = UNIT_TO_BASE_FACTOR[trimmed] || UNIT_TO_BASE_FACTOR[trimmed.toLowerCase()];
  return lookup?.category || 'unknown';
}