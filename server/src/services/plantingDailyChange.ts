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
import { queryToObjects } from '../utils/queryHelper';

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

  // 2026-10-18 P1 修复：活体剩余以区域库存为权威（移入/移出只改 area_stocks，主表 planting_quantity 是创建总量）。
  // 原公式在移入后仍按主表计算，导致损耗上限远小于实际剩余。
  const areaRows = queryToObjects<any>(
    db,
    `SELECT COALESCE(SUM(quantity), 0) AS total, COUNT(*) AS cnt
       FROM planting_area_stocks WHERE planting_id = ?`,
    [plantingId],
  );
  const areaTotal = Number(areaRows[0]?.total ?? 0);
  const hasAreaRows = Number(areaRows[0]?.cnt ?? 0) > 0;
  // 注意：本次损耗 lc 不参与"剩余可用"计算（避免重复扣减自己）
  const available = hasAreaRows
    ? Math.max(0, areaTotal)
    : Math.max(0, plantingQuantity + supplementCount - lossCount);

  if (lc > available) {
    return `损耗数量 ${lc} 超过当前活体剩余 ${available} 株（区域库存 ${available}，种植 ${plantingQuantity} + 补栽 ${supplementCount} − 损耗 ${lossCount}）`;
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
 * 同步区域库存（planting_area_stocks）
 *
 * 列表「剩余数量」= Σ planting_area_stocks.quantity（见 planting.ts 列表 SELECT），
 * 损耗/补栽若只改主表 loss_count/supplement_count，剩余数量不会变化。
 *
 * @param delta >0：补栽（或回滚损耗），加入主区域库存
 *              <0：损耗（或回滚补栽），主区域优先扣减，不足再按数量降序扣其它区域
 */
export function applyAreaStockDelta(plantingId: string, delta: number, now: string): void {
  if (delta === 0) return;
  const db = getDatabase();

  if (delta > 0) {
    // 优先加到种植单的主区域（plantings.area_id），否则加到数量最大的区域
    const primary = queryToObjects<any>(
      db,
      `SELECT s.id
       FROM planting_area_stocks s
       JOIN plantings p ON p.id = s.planting_id
       WHERE s.planting_id = ?
       ORDER BY CASE WHEN s.area_id = p.area_id THEN 0 ELSE 1 END, s.quantity DESC
       LIMIT 1`,
      [plantingId],
    );
    if (primary.length > 0) {
      db.run(
        `UPDATE planting_area_stocks SET quantity = quantity + ?, update_time = ? WHERE id = ?`,
        [delta, now, primary[0].id],
      );
      return;
    }
    // 无区域库存行（历史数据）：按主表区域补建一条
    const planting = queryToObjects<any>(
      db,
      `SELECT area_id, area_name, planting_code, planting_date FROM plantings WHERE id = ?`,
      [plantingId],
    );
    if (planting.length === 0) return;
    const p = planting[0];
    db.run(
      `INSERT INTO planting_area_stocks
        (id, planting_id, area_id, area_name, quantity, source_type, source_code, operation_date, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `STK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        plantingId,
        p.areaId || 'UNASSIGNED',
        p.areaName || '未分配',
        delta,
        'daily_record',
        p.plantingCode || '',
        now.slice(0, 10),
        now,
        now,
      ],
    );
    return;
  }

  // 扣减：主区域优先，其余按数量降序；库存不足时扣到 0 为止（不产生负数）
  let remaining = -delta;
  const stocks = queryToObjects<any>(
    db,
    `SELECT s.id, s.quantity
     FROM planting_area_stocks s
     JOIN plantings p ON p.id = s.planting_id
     WHERE s.planting_id = ? AND s.quantity > 0
     ORDER BY CASE WHEN s.area_id = p.area_id THEN 0 ELSE 1 END, s.quantity DESC`,
    [plantingId],
  );
  for (const s of stocks) {
    if (remaining <= 0) break;
    const take = Math.min(Number(s.quantity || 0), remaining);
    if (take <= 0) continue;
    db.run(
      `UPDATE planting_area_stocks SET quantity = quantity - ?, update_time = ? WHERE id = ?`,
      [take, now, s.id],
    );
    remaining -= take;
  }
}

/**
 * 应用每日记录的 delta 到 plantings 主表 + 区域库存
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
  const now = new Date().toISOString();
  // MAX(0, col + delta) 累加（保证不会出现负数）
  db.run(
    `UPDATE plantings
     SET loss_count = MAX(0, loss_count + ? * ?),
         supplement_count = MAX(0, supplement_count + ? * ?),
         update_time = ?
     WHERE id = ?`,
    [lc, sign, rc, sign, now, plantingId]
  );

  // 2026-10-19：同步区域库存，保证列表「剩余数量」随损耗/补栽变化
  applyAreaStockDelta(plantingId, (rc - lc) * sign, now);

  // 2026-10-19：同步计算损耗率 = 累计损耗 ÷（种植数量 + 累计补栽）× 100%
  // 说明：行级采收入库的数量是产物重量（如千克），与植株数量不同量纲，
  // 不能用于损耗率计算，因此损耗率以每日记录的损耗/补栽为口径。
  recalcAttritionRate(db, plantingId);
}

/**
 * 2026-10-18：按「累计损耗 ÷（种植数量 + 累计补栽）」重算损耗率。
 * 每日记录与编辑弹窗（直接改 lossCount/supplementCount）共用。
 */
export function recalcAttritionRate(db: any, plantingId: string): void {
  const rows = queryToObjects<any>(
    db,
    `SELECT planting_quantity, loss_count, supplement_count,
            (SELECT COUNT(*) FROM planting_area_stocks WHERE planting_id = ?) AS areaCnt,
            (SELECT COALESCE(SUM(quantity), 0) FROM planting_area_stocks WHERE planting_id = ?) AS areaTotal
       FROM plantings WHERE id = ?`,
    [plantingId, plantingId, plantingId],
  );
  if (rows.length === 0) return;
  const qty = Number(rows[0].plantingQuantity ?? rows[0].planting_quantity ?? 0);
  const loss = Number(rows[0].lossCount ?? rows[0].loss_count ?? 0);
  const supp = Number(rows[0].supplementCount ?? rows[0].supplement_count ?? 0);
  // 2026-10-18 P1：有区域库存时，投入基数 = 区域库存 + 累计损耗（含调入/调出净变化）；
  // 无区域库存的历史行回退到「种植数量 + 补栽」。
  const hasAreaRows = Number(rows[0].areaCnt ?? 0) > 0;
  const areaTotal = Number(rows[0].areaTotal ?? 0);
  const base = hasAreaRows ? areaTotal + loss : qty + supp;
  const rate = base > 0 ? Math.round((loss / base) * 1000) / 10 : 0;
  db.run('UPDATE plantings SET attrition_rate = ? WHERE id = ?', [rate, plantingId]);
}