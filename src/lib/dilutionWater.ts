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

/** 从 pool 行的 dilutionRatio 字符串计算用水量
 * 2026-07-25 修复：放宽正则，支持多种用户输入格式
 *   - "1:500" / "1/500" / "1：500"（中英文冒号） → 500
 *   - "1:500倍" / "1:500 倍" / "1:500X"（带单位/空格）→ 500
 *   - "500"（纯数字，视为 1:500）→ 500
 *   - "dry" / "" → null（不计算）
 */
export function calcWaterFromPoolRow(row: {
  quantity?: number;
  unit?: string;
  dilutionRatio?: string;
}): { amount: number; unit: string } | null {
  const dr = (row.dilutionRatio || '').trim();
  if (!dr || dr.toLowerCase() === 'dry') return null;
  // 2026-07-25 放宽：支持 "1:N" / "1/N" / "1：N" + 可选 "倍" 后缀
  //   模式 1：标准 "1:N"（含中文/英文/斜杠分隔符）
  let m = dr.match(/^1\s*[:/：]\s*(\d+(?:\.\d+)?)\s*(?:倍|倍液)?$/);
  // 模式 2：纯数字 "N"（视为 1:N）
  if (!m) m = dr.match(/^(\d+(?:\.\d+)?)\s*(?:倍|倍液)?$/);
  if (!m) return null;
  const dilution = parseFloat(m[1]);
  if (!dilution || dilution <= 0) return null;
  // 用水量为 0 时也不计算
  const qty = Number(row.quantity) || 0;
  if (qty <= 0) return null;

  const base = toBaseUnit(qty, row.unit ?? 'kg');
  const waterML = base * dilution;
  const waterL = waterML / 1000;

  return formatWaterL(waterL);
}
