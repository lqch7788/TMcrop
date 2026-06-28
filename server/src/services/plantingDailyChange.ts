/**
 * 种植管理每日记录业务逻辑（2026-06-28）
 *
 * 与育苗管理的区别（简化）：
 * - 种植管理没有"母株/小苗"双池概念，只有 1 个种植池
 * - 数量变化字段简化为 2 个：lossCount（损耗）、supplementCount（补栽）
 * - 校验规则：损耗 ≤ 当前活体剩余（planting_quantity + supplement_count - loss_count）
 *
 * 数据流：
 *   POST /api/plantings/:id/daily-records
 *     → validateDailyChange() 业务上限预校验
 *     → INSERT daily_records (record_type='planting')
 *     → applyDailyChangeToPlanting(+1) 累加 plantings 主表
 *   PUT /api/plantings/:id/daily-records/:recordId
 *     → 临时 applyDailyChangeToPlanting(-1) 反向抵消旧值
 *     → validateDailyChange() 校验新值
 *     → 失败：applyDailyChangeToPlanting(+1) 还原
 *     → 通过：applyDailyChangeToPlanting(+1) 应用新值
 *     → UPDATE daily_records
 *   DELETE /api/plantings/:id/daily-records/:recordId
 *     → applyDailyChangeToPlanting(-1) 反向累加
 *     → DELETE daily_records
 */

import { getDatabase } from '../db';

/**
 * 校验每日记录的损耗/补栽是否合法
 * @returns 错误信息字符串；合法返回 null
 */
export function validateDailyChange(
  plantingId: string,
  changeData: { lossChange?: number; supplementChange?: number }
): string | null {
  const lc = Math.max(0, Number(changeData.lossChange || 0));
  const rc = Math.max(0, Number(changeData.supplementChange || 0));

  const db = getDatabase();
  const stmt = db.prepare('SELECT planting_quantity, loss_count, supplement_count FROM plantings WHERE id = ?');
  stmt.bind([plantingId]);
  let row: any = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();

  if (!row) return '种植记录不存在';

  const plantingQuantity = Number(row.planting_quantity || 0);
  const lossCount = Number(row.loss_count || 0);
  const supplementCount = Number(row.supplement_count || 0);

  // 活体剩余 = planting_quantity + 补栽累计 - 损耗累计
  // 注意：本次损耗 lc 不参与"剩余可用"计算（避免重复扣减自己）
  const available = Math.max(0, plantingQuantity + supplementCount - lossCount);

  if (lc > available) {
    return `损耗数量 ${lc} 超过当前活体剩余 ${available} 株（种植 ${plantingQuantity} + 补栽 ${supplementCount} − 损耗 ${lossCount}）`;
  }
  return null;
}

/**
 * 规范化字段名（兼容历史数据，统一用 lossChange / supplementChange）
 */
export function normalizeChangeData(raw: any): { lossChange: number; supplementChange: number } {
  if (!raw || typeof raw !== 'object') {
    return { lossChange: 0, supplementChange: 0 };
  }
  return {
    lossChange: Math.max(0, Number(raw.lossChange ?? raw.lossCountChange ?? 0)),
    supplementChange: Math.max(0, Number(raw.supplementChange ?? raw.replantChange ?? 0)),
  };
}

/**
 * 应用每日记录的 delta 到 plantings 主表
 * @param sign +1 表示新增/编辑正向；-1 表示删除/编辑反向补偿
 */
export function applyDailyChangeToPlanting(
  plantingId: string,
  changeData: { lossChange?: number; supplementChange?: number },
  sign: 1 | -1
): void {
  const lc = Math.max(0, Number(changeData.lossChange || 0));
  const rc = Math.max(0, Number(changeData.supplementChange || 0));
  if (lc === 0 && rc === 0) return;

  const db = getDatabase();
  // MAX(0, col + delta) 累加（保证不会出现负数）
  db.run(
    `UPDATE plantings
     SET loss_count = MAX(0, loss_count + ? * ?),
         supplement_count = MAX(0, supplement_count + ? * ?),
         update_time = ?
     WHERE id = ?`,
    [lc, sign, rc, sign, new Date().toISOString(), plantingId]
  );
}