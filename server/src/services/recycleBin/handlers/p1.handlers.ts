/**
 * 回收站处理器（P1）：水肥记录 / 病虫害记录 / 每日记录
 *
 * 这三类原表都是物理删除，恢复 = 按快照重新插入 + 反向执行删除时的库存/聚合联动。
 * - 水肥：重插记录，重新扣减肥料库存
 * - 病虫害：重插记录，重新扣减药剂库存（含每日记录同步路径）
 * - 每日记录：重插记录，重放主表聚合，恢复同步生成的肥料/防治记录并重新扣库存
 */
import type { Database } from 'sql.js';
import type { RecycleCapture, RecycleHandler, RestoreResult } from '../types';
import { insertRow, parseJson, readRow, readRows, rowExists } from '../helpers';
import { fertilizerRepository } from '../../../repositories/fertilizer.repository';
import { toSpecUnit } from '../../../lib/unitConversions';
import {
  adjustFertilizerStock,
  adjustPesticideStock,
  getOldFertilizerSync,
  getOldPesticideSync,
} from '../../../lib/syncDailyRecords';
import { normalizeSeedlingChange, applyDailyChangeToSeedling } from '../../seedlingDailyChange';
import { normalizeChangeData, applyDailyChangeToPlanting } from '../../plantingDailyChange';

/** 按施肥记录快照重新扣减肥料库存（与删除时的恢复逻辑对称） */
function deductFertilizerStock(db: Database, row: Record<string, unknown>, now: string): void {
  // 1) 顶层 fertilizer_id
  const fid = row.fertilizer_id ? String(row.fertilizer_id) : '';
  const qty = Number(row.quantity) || 0;
  if (fid && qty > 0) {
    const spec: any = fertilizerRepository.findSpecById(fid);
    if (spec) {
      const conv = toSpecUnit(qty, String(row.unit || 'kg'), spec.stockUnit || 'kg');
      const actual = conv ? conv.convertedQuantity : qty;
      const newStock = fertilizerRepository.decreaseStock(fid, actual, now);
      if (newStock === null) {
        throw new Error(`肥料「${spec.fertilizerName || fid}」库存不足，无法恢复（需 ${actual}${spec.stockUnit || ''}）`);
      }
    }
  }
  // 2) fertilization_pool 池
  const pool = parseJson(row.fertilization_pool);
  if (Array.isArray(pool)) {
    const grouped = new Map<string, { qty: number; unit: string }>();
    for (const item of pool) {
      const specId = String(item?.specId || item?.fertilizerSpecId || '').trim();
      const itemQty = Number(item?.quantity) || 0;
      if (!specId || itemQty <= 0) continue;
      const existing = grouped.get(specId);
      if (existing) existing.qty += itemQty;
      else grouped.set(specId, { qty: itemQty, unit: String(item?.unit || 'kg') });
    }
    for (const [specId, item] of grouped.entries()) {
      const spec: any = fertilizerRepository.findSpecById(specId);
      if (!spec) continue;
      const conv = toSpecUnit(item.qty, item.unit, spec.stockUnit || 'kg');
      const actual = conv ? conv.convertedQuantity : item.qty;
      const newStock = fertilizerRepository.decreaseStock(specId, actual, now);
      if (newStock === null) {
        throw new Error(`肥料「${spec.fertilizerName || specId}」库存不足，无法恢复（需 ${actual}${spec.stockUnit || ''}）`);
      }
    }
  }
}

/** 水肥记录 */
export const fertilizerHandler: RecycleHandler = {
  entityType: 'fertilizer_record',
  label: '水肥记录',
  deleteMode: 'hard',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'fertilizer_records', id);
    if (!row) return null;
    return {
      entityCode: String(row.fertilizer_code || ''),
      displayName: `水肥 ${row.fertilizer_code || id} · ${row.crop_name || ''}`,
      snapshot: row,
    };
  },

  async restore(db, snapshot, _deps, _operator, now) {
    const id = String(snapshot.id);
    if (rowExists(db, 'fertilizer_records', id)) {
      throw new Error('回收站记录与现有水肥记录主键冲突，无法恢复');
    }
    deductFertilizerStock(db, snapshot, now);
    insertRow(db, 'fertilizer_records', snapshot);
    return { id };
  },
};

/** 病虫害记录 */
export const pesticideHandler: RecycleHandler = {
  entityType: 'pesticide_record',
  label: '病虫害记录',
  deleteMode: 'hard',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'pesticide_records', id);
    if (!row) return null;
    // 同步路径：删除时会恢复药剂库存，需在删除前抓到同步明细（恢复时重新扣减）
    const pesticideSync = row.source_daily_record_id
      ? getOldPesticideSync(db, String(row.source_daily_record_id))
      : [];
    return {
      entityCode: String(row.record_code || ''),
      displayName: `病虫害 ${row.record_code || id} · ${row.crop_name || ''}`,
      snapshot: row,
      restoreInfo: { pesticideSync },
    };
  },

  async restore(db, snapshot, _deps, _operator, now, restoreInfo) {
    const id = String(snapshot.id);
    if (rowExists(db, 'pesticide_records', id)) {
      throw new Error('回收站记录与现有病虫害记录主键冲突，无法恢复');
    }

    // 1) 重新扣减叶面肥/肥料库存（与 apply 路径一致：按 specId 聚合后换算）
    const items = parseJson(snapshot.leaf_fertilizer_list);
    if (Array.isArray(items)) {
      const grouped = new Map<string, { qty: number; unit: string; name: string }>();
      for (const item of items) {
        const specId = String(item?.specId || item?.spec_id || '').trim();
        const dosage = Number(item?.dosage);
        if (!specId || !Number.isFinite(dosage) || dosage <= 0) continue;
        const existing = grouped.get(specId);
        if (existing) existing.qty += dosage;
        else grouped.set(specId, { qty: dosage, unit: String(item?.unit || ''), name: String(item?.fertilizerName || specId) });
      }
      for (const [specId, item] of grouped.entries()) {
        const spec: any = fertilizerRepository.findSpecById(specId);
        if (!spec) continue;
        const conv = toSpecUnit(item.qty, item.unit, spec.stockUnit || 'kg');
        const actual = conv && !conv.needsManualCheck ? conv.convertedQuantity : item.qty;
        const newStock = fertilizerRepository.decreaseStock(specId, actual, now);
        if (newStock === null) {
          throw new Error(`肥料「${item.name}」库存不足，无法恢复病虫害记录（需 ${actual}${spec.stockUnit || ''}）`);
        }
      }
    }

    // 2) 每日记录同步路径：删除时恢复了药剂库存，恢复时重新扣减
    if (String(snapshot.source_type || '') === 'daily_record_sync' && snapshot.source_daily_record_id) {
      const syncRows = Array.isArray(restoreInfo?.pesticideSync)
        ? restoreInfo!.pesticideSync as Array<{ code: string; qty: number }>
        : [];
      for (const s of syncRows) {
        if (!s.code || s.qty <= 0) continue;
        const beforeRows = db.exec('SELECT stock_quantity FROM pesticide_specs WHERE pesticide_code = ?', [s.code]);
        const stock = Number(beforeRows[0]?.values?.[0]?.[0] ?? 0);
        if (stock + 0.0001 < s.qty) {
          throw new Error(`药剂「${s.code}」库存不足，无法恢复（需 ${s.qty}，当前 ${stock}）`);
        }
        adjustPesticideStock(db, s.code, -s.qty);
      }
    }

    insertRow(db, 'pesticide_records', snapshot);
    return { id };
  },
};

/** 每日记录（育苗 / 种植共用） */
export const dailyRecordHandler: RecycleHandler = {
  entityType: 'daily_record',
  label: '每日记录',
  deleteMode: 'hard',
  restoreMode: 'restore',

  capture(db, id): RecycleCapture | null {
    const row = readRow(db, 'daily_records', id);
    if (!row) return null;
    // 删除时会级联删除同步生成的肥料/防治记录，恢复需要把行写回
    const fertilizerRows = readRows(db, 'SELECT * FROM fertilizer_records WHERE source_daily_record_id = ?', [id]);
    const pesticideRows = readRows(db, 'SELECT * FROM pesticide_records WHERE source_daily_record_id = ?', [id]);
    const deps: Array<{ table: string; rows: Record<string, unknown>[] }> = [];
    if (fertilizerRows.length) deps.push({ table: 'fertilizer_records', rows: fertilizerRows });
    if (pesticideRows.length) deps.push({ table: 'pesticide_records', rows: pesticideRows });
    return {
      entityCode: String(row.related_code || ''),
      displayName: `每日记录 ${row.record_date || ''} · ${row.crop_name || ''}`,
      snapshot: row,
      dependencies: deps,
      // 同步路径的库存明细：删除时已恢复，恢复时需重新扣减
      restoreInfo: {
        fertilizerSync: getOldFertilizerSync(db, id),
        pesticideSync: getOldPesticideSync(db, id),
      },
    };
  },

  async restore(db, snapshot, dependencies, _operator, now, restoreInfo): Promise<RestoreResult> {
    const id = String(snapshot.id);
    if (rowExists(db, 'daily_records', id)) {
      throw new Error('回收站记录与现有每日记录主键冲突，无法恢复');
    }
    const warnings: string[] = [];

    // 1) 回写同步生成的肥料/防治记录
    for (const dep of dependencies) {
      for (const row of dep.rows) {
        if (rowExists(db, dep.table, row.id)) continue;
        insertRow(db, dep.table, row);
      }
    }

    // 2) 重新扣减同步路径库存（与删除时的恢复对称）
    const fertilizerSync = Array.isArray(restoreInfo?.fertilizerSync) ? restoreInfo!.fertilizerSync as Array<{ code: string; qty: number }> : [];
    for (const s of fertilizerSync) {
      if (!s.code || !(s.qty > 0)) continue;
      adjustFertilizerStock(db, s.code, -s.qty);
    }
    const pesticideSync = Array.isArray(restoreInfo?.pesticideSync) ? restoreInfo!.pesticideSync as Array<{ code: string; qty: number }> : [];
    for (const s of pesticideSync) {
      if (!s.code || !(s.qty > 0)) continue;
      adjustPesticideStock(db, s.code, -s.qty);
    }

    // 3) 主表聚合重放（+1），与删除时的 -1 对称
    const relatedType = String(snapshot.related_type || snapshot.record_type || '');
    const relatedId = String(snapshot.related_id || '');
    const data = parseJson(snapshot.data) || {};
    if (relatedType === 'seedling') {
      const parent = readRow(db, 'seedlings', relatedId);
      if (!parent) {
        throw new Error('关联育苗记录已不存在，无法恢复每日记录（请先恢复育苗）');
      }
      if (parent.deleted_at) warnings.push('关联育苗记录处于已删除状态，恢复后需再次确认聚合数量');
      applyDailyChangeToSeedling(relatedId, normalizeSeedlingChange(data), 1);
    } else if (relatedType === 'planting') {
      const parent = readRow(db, 'plantings', relatedId);
      if (!parent) {
        throw new Error('关联种植记录已不存在，无法恢复每日记录（请先恢复种植）');
      }
      if (parent.deleted_at) warnings.push('关联种植记录处于已删除状态，恢复后需再次确认聚合数量');
      applyDailyChangeToPlanting(relatedId, normalizeChangeData(data), 1);
    } else {
      warnings.push(`未知的每日记录类型「${relatedType}」，未回写主表聚合`);
    }

    // 4) 最后插入每日记录本身
    insertRow(db, 'daily_records', snapshot);
    void now;
    return { id, warnings };
  },
};
