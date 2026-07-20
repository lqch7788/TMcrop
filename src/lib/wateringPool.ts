/**
 * 浇水池 JSON 解析工具
 * 2026-07-20：Phase 1 - 与 fertilizerPool 同模式
 */

/** 浇水池行结构（区域 × 用水明细） */
export interface WateringPoolRow {
  area?: string;
  wateringMethod?: string;
  waterAmount?: number;
  waterUnit?: string;
  // 稀释来源关联字段（仅 record_type = 'fertilizer_dilution' 时填充）
  sourceFertilizerName?: string;
  sourceDilutionRatio?: string;
  sourceFertilizerQuantity?: number;
  [key: string]: unknown;
}

/**
 * 解析浇水池 JSON 字符串为行数组
 *
 * 失败兜底：
 * - 输入为空/null/undefined/非字符串 → 返回 []
 * - JSON.parse 失败 → console.warn + 返回 []
 * - 反序列化结果不是数组 → 返回 []
 *
 * @param json 来自 record.waterPool 的 JSON 字符串
 * @returns 行数组（失败时为 []）
 */
export function parseWateringPool(json: string | null | undefined): WateringPoolRow[] {
  if (!json || typeof json !== 'string') return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is WateringPoolRow => row != null && typeof row === 'object');
  } catch (e) {
    console.warn('[wateringPool] JSON 解析失败:', e);
    return [];
  }
}