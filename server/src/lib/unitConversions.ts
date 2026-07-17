/**
 * 单位换算工具（2026-07-05，2026-07-17 复制到 server）
 *
 * 背景：施肥记录的 quantity 默认存 kg（基准单位），但用户输入时可任选单位（克/千克/毫升/升 等）。
 * 之前的实现直接比 number 大小，导致"1000 克 > 100 kg 库存"误报。
 *
 * 策略：服务端在库存比较前自动换算到基准单位（kg/L），避免单位不一致误报。
 * - 重量统一为 kg（base = 'kg'）
 * - 体积统一为 L（base = 'L'）
 * - 不可换算的单位（包/袋/株/颗）跳过自动校验，提示用户"无法自动校验库存"
 *
 * 数据库约定：quantity 字段永远是数字 + base 单位（kg 或 L）。
 */

export type UnitCategory = 'weight' | 'volume' | 'count' | 'unknown';

const UNIT_TO_BASE_FACTOR: Record<string, { category: UnitCategory; factor: number }> = {
  克: { category: 'weight', factor: 0.001 },
  g: { category: 'weight', factor: 0.001 },
  千克: { category: 'weight', factor: 1 },
  公斤: { category: 'weight', factor: 1 },
  kg: { category: 'weight', factor: 1 },
  担: { category: 'weight', factor: 50 },
  吨: { category: 'weight', factor: 1000 },
  t: { category: 'weight', factor: 1000 },
  毫升: { category: 'volume', factor: 0.001 },
  ml: { category: 'volume', factor: 0.001 },
  升: { category: 'volume', factor: 1 },
  L: { category: 'volume', factor: 1 },
  包: { category: 'count', factor: 0 },
  袋: { category: 'count', factor: 0 },
  株: { category: 'count', factor: 0 },
  颗: { category: 'count', factor: 0 },
  粒: { category: 'count', factor: 0 },
  桶: { category: 'count', factor: 0 },
};

const BASE_UNIT_LABEL: Record<UnitCategory, string> = {
  weight: 'kg',
  volume: 'L',
  count: '',
  unknown: '',
};

/**
 * 单位换算为基准单位
 * @returns { baseQuantity, baseUnit, category } | null（不可换算单位返回 null）
 */
export function toBaseUnit(
  quantity: number,
  unit: string,
): { baseQuantity: number; baseUnit: string; category: UnitCategory } | null {
  if (!quantity || quantity <= 0) return null;
  const trimmed = (unit || '').trim();
  if (!trimmed) return null;
  const lookup = UNIT_TO_BASE_FACTOR[trimmed] || UNIT_TO_BASE_FACTOR[trimmed.toLowerCase()];
  if (!lookup) return null;
  if (lookup.category === 'count') return null;
  return {
    baseQuantity: quantity * lookup.factor,
    baseUnit: BASE_UNIT_LABEL[lookup.category],
    category: lookup.category,
  };
}

export function isConvertibleUnit(unit: string): boolean {
  if (!unit) return false;
  const trimmed = unit.trim();
  const lookup = UNIT_TO_BASE_FACTOR[trimmed] || UNIT_TO_BASE_FACTOR[trimmed.toLowerCase()];
  return !!lookup && lookup.category !== 'count';
}

export function getUnitCategory(unit: string): UnitCategory {
  if (!unit) return 'unknown';
  const trimmed = unit.trim();
  const lookup = UNIT_TO_BASE_FACTOR[trimmed] || UNIT_TO_BASE_FACTOR[trimmed.toLowerCase()];
  return lookup?.category || 'unknown';
}

/**
 * 2026-07-17：根据 spec 的库存单位计算需要扣减的 base 数量
 * - 输入 quantity + 单位 + spec.stockUnit → 转换为 spec 库存单位下的实际数值
 * - 若单位无法换算（count 类），返回 null（跳过自动校验）
 */
export function toSpecUnit(
  quantity: number,
  inputUnit: string,
  specUnit: string,
): { convertedQuantity: number; needsManualCheck: boolean; originalUnit: string; targetUnit: string } | null {
  if (!quantity || quantity <= 0) return null;
  // 单位相同：直接返回
  if ((inputUnit || '').trim().toLowerCase() === (specUnit || '').trim().toLowerCase()) {
    return { convertedQuantity: quantity, needsManualCheck: false, originalUnit: inputUnit, targetUnit: specUnit };
  }
  // 输入单位无法换算（包/袋/株/颗）：标记需要人工校验
  if (!isConvertibleUnit(inputUnit)) {
    return { convertedQuantity: quantity, needsManualCheck: true, originalUnit: inputUnit, targetUnit: specUnit };
  }
  // spec 库存单位无法换算：跳过
  if (!isConvertibleUnit(specUnit)) {
    return { convertedQuantity: quantity, needsManualCheck: true, originalUnit: inputUnit, targetUnit: specUnit };
  }
  // 双方转 base 后比较 + 转换（仅同 category 内转换）
  const inputBase = toBaseUnit(quantity, inputUnit);
  const inputBaseQty = inputBase ? inputBase.baseQuantity : quantity;
  // 计算 spec 单位到 base 的换算系数（specUnit 1 个 = ? 个 base）
  // 用 1 个 specUnit 转 base 来获取 factor（避免返回类型限制）
  const specBaseSample = toBaseUnit(1, specUnit);
  const inputBaseSample = toBaseUnit(1, inputUnit);
  if (!inputBase || !specBaseSample || !inputBaseSample) {
    return { convertedQuantity: quantity, needsManualCheck: true, originalUnit: inputUnit, targetUnit: specUnit };
  }
  if (inputBase.category !== specBaseSample.category) {
    // 重量 vs 体积 不兼容
    return { convertedQuantity: quantity, needsManualCheck: true, originalUnit: inputUnit, targetUnit: specUnit };
  }
  // 换算：inputBaseQty（基准单位数值）÷ specBaseSample.baseQuantity（1 个 specUnit = ? 个 base）
  // 例：inputBaseQty=500 (kg), specBaseSample.baseQuantity=1 (1kg=1 base) → 500/1=500 kg
  // 例：inputBaseQty=0.5 (kg), specBaseSample.baseQuantity=1000 (1t=1000kg) → 0.5/1000=0.0005 t
  const converted = inputBaseQty / specBaseSample.baseQuantity;
  return { convertedQuantity: converted, needsManualCheck: false, originalUnit: inputUnit, targetUnit: specUnit };
}