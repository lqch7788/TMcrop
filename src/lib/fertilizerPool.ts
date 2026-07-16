/**
 * 肥料池（Fertilization Pool）反序列化工具（2026-07-16 L-1 抽取）
 *
 * 历史：FertilizerTable.tsx 与 FertilizerDetailModal.tsx 各有一份独立的 parsePool 实现
 *       逻辑几乎一致。EditModal/AddModal 也有更复杂的反序列化（带去重逻辑）
 *
 * 提取：本文件提供「池 JSON → 结构化行」的最简公共实现
 *       类型断言性反序列化（带去重/Spec 关联）由各组件自处理
 */

/** 池行结构（最小可用集；具体业务字段由消费方决定） */
export interface FertilizationPoolRow {
  type?: string;
  id?: string;
  code?: string;
  cropName?: string;
  area?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  [key: string]: unknown;
}

/**
 * 解析池 JSON 字符串为行数组
 *
 * 失败兜底（修 silent failure）：
 * - 输入为空/null/undefined → 返回 []
 * - JSON.parse 失败 → console.warn + 返回 []
 * - 反序列化结果不是数组 → 返回 []
 *
 * @param json 来自 record.fertilizationPool 的 JSON 字符串
 * @returns 行数组（失败时为 []）
 */
export function parseFertilizationPool(json: string | null | undefined): FertilizationPoolRow[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is FertilizationPoolRow =>
      row != null && typeof row === 'object'
    );
  } catch (e) {
    // 2026-07-16：池损坏时给日志（不再完全静默）
    console.warn('[fertilizerPool] 池 JSON 解析失败:', e);
    return [];
  }
}
