/**
 * 浇水记录用水量单位常量（2026-07-27 审核修复 C-3）
 *
 * 历史问题：
 * - 原 WaterAddModal / WaterEditModal 写 'm3'，dilutionWater 工具输出 'm³'
 * - 同一字段两种字面量，跨模块数据失真
 *
 * 统一改为 'm³'（与稀释公式生成的格式一致）
 * 提供 normalizeUnit 写入前归一化，向后兼容老的 'm3'
 */
export const WATER_UNITS = ['L', 'ml', 'm³', 'kg'] as const;

export type WaterUnit = typeof WATER_UNITS[number];

/**
 * 归一化单位字面量
 * - 'm3' → 'm³'
 * - 其他原样返回
 * - 输入为空时返回 'L'（默认值）
 */
export function normalizeWaterUnit(unit: string | null | undefined): WaterUnit {
  if (!unit) return 'L';
  const trimmed = String(unit).trim();
  if (trimmed === 'm3') return 'm³';
  if (WATER_UNITS.includes(trimmed as WaterUnit)) return trimmed as WaterUnit;
  return 'L';
}

/**
 * 单位分类（2026-07-27 审核修复 H-13）
 * - 'volume': L / ml / m³
 * - 'mass': kg
 * 用于避免不同物理量单位直接相加（L + kg = 物理无意义）
 */
export function getWaterUnitCategory(unit: string | null | undefined): 'volume' | 'mass' | 'unknown' {
  const u = normalizeWaterUnit(unit);
  if (u === 'L' || u === 'ml' || u === 'm³') return 'volume';
  if (u === 'kg') return 'mass';
  return 'unknown';
}