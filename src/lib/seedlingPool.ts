/**
 * 育苗双模式数量池口径（2026-10-17 单池化改造）
 *
 * 业务背景：
 * - **1:1 模式（one_to_one，种子/嫁接/单种球）**：一对一育苗，没有"母株繁殖出小苗"的过程，
 *   苗床上的苗**既是母株也是小苗** → 只有一个池（母株池）。
 *   历史遗留：旧实现仍把损耗写进"小苗损耗"字段，且产出池（expanded_plant_count）恒为 0，
 *   导致"小苗损耗"扣的是一个永远为 0 的空池，任何损耗都录不进去（用户报障根因）。
 * - **1:多 模式（one_to_many，无性繁殖）**：母株 + 匍匐茎/组培/扦插产出小苗，两个池各自独立。
 *
 * 本模块是该口径的**前端单一真理源**（列表 / 导出 / 每日记录 / 入库软校验共用）。
 * ⚠️ 后端孪生实现：server/src/services/seedlingDailyChange.ts（两处公式必须同步改）
 */
import type { Seedling } from '../types/crop';

/** 是否为 1:1 单池模式 */
export function isOneToOneMode(record: Pick<Seedling, 'propagationMode'>): boolean {
  return record.propagationMode === 'one_to_one';
}

/**
 * 母株存活数（真存活，不再是建档时的原始母株数）
 *
 * - 1:多：母株 + 补苗 − 母株损耗
 * - 1:1 ：母株 + 补苗 − 母株损耗 − 小苗损耗（小苗损耗为历史数据口径，同样扣母株池）
 */
export function getMotherAliveCount(
  record: Pick<Seedling, 'propagationMode' | 'motherPlantCount' | 'replantCount' | 'motherLossCount' | 'seedlingLossCount'>,
): number {
  return Math.max(0,
    (record.motherPlantCount || 0)
    + (record.replantCount || 0)
    - (record.motherLossCount || 0)
    - (isOneToOneMode(record) ? (record.seedlingLossCount || 0) : 0),
  );
}

/**
 * 可损耗上限（每日记录里母株损耗的校验上限）
 * - 1:1：母株池扣除已出圃入库量（已入库的苗不在了，不能再记损耗）
 * - 1:多：母株不参与出圃入库，不加此项
 */
export function getMotherLossCapacity(
  record: Pick<Seedling, 'propagationMode' | 'motherPlantCount' | 'replantCount' | 'motherLossCount' | 'seedlingLossCount' | 'harvestStockedCount'>,
): number {
  const alive = getMotherAliveCount(record);
  return Math.max(0, alive - (isOneToOneMode(record) ? (record.harvestStockedCount || 0) : 0));
}

/**
 * 小苗剩余数量（列表"小苗剩余数量"列 / 导出同名列 / 出圃入库可入库量）
 *
 * - 1:多：产出 − 小苗损耗 − 已入库
 * - 1:1 ：镜像母株池（存活 − 已入库）—— 1:1 没有独立产出池
 */
export function getSeedlingRemainingCount(
  record: Pick<Seedling, 'propagationMode' | 'motherPlantCount' | 'replantCount' | 'motherLossCount' | 'seedlingLossCount' | 'expandedPlantCount' | 'harvestStockedCount'>,
): number {
  if (isOneToOneMode(record)) {
    return getMotherLossCapacity(record);
  }
  return Math.max(0,
    (record.expandedPlantCount || 0)
    - (record.seedlingLossCount || 0)
    - (record.harvestStockedCount || 0),
  );
}

/**
 * 损耗累计（列表「母株/植株累计损耗」列的展示口径）
 *
 * - 1:多：母株损耗（小苗损耗在"小苗累计损耗"列单列）
 * - 1:1 ：母株损耗 + 历史小苗损耗 —— 单池化后两者都是"植株损耗"，合并成一列，
 *         并使「存活 = 母株 + 补苗 − 损耗累计」在两种模式下成为同一个公式
 */
export function getMotherLossDisplayCount(
  record: Pick<Seedling, 'propagationMode' | 'motherLossCount' | 'seedlingLossCount'>,
): number {
  const motherLoss = record.motherLossCount || 0;
  return isOneToOneMode(record) ? motherLoss + (record.seedlingLossCount || 0) : motherLoss;
}

/** 千分位（算式说明用） */
function fmt(n: number): string {
  return n.toLocaleString('zh-CN');
}

/**
 * 「母株/植株存活数」单元格悬浮算式（带真实数字，用户可当场对账）
 * 例：1:1：5 + 2,500 − 3 = 2,502
 */
export function getMotherAliveFormula(
  record: Pick<Seedling, 'propagationMode' | 'motherPlantCount' | 'replantCount' | 'motherLossCount' | 'seedlingLossCount'>,
): string {
  const mode = isOneToOneMode(record) ? '1:1' : '1:多';
  const mother = record.motherPlantCount || 0;
  const replant = record.replantCount || 0;
  const loss = getMotherLossDisplayCount(record);
  const alive = getMotherAliveCount(record);
  const suffix = isOneToOneMode(record) ? '（苗即母株）' : '';
  return `${mode}${suffix}：${fmt(mother)} + ${fmt(replant)} − ${fmt(loss)} = ${fmt(alive)}`;
}

/** 「母株/植株累计损耗」单元格悬浮说明 */
export function getMotherLossFormula(
  record: Pick<Seedling, 'propagationMode' | 'motherLossCount' | 'seedlingLossCount'>,
): string {
  const loss = getMotherLossDisplayCount(record);
  if (isOneToOneMode(record)) {
    const motherLoss = record.motherLossCount || 0;
    const legacy = record.seedlingLossCount || 0;
    return `1:1（苗即母株）：母株损耗 ${fmt(motherLoss)} + 历史小苗损耗 ${fmt(legacy)} = ${fmt(loss)}`;
  }
  return `1:多：母株死亡/减少累计 ${fmt(loss)}`;
}
