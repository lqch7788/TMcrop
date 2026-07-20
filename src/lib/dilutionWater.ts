/**
 * 稀释用水量计算工具（2026-07-21）
 *
 * 公式（2026-07-21 修正）：
 *   1. 肥料用量先转为基本单位：kg→g（×1000），L→ml（×1000）
 *   2. 水量(ml) = 基本单位量 × 稀释倍数
 *   3. 水量(L) = 水量(ml) / 1000
 *   4. ≥1000L 时显示为 m³，内部始终存 L（统一统计）
 */

/** 格式化稀释比例字符串 */
export function formatDilution(dilution: number | undefined, dilutionType: 'dilute' | 'dry'): string {
  if (dilutionType === 'dry' || !dilution || dilution <= 0) return 'dry';
  return `1:${dilution}`;
}

/** 肥料用量 → 基本单位量（固体→g，液体→ml） */
function toBaseUnit(amount: number, unit: string): number {
  if (unit === 'kg') return amount * 1000;   // kg → g
  if (unit === 'L') return amount * 1000;    // L → ml
  // g / ml 本身即是基本单位
  return amount;
}

/** 水量 L → 人类可读显示 */
function formatWaterL(liters: number): { amount: number; unit: string } {
  if (liters >= 1000) {
    return { amount: Math.round(liters / 10) / 100, unit: 'm³' };
  }
  return { amount: Math.round(liters * 100) / 100, unit: 'L' };
}

/** 计算稀释用水量（输出统一为 L） */
export function calculateDilutionWater(
  fertilizerQty: number,
  fertilizerUnit: string,
  dilution: number | undefined,
  dilutionType: 'dilute' | 'dry',
): { amount: number; unit: string } | null {
  if (dilutionType === 'dry' || !dilution || dilution <= 0) return null;
  if (!fertilizerQty || fertilizerQty <= 0) return null;

  const base = toBaseUnit(fertilizerQty, fertilizerUnit);
  const waterML = base * dilution;
  const waterL = waterML / 1000;

  return formatWaterL(waterL);
}

/** 从 pool 行的 dilutionRatio 字符串计算用水量 */
export function calcWaterFromPoolRow(row: {
  quantity?: number;
  unit?: string;
  dilutionRatio?: string;
}): { amount: number; unit: string } | null {
  const dr = row.dilutionRatio || '';
  if (!dr || dr === 'dry') return null;
  const match = dr.match(/^1:(\d+)$/);
  if (!match) return null;
  const dilution = parseInt(match[1], 10);
  if (!dilution || dilution <= 0) return null;

  const base = toBaseUnit(row.quantity ?? 0, row.unit ?? 'kg');
  const waterML = base * dilution;
  const waterL = waterML / 1000;

  return formatWaterL(waterL);
}
