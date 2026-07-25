/**
 * 肥料池（Fertilization Pool）反序列化工具（2026-07-16 L-1 抽取）
 *
 * 历史：FertilizerTable.tsx 与 FertilizerDetailModal.tsx 各有一份独立的 parsePool 实现
 *       逻辑几乎一致。EditModal/AddModal 也有更复杂的反序列化（带去重逻辑）
 *
 * 提取：本文件提供「池 JSON → 结构化行」的最简公共实现
 *       类型断言性反序列化（带去重/Spec 关联）由各组件自处理
 */

/** 池行结构（2026-07-25：补全所有写入字段，不再用 unknown 索引签名兜底） */
export interface FertilizationPoolRow {
  // 区域/作物关联
  type?: 'planting' | 'seedling';
  id?: string;
  code?: string;
  cropName?: string;   // 品种名（AddModal 写入时用 subVariety1Name || cropVariety || cropName）
  cropCode?: string;
  area?: string;
  // 肥料用量
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  dilutionRatio?: string;
  fertilizationMethod?: string;
  fertilizerName?: string;
  // Spec 快照（2026-07-12 重构后所有 spec 关联字段都从 pool 行取）
  specId?: string;
  specBrandName?: string;
  specUnitPrice?: number;
  specBatchNumber?: string;
  // 2026-07-25：稀释用水量（计算公式：肥料用量 × 稀释倍数；≥1000L 自动切 m³）
  // 写入时由 AddModal/EditModal 提交时计算并持久化，详情优先读取
  waterAmount?: number;
  waterUnit?: string;  // 'L' | 'm³'
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
