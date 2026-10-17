/**
 * 单位口径判断（后端）
 *
 * ⚠️ 前端孪生实现：src/constants/units.ts（normalizeUnit / isSameUnitDimension）
 *    两处必须同步修改，否则前端提示与后端校验会不一致。
 *
 * 业务背景（2026-10-17）：
 *   种源单位可能是 千克/克/粒/袋/株…，育苗单位默认「株」。
 *   旧实现无论单位是否一致都按育苗初始数量扣减种源剩余量
 *   （例：22 千克种源被扣 10「株」，剩余变 12 千克），导致库存语义错误。
 *   现规则：单位同口径才自动扣减；不同口径必须由客户端显式提交种源消耗量（种源单位）。
 */

/** 同义单位归一化：写法不同但口径相同的单位映射到统一值 */
const UNIT_ALIASES: Record<string, string> = {
  '公斤': '千克',
  kg: '千克',
  KG: '千克',
  g: '克',
  G: '克',
  ml: '毫升',
  mL: '毫升',
  ML: '毫升',
  l: '升',
  L: '升',
  '棵': '株',
  '苗': '株',
  '颗': '粒',
};

/** 单位归一化（空值返回空串） */
export function normalizeUnit(unit?: string | null): string {
  const u = String(unit ?? '').trim();
  if (!u) return '';
  return UNIT_ALIASES[u] || u;
}

/**
 * 种源单位与育苗单位是否同口径
 * - true：可直接按数量 1:1 扣减
 * - false：不可换算，必须显式提供种源消耗量
 * - 缺失单位：返回 true（兼容历史数据）
 */
export function isSameUnitDimension(sourceUnit?: string | null, seedlingUnit?: string | null): boolean {
  const a = normalizeUnit(sourceUnit);
  const b = normalizeUnit(seedlingUnit);
  if (!a || !b) return true;
  return a === b;
}
