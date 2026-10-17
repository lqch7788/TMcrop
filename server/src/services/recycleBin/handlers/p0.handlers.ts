/**
 * 回收站处理器（P0）：种源 / 育苗 / 种植
 *
 * 三者在原表都是软删除（deleted_at），恢复 = 清除 deleted_at + 反向执行删除时的联动：
 * - 育苗：重新扣减种源 source_deducted_quantity，写库存流水 + 纠错流转，恢复防治记录关联
 * - 种植：重新扣减种源，恢复回流记录撤销状态、防治记录关联
 */
import type { Database } from 'sql.js';
import type { RecycleCapture, RecycleHandler, RecycleOperator, RestoreResult } from '../types';
import { insertSourceTransaction, parseJson, readRow, readRows } from '../helpers';
import { writeCorrection } from '../../flowLogService';

/** 种源（软删，无库存联动） */
export const seedSourceHandler: RecycleHandler = {
  entityType: 'seed_source',
  label: '种源',
  deleteMode: 'soft',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'seed_sources', id);
    if (!row) return null;
    return {
      entityCode: String(row.source_code || ''),
      displayName: `种源 ${row.source_code || id}`,
      snapshot: row,
    };
  },

  async restore(db, snapshot) {
    const id = String(snapshot.id);
    if (!readRow(db, 'seed_sources', id)) {
      throw new Error('种源原记录已不存在，无法恢复');
    }
    db.run('UPDATE seed_sources SET deleted_at = NULL, update_time = ? WHERE id = ?', [new Date().toISOString(), id]);
    return { id };
  },
};

/** 育苗（软删；恢复需重新扣减种源） */
export const seedlingHandler: RecycleHandler = {
  entityType: 'seedling',
  label: '育苗记录',
  deleteMode: 'soft',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'seedlings', id);
    if (!row) return null;
    // 删除时会置空防治记录的关联，恢复时需要把关联写回
    const pesticideLinks = readRows(
      db,
      'SELECT id, seedling_id, seedling_code FROM pesticide_records WHERE seedling_id = ?',
      [id],
    );
    return {
      entityCode: String(row.seedling_code || ''),
      displayName: `育苗 ${row.seedling_code || id} · ${row.crop_name || ''}${row.crop_variety ? '/' + row.crop_variety : ''}`,
      snapshot: row,
      dependencies: pesticideLinks.length ? [{ table: 'pesticide_records', rows: pesticideLinks }] : [],
    };
  },

  async restore(db, snapshot, dependencies, operator, now) {
    const id = String(snapshot.id);
    const code = String(snapshot.seedling_code || id);
    if (!readRow(db, 'seedlings', id)) throw new Error('育苗原记录已不存在，无法恢复');

    // 1) 恢复主表
    db.run('UPDATE seedlings SET deleted_at = NULL, update_time = ? WHERE id = ?', [now, id]);

    // 2) 恢复防治记录关联
    const warnings: string[] = [];
    for (const dep of dependencies) {
      if (dep.table !== 'pesticide_records') continue;
      for (const row of dep.rows) {
        db.run('UPDATE pesticide_records SET seedling_id = ?, seedling_code = ? WHERE id = ?', [
          id, code, String(row.id),
        ]);
      }
    }

    // 3) 重新扣减种源（与删除时的退款对称）
    if (String(snapshot.source_mode || '') === 'internal' && snapshot.source_id) {
      const qty = Number(snapshot.source_deducted_quantity) || 0;
      if (qty > 0) {
        const sourceId = String(snapshot.source_id);
        const src = readRow(db, 'seed_sources', sourceId);
        if (!src || src.deleted_at) {
          throw new Error(`关联种源 ${snapshot.source_name || sourceId} 已删除，无法恢复育苗（请先恢复种源）`);
        }
        const remaining = Number(src.remaining_quantity) || 0;
        if (remaining + 0.0001 < qty) {
          throw new Error(`种源可用量不足：恢复需要 ${qty}${src.unit || ''}，当前可用 ${remaining}${src.unit || ''}`);
        }
        db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?', [
          qty, now, sourceId,
        ]);
        await insertSourceTransaction(db, {
          sourceId,
          delta: -qty,
          balanceBefore: remaining,
          balanceAfter: remaining - qty,
          businessId: id,
          businessCode: code,
          operatorId: operator.id,
          operatorName: operator.name,
          remark: `从回收站恢复育苗 ${code}（重新扣减 ${qty}${src.unit || ''}）`,
          now,
        });
        writeCorrection({
          flow_type: 'seed_source→seedling',
          source_type: 'seed_source',
          source_id: sourceId,
          source_code: String(src.source_code || ''),
          target_type: 'seedling',
          target_id: id,
          target_code: code,
          source_quantity_delta: -qty,
          source_unit: String(src.unit || ''),
          crop_name: String(snapshot.crop_name || ''),
          crop_variety: String(snapshot.crop_variety || ''),
          created_by: operator.name || 'system',
        });
      }
    }

    return { id, warnings };
  },
};

/** 种植（软删；恢复需重新扣减种源 + 恢复回流撤销） */
export const plantingHandler: RecycleHandler = {
  entityType: 'planting',
  label: '种植记录',
  deleteMode: 'soft',
  restoreMode: 'restore',

  capture(db, id) {
    const row = readRow(db, 'plantings', id);
    if (!row) return null;
    // 删除时会置空防治关联
    const pesticideLinks = readRows(
      db,
      'SELECT id, planting_id, planting_code FROM pesticide_records WHERE planting_id = ?',
      [id],
    );
    // 删除时会把未撤销的回流记录标记为已撤销，恢复时按 id 写回
    const circulationRows = readRows(
      db,
      `SELECT id FROM crop_circulation_records
       WHERE source_module = 'planting' AND source_id = ? AND is_revoked = 0`,
      [id],
    );
    const deps: Array<{ table: string; rows: Record<string, unknown>[] }> = [];
    if (pesticideLinks.length) deps.push({ table: 'pesticide_records', rows: pesticideLinks });
    if (circulationRows.length) deps.push({ table: 'crop_circulation_records', rows: circulationRows });
    return {
      entityCode: String(row.planting_code || ''),
      displayName: `种植 ${row.planting_code || id} · ${row.crop_name || ''}${row.crop_variety ? '/' + row.crop_variety : ''}`,
      snapshot: row,
      dependencies: deps,
    };
  },

  async restore(db, snapshot, dependencies, operator, now) {
    const id = String(snapshot.id);
    const code = String(snapshot.planting_code || id);
    if (!readRow(db, 'plantings', id)) throw new Error('种植原记录已不存在，无法恢复');

    db.run('UPDATE plantings SET deleted_at = NULL, update_time = ? WHERE id = ?', [now, id]);

    // 恢复防治记录关联 + 回流撤销标记
    for (const dep of dependencies) {
      if (dep.table === 'pesticide_records') {
        for (const row of dep.rows) {
          db.run('UPDATE pesticide_records SET planting_id = ?, planting_code = ? WHERE id = ?', [id, code, String(row.id)]);
        }
      } else if (dep.table === 'crop_circulation_records') {
        for (const row of dep.rows) {
          db.run(
            'UPDATE crop_circulation_records SET is_revoked = 0, revoked_at = NULL, revoked_by = NULL WHERE id = ?',
            [String(row.id)],
          );
        }
      }
    }

    // 重新扣减种源（种植来源为 seed 时才涉及种源库存）
    const sourceType = String(snapshot.source_type || '').toLowerCase();
    const sourceId = snapshot.source_id ? String(snapshot.source_id) : '';
    const qty = Number(snapshot.source_deducted_quantity) || Number(snapshot.planting_quantity) || 0;
    const warnings: string[] = [];
    if (sourceType === 'seed' && sourceId && qty > 0) {
      const src = readRow(db, 'seed_sources', sourceId);
      if (!src || src.deleted_at) {
        throw new Error(`关联种源 ${snapshot.source_code || sourceId} 已删除，无法恢复种植（请先恢复种源）`);
      }
      const remaining = Number(src.remaining_quantity) || 0;
      if (remaining + 0.0001 < qty) {
        throw new Error(`种源可用量不足：恢复需要 ${qty}${src.unit || ''}，当前可用 ${remaining}${src.unit || ''}`);
      }
      db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?', [
        qty, now, sourceId,
      ]);
      await insertSourceTransaction(db, {
        sourceId,
        delta: -qty,
        balanceBefore: remaining,
        balanceAfter: remaining - qty,
        businessId: id,
        businessCode: code,
        operatorId: operator.id,
        operatorName: operator.name,
        remark: `从回收站恢复种植 ${code}（重新扣减 ${qty}${src.unit || ''}）`,
        now,
      });
      writeCorrection({
        flow_type: 'seed_source→planting',
        source_type: 'seed_source',
        source_id: sourceId,
        source_code: String(src.source_code || ''),
        target_type: 'planting',
        target_id: id,
        target_code: code,
        source_quantity_delta: -qty,
        source_unit: String(src.unit || ''),
        crop_name: String(snapshot.crop_name || ''),
        crop_variety: String(snapshot.crop_variety || ''),
        created_by: operator.name || 'system',
      });
    } else if (sourceType === 'seedling') {
      warnings.push('该种植记录来源为育苗，育苗池数量未自动回补，请人工核对');
    }

    return { id, warnings };
  },
};
