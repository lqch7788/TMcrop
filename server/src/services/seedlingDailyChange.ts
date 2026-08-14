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
}

/** 规范化（兼容历史字段名） */
/** @param _propagationMode 保留兼容原调用方签名，当前未使用 */
export function normalizeSeedlingChange(raw: any, _propagationMode?: string): SeedlingChangeData {
  if (!raw || typeof raw !== 'object') {
    return { motherLossChange: 0, seedlingLossChange: 0, expandedChange: 0, transplantedChange: 0 };
  }
  return {
    motherLossChange: Math.max(0, Number(raw.motherLossChange ?? raw.motherLoss ?? 0)),
    seedlingLossChange: Math.max(0, Number(raw.seedlingLossChange ?? raw.seedlingLoss ?? 0)),
    expandedChange: Math.max(0, Number(raw.expandedChange ?? raw.expandedPlantChange ?? 0)),
    transplantedChange: Math.max(0, Number(raw.transplantedChange ?? raw.transplantedCount ?? 0)),
  };
}

/** 校验每日记录变更是否合法 */
export function validateSeedlingDailyChange(
  seedlingId: string,
  changeData: SeedlingChangeData,
): string | null {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT mother_plant_count, expanded_plant_count, seedling_quantity, mother_loss_count, seedling_loss_count, transplanted_count, harvest_stocked_count FROM seedlings WHERE id = ?',
  );
  stmt.bind([seedlingId]);
  let row: any = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  if (!row) return '育苗记录不存在';

  const motherCount = Number(row.mother_plant_count || 0);
  const expandedCount = Number(row.expanded_plant_count || 0);
  const motherLoss = Number(row.mother_loss_count || 0);
  const seedlingLoss = Number(row.seedling_loss_count || 0);
  const transplanted = Number(row.transplanted_count || 0);
  // 2026-08-14：小苗可用数扣除已入库量（与前端 DailyRecordModal 校验口径一致）
  const harvestStocked = Number(row.harvest_stocked_count || 0);

  const ml = Math.max(0, Number(changeData.motherLossChange || 0));
  const sl = Math.max(0, Number(changeData.seedlingLossChange || 0));
  const ec = Math.max(0, Number(changeData.expandedChange || 0));
  const tc = Math.max(0, Number(changeData.transplantedChange || 0));

  const availableMother = Math.max(0, motherCount + expandedCount - motherLoss);
  if (ml > availableMother) {
    return `母株损耗 ${ml} 超过当前母株剩余 ${availableMother}（母株 ${motherCount} + 扩繁 ${expandedCount} - 损耗 ${motherLoss}）`;
  }

  // 2026-08-14：口径修复 — 小苗可用数从"初始数量"改为"累计产出池"
  // 根因：旧口径用 seedling_quantity（1:多 模式下是母株初始数，与小苗池无关），
  //   累计损耗超过初始数后 available 恒为 0，用户无法再录入任何小苗损耗（"添加记录失败，请重试" bug）
  // 新口径与前端一致：产出 − 小苗损耗 − 定植 − 已入库
  const availableSeedling = Math.max(0, expandedCount - seedlingLoss - transplanted - harvestStocked);
  if (sl > availableSeedling) {
    return `小苗损耗 ${sl} 超过当前小苗剩余 ${availableSeedling}（产出 ${expandedCount} - 损耗 ${seedlingLoss} - 定植 ${transplanted} - 已入库 ${harvestStocked}）`;
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
  if (ml === 0 && sl === 0 && ec === 0 && tc === 0) return;

  const db = getDatabase();
  db.run(
    `UPDATE seedlings
     SET mother_loss_count = MAX(0, mother_loss_count + ? * ?),
         seedling_loss_count = MAX(0, seedling_loss_count + ? * ?),
         expanded_plant_count = MAX(0, expanded_plant_count + ? * ?),
         transplanted_count = MAX(0, transplanted_count + ? * ?),
         update_time = ?
     WHERE id = ?`,
    [ml, sign, sl, sign, ec, sign, tc, sign, new Date().toISOString(), seedlingId],
  );
}
