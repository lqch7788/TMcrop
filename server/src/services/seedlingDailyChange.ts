/**
 * 育苗管理每日记录业务逻辑（2026-07-21 新建）
 *
 * 与 plantingDailyChange 的区别：
 * - 育苗有母株/小苗双池（mother_loss_count / seedling_loss_count）
 * - 育苗表字段不同（seedlings 表而非 plantings 表）
 */
import { getDatabase } from '../db';

/** 育苗每日变更数据 */
export interface SeedlingChangeData {
  motherLossChange?: number;
  seedlingLossChange?: number;
  expandedChange?: number;
  transplantedChange?: number;
  /** 2026-10-17：补苗（此前只存在 data JSON 里，主表 replant_count 从未累加） */
  replantChange?: number;
}

/** 取非负数（undefined/非法值 → 0） */
function toPositive(v: unknown): number {
  return Math.max(0, Number(v) || 0);
}

/**
 * 规范化（兼容历史字段名）
 *
 * 2026-10-17 修复：补齐旧字段名兜底。
 *   根因：记录明细的行内编辑（DailyRecordModal.handleSaveEdit）历史上只写旧字段名
 *   （survivalCountChange/lossCountChange/runnerIncreaseCount），而本函数只读新字段名
 *   → PUT 先撤销旧值成功、再应用新值变成 0，导致该记录的数量贡献被静默清零
 *   （实测：母株损耗 2 改成 4，主表反而变成 0）。
 *   前端已同步双写，此处兜底保证老数据与老客户端同样能正确归一化。
 * @param _propagationMode 保留兼容原调用方签名（新旧字段名映射与模式无关，当前未使用）
 */
export function normalizeSeedlingChange(raw: any, _propagationMode?: string): SeedlingChangeData {
  if (!raw || typeof raw !== 'object') {
    return { motherLossChange: 0, seedlingLossChange: 0, expandedChange: 0, transplantedChange: 0, replantChange: 0 };
  }
  return {
    motherLossChange: toPositive(raw.motherLossChange ?? raw.motherLoss ?? raw.survivalCountChange),
    seedlingLossChange: toPositive(raw.seedlingLossChange ?? raw.seedlingLoss ?? raw.lossCountChange),
    expandedChange: toPositive(raw.expandedChange ?? raw.expandedPlantChange ?? raw.runnerIncreaseCount),
    transplantedChange: toPositive(raw.transplantedChange ?? raw.transplantedCount),
    replantChange: toPositive(raw.replantChange ?? raw.replantCount),
  };
}

/** 校验每日记录变更是否合法 */
export function validateSeedlingDailyChange(
  seedlingId: string,
  changeData: SeedlingChangeData,
): string | null {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT propagation_mode, mother_plant_count, expanded_plant_count, mother_loss_count, seedling_loss_count, harvest_stocked_count, replant_count FROM seedlings WHERE id = ?',
  );
  stmt.bind([seedlingId]);
  let row: any = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  if (!row) return '育苗记录不存在';

  // 2026-10-17 单池化：1:1 模式苗床上的苗既是母株也是小苗（产出池 expanded 恒为 0），
  //   损耗只能扣母株池。历史上这里只有 1:多 口径，导致 1:1 的"小苗损耗"永远被拒。
  // ⚠️ 前端孪生口径：src/lib/seedlingPool.ts（两处公式必须同步改）
  const is11 = (row.propagation_mode || 'one_to_one') === 'one_to_one';
  const motherCount = Number(row.mother_plant_count || 0);
  const expandedCount = Number(row.expanded_plant_count || 0);
  const motherLoss = Number(row.mother_loss_count || 0);
  const seedlingLoss = Number(row.seedling_loss_count || 0);
  // 2026-08-14：小苗可用数扣除已入库量（与前端 DailyRecordModal 校验口径一致）
  const harvestStocked = Number(row.harvest_stocked_count || 0);
  const replantCount = Number(row.replant_count || 0);

  const ml = Math.max(0, Number(changeData.motherLossChange || 0));
  const sl = Math.max(0, Number(changeData.seedlingLossChange || 0));
  const ec = Math.max(0, Number(changeData.expandedChange || 0));
  const tc = Math.max(0, Number(changeData.transplantedChange || 0));

  if (is11) {
    // ── 1:1 单池：母株 + 补苗 − 母株损耗 − 历史小苗损耗 − 已入库 ──
    const availableMother11 = Math.max(0, motherCount + replantCount - motherLoss - seedlingLoss - harvestStocked);
    if (ml > availableMother11) {
      return `母株损耗 ${ml} 超过当前母株可损耗数量 ${availableMother11}（母株 ${motherCount} + 补苗 ${replantCount} - 损耗 ${motherLoss + seedlingLoss} - 已入库 ${harvestStocked}）`;
    }
    return null;   // 1:1 不再有小苗池校验（前端已把该字段隐藏）
  }

  // 2026-10-17：1:多 母株池与前端 seedlingPool 统一 —— 母株 + 补苗 − 母株损耗
  //   （旧口径用 expanded 参与母株池，与前端不一致；前端先拦截，故此处对齐不改变用户可见行为）
  const availableMother = Math.max(0, motherCount + replantCount - motherLoss);
  if (ml > availableMother) {
    return `母株损耗 ${ml} 超过当前母株剩余 ${availableMother}（母株 ${motherCount} + 补苗 ${replantCount} - 损耗 ${motherLoss}）`;
  }

  // 2026-08-14：口径修复 — 小苗可用数从"初始数量"改为"累计产出池"
  // 根因：旧口径用 seedling_quantity（1:多 模式下是母株初始数，与小苗池无关），
  //   累计损耗超过初始数后 available 恒为 0，用户无法再录入任何小苗损耗（"添加记录失败，请重试" bug）
  // 新口径与前端一致：产出 − 小苗损耗 − 已入库
  // 2026-08-14 M1：去掉 transplanted 扣减（业务已停用定植统计，且前端公式/available-count 端点均不含定植）
  const availableSeedling = Math.max(0, expandedCount - seedlingLoss - harvestStocked);
  if (sl > availableSeedling) {
    return `小苗损耗 ${sl} 超过当前小苗剩余 ${availableSeedling}（产出 ${expandedCount} - 损耗 ${seedlingLoss} - 已入库 ${harvestStocked}）`;
  }

  return null;
}

/** 应用每日变更到 seedlings 主表（sign: +1=新增, -1=撤销） */
export function applyDailyChangeToSeedling(
  seedlingId: string,
  changeData: SeedlingChangeData,
  sign: 1 | -1,
): void {
  const ml = Math.max(0, Number(changeData.motherLossChange || 0));
  const sl = Math.max(0, Number(changeData.seedlingLossChange || 0));
  const ec = Math.max(0, Number(changeData.expandedChange || 0));
  const tc = Math.max(0, Number(changeData.transplantedChange || 0));
  // 2026-10-17：补苗累加（母株池口径依赖它 —— 母株存活 = 母株 + 补苗 − 损耗）
  const rp = Math.max(0, Number(changeData.replantChange || 0));
  if (ml === 0 && sl === 0 && ec === 0 && tc === 0 && rp === 0) return;

  const db = getDatabase();
  db.run(
    `UPDATE seedlings
     SET mother_loss_count = MAX(0, mother_loss_count + ? * ?),
         seedling_loss_count = MAX(0, seedling_loss_count + ? * ?),
         expanded_plant_count = MAX(0, expanded_plant_count + ? * ?),
         transplanted_count = MAX(0, transplanted_count + ? * ?),
         replant_count = MAX(0, replant_count + ? * ?),
         update_time = ?
     WHERE id = ?`,
    [ml, sign, sl, sign, ec, sign, tc, sign, rp, sign, new Date().toISOString(), seedlingId],
  );
}
