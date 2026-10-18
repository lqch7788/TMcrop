/**
 * 种植管理 — 每日记录子路由（2026-07-21 从 planting.ts 提取）
 *
 * 原位置：planting.ts:1460-1863（~400 行）
 * 提取理由：planting.ts 2316 行超 800 行上限 3 倍，降低认知负担
 *
 * 挂载点：/api/plantings/:id/daily-records
 * 路由：
 *   GET    /                    → 列表
 *   POST   /                    → 新增
 *   PUT    /:recordId           → 编辑
 *   DELETE /:recordId           → 删除
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { formatLocalDateISO } from '../utils/dateUtil';
// 2026-07-22：追溯修复 - 种植日常记录写入 audit_log
import { writeAuditLog } from '../services/auditLog.service';
import {
  validateDailyChange,
  normalizeChangeData,
  applyDailyChangeToPlanting,
} from '../services/plantingDailyChange';
import { archiveBeforeDelete, markArchiveFailed } from '../services/recycleBin.service';

const router = Router({ mergeParams: true }); // 合并父路由的 :id 参数

/** GET / — 获取每日记录列表 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const db = getDatabase();

    const total = execCount(
      db,
      'SELECT COUNT(*) FROM daily_records WHERE related_id = ? AND related_type = ?',
      [id, 'planting'],
    );

    const offset = (Number(page) - 1) * Number(limit);
    const items = queryToObjects(
      db,
      `SELECT * FROM daily_records WHERE related_id = ? AND related_type = ?
       ORDER BY record_date DESC, create_time DESC LIMIT ${Number(limit)} OFFSET ${offset}`,
      [id, 'planting'],
    );

    // 展开 data JSON 字段
    const expanded = items.map((it: any) => {
      if (it.data) {
        try {
          const parsed = JSON.parse(it.data);
          // 2026-10-18 P0 修复：data 保留为对象，供前端编辑时基于旧值合并；
          // 原实现被 it.data（原始字符串）覆盖，导致编辑保存只能白名单重建、丢失明细
          return { ...parsed, ...it, data: parsed };
        } catch { /* ignore */ }
      }
      return it;
    });

    res.json({
      success: true,
      data: expanded,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('[plantingDailyRecords] 列表失败:', error);
    res.status(500).json({ success: false, error: '获取种植每日记录失败' });
  }
});

/** POST / — 新增每日记录（含施肥/用药/浇水同步） */
router.post('/', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { recordDate, data, remarks, createBy } = req.body || {};
    const db = getDatabase();

    // 校验种植记录存在
    const pStmt = db.prepare('SELECT * FROM plantings WHERE id = ? AND deleted_at IS NULL');
    pStmt.bind([id]);
    const planting = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!planting) {
      return res.status(404).json({ success: false, error: '种植记录不存在' });
    }
    if (planting.end_time) {
      return res.status(400).json({ success: false, error: '种植已结束，无法新增每日记录' });
    }

    // 业务上限预校验
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const normalized = normalizeChangeData(parsed);
        const validateErr = validateDailyChange(id, normalized);
        if (validateErr) {
          return res.status(400).json({ success: false, error: validateErr });
        }
      } catch { /* JSON 解析失败跳过 */ }
    }

    const newId = `DR${Date.now()}`;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO daily_records (
        id, oid, record_type, record_date, related_id, related_code, related_type,
        crop_name, crop_variety, greenhouse_name, quantity, unit, data, remarks,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId, newId, 'planting', recordDate || now, id, planting.planting_code || '',
        'planting', planting.crop_name || '', planting.crop_variety || '',
        planting.greenhouse_name || '', 0, planting.unit || '株',
        data ? JSON.stringify(data) : null, remarks || '', createBy || '', now, now,
      ],
    );

    // 应用 delta 到 plantings 主表
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        applyDailyChangeToPlanting(id, normalizeChangeData(parsed), 1);
      } catch { /* JSON 解析失败跳过 */ }
    }

    // 同步施肥/用药/浇水到独立管理页（失败不影响主记录）
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const fertItems: any[] = parsed?.fertilizerRecords || [];
        const pestItems: any[] = parsed?.pesticideRecords || [];
        if (fertItems.length > 0 || pestItems.length > 0) {
          const { syncFertilizerRecords, syncPesticideRecords } = require('../lib/syncDailyRecords');
          const jwtUser2 = (req as any).user;
          const operatorId2 = (req as any).body?.operatorId || jwtUser2?.aid || jwtUser2?.userId || '';
          const operatorName2 = (req as any).body?.operatorName
            || (req as any).body?.createBy || (req as any).body?.create_by
            || jwtUser2?.name || '';
          const ctx = {
            relatedId: id, relatedCode: (planting as any).planting_code || '', relatedType: 'planting' as const,
            recordDate: recordDate || formatLocalDateISO(),
            cropName: (planting as any).crop_name || '', cropVariety: (planting as any).crop_variety || '',
            greenhouseName: (planting as any).area_name || (planting as any).greenhouse_name || '',
            areaId: (planting as any).area_id || '', areaName: (planting as any).area_name || (planting as any).greenhouse_name || '',
            operatorId: operatorId2, operatorName: operatorName2,
          };
          if (fertItems.length > 0) {
            syncFertilizerRecords(db, newId, fertItems, {
              ...ctx,
              primaryMethod: fertItems.find((it: any) => it.applicationMethod)?.applicationMethod || '',
            });
          }
          if (pestItems.length > 0) {
            syncPesticideRecords(db, newId, pestItems, {
              ...ctx,
              primaryMethod: pestItems.find((it: any) => it.applicationMethod)?.applicationMethod || '',
              primaryTargetPest: pestItems.find((it: any) => it.targetPest)?.targetPest || '',
            });
          }
        }
        // 浇水同步
        const wateringData = parsed?.watering != null ? {
          watering: !!parsed.watering, wateringMethod: parsed.wateringMethod,
          wateringAmount: parsed.wateringAmount, wateringUnit: parsed.wateringUnit,
        } : null;
        if (wateringData?.watering && wateringData.wateringAmount > 0) {
          const { syncWateringRecords } = require('../lib/syncDailyRecords');
          const jwtUser2 = (req as any).user;
          syncWateringRecords(db, newId, wateringData, {
            relatedId: id, relatedCode: (planting as any).planting_code || '', relatedType: 'planting' as const,
            recordDate: recordDate || formatLocalDateISO(),
            cropName: (planting as any).crop_name || '', cropVariety: (planting as any).crop_variety || '',
            greenhouseName: (planting as any).area_name || (planting as any).greenhouse_name || '',
            areaId: (planting as any).area_id || '', areaName: (planting as any).area_name || (planting as any).greenhouse_name || '',
            operatorId: (req as any).body?.operatorId || jwtUser2?.aid || jwtUser2?.userId || '',
            operatorName: (req as any).body?.operatorName || (req as any).body?.createBy || jwtUser2?.name || '',
          });
        }
      } catch (syncErr) {
        console.error('[plantingDailyRecords] 同步失败（不影响主记录）:', (syncErr as Error)?.message || syncErr);
      }
    }

    saveDatabase();
    const inserted = queryToObjects<any>(db, 'SELECT * FROM daily_records WHERE id = ?', [newId]);
    // 2026-07-22：追溯修复 - 必须在 res.json 之前
    writeAuditLog({
      businessType: 'planting.daily_record',
      businessId: id,
      action: 'daily_record_change',
      operatorName: (req.body as any)?.createBy || (req as any).user?.name,
      opinion: `添加种植日常记录 ${newId}`,
    });
    res.status(201).json({ success: true, data: inserted[0] || { id: newId } });
  } catch (error) {
    console.error('[plantingDailyRecords] 新增失败:', error);
    res.status(500).json({ success: false, error: '添加种植每日记录失败' });
  }
});

/** PUT /:recordId — 编辑每日记录（事务：反向补偿 + 正向重放 + 浇水同步） */
router.put('/:recordId', (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id, recordId } = req.params;
    const { recordDate, remarks, data } = req.body || {};
    const now = formatLocalDateISO();

    // 2026-10-18：取完整行，供施肥/用药/浇水同步构造上下文
    const pStmt = db.prepare('SELECT * FROM plantings WHERE id = ?');
    pStmt.bind([id]);
    const planting = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!planting) return res.status(404).json({ success: false, error: '种植记录不存在' });
    if (planting.end_time) return res.status(400).json({ success: false, error: '种植已结束，无法编辑' });

    // 读旧记录
    const oldStmt = db.prepare('SELECT data FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?');
    oldStmt.bind([recordId, id, 'planting']);
    let oldData: any = {};
    if (oldStmt.step()) {
      try { oldData = JSON.parse((oldStmt.getAsObject() as any).data || '{}'); } catch { oldData = {}; }
    }
    oldStmt.free();

    // 2026-10-18 P0 修复：后端合并旧 data，防止部分字段提交把整列覆盖（丢失施肥/用药/浇水/环境）
    let mergedData: any = null;
    if (data !== undefined) {
      try {
        const incoming = typeof data === 'string' ? JSON.parse(data) : data;
        mergedData = {
          ...(oldData && typeof oldData === 'object' ? oldData : {}),
          ...(incoming && typeof incoming === 'object' ? incoming : {}),
        };
      } catch { mergedData = null; }
    }

    // 2026-10-18 P1：反向补偿 + 正向应用 + 明细更新放同一事务，避免中途失败留下半套数据
    db.exec('BEGIN');

    // 编辑场景：反向抵消旧值 → 校验新值 → 正向应用
    if (mergedData !== null) {
      try {
        const newParsed = mergedData;
        const oldNormalized = normalizeChangeData(oldData);
        const newNormalized = normalizeChangeData(newParsed);
        const hasChange = oldNormalized.lossChange !== newNormalized.lossChange
          || oldNormalized.supplementChange !== newNormalized.supplementChange;
        if (hasChange) {
          if (oldData && Object.keys(oldData).length > 0) applyDailyChangeToPlanting(id, oldNormalized, -1);
          const validateErr = validateDailyChange(id, newNormalized);
          if (validateErr) {
            // 回滚整个事务（含临时反向补偿），恢复到编辑前状态
            try { db.exec('ROLLBACK'); } catch { /* ignore */ }
            return res.status(400).json({ success: false, error: validateErr });
          }
          applyDailyChangeToPlanting(id, newNormalized, 1);
        }
      } catch { /* JSON 解析失败跳过 */ }
    }

    // UPDATE
    const dataJson = mergedData !== null ? JSON.stringify(mergedData) : null;
    const fields = ['update_time = ?'];
    const values: any[] = [now];
    if (recordDate) { fields.push('record_date = ?'); values.push(recordDate); }
    if (dataJson !== null) { fields.push('data = ?'); values.push(dataJson); }
    if (remarks !== undefined) { fields.push('remarks = ?'); values.push(remarks || ''); }
    values.push(recordId, id, 'planting');
    db.run(`UPDATE daily_records SET ${fields.join(', ')} WHERE id = ? AND related_id = ? AND related_type = ?`, values);

    // 浇水同步
    if (data) {
      try {
        const parsed = mergedData;
        // 2026-10-18 P0 修复：仅当 data 明确携带 watering 键时才处理浇水。
        // 原实现 data 中缺 wateringAmount 就 DELETE，编辑其它字段会误删浇水记录。
        const hasWateringKey = parsed != null && Object.prototype.hasOwnProperty.call(parsed, 'watering');
        if (hasWateringKey) {
          const wateringData = {
            watering: !!parsed.watering,
            wateringMethod: parsed.wateringMethod,
            wateringAmount: parsed.wateringAmount,
            wateringUnit: parsed.wateringUnit,
          };
          if (wateringData.watering && Number(wateringData.wateringAmount) > 0) {
            const { syncWateringRecords } = require('../lib/syncDailyRecords');
            syncWateringRecords(db, recordId, wateringData, {
              relatedId: id, relatedCode: (planting as any).planting_code || '', relatedType: 'planting' as const,
              recordDate: recordDate || formatLocalDateISO(),
              cropName: (planting as any).crop_name || '', cropVariety: (planting as any).crop_variety || '',
              greenhouseName: (planting as any).area_name || (planting as any).greenhouse_name || '',
              areaId: (planting as any).area_id || '', areaName: (planting as any).area_name || (planting as any).greenhouse_name || '',
              operatorId: (req as any).body?.operatorId || '',
              operatorName: (req as any).body?.operatorName || (req as any).body?.createBy || '',
            });
          } else {
            db.run('DELETE FROM watering_records WHERE source_daily_record_id = ?', [recordId]);
          }
        }
      } catch (syncErr) {
        console.error('[plantingDailyRecords] 浇水同步失败:', (syncErr as Error)?.message || syncErr);
      }
    }

    // 2026-10-18 P0 修复：编辑时重放施肥/用药同步（原 PUT 只处理浇水，
    // 明细被编辑后 fertilizer_records/pesticide_records 与库存不会跟随）
    if (data) {
      try {
        const parsed = mergedData;
        const hasFertKey = parsed != null && Object.prototype.hasOwnProperty.call(parsed, 'fertilizerRecords');
        const hasPestKey = parsed != null && Object.prototype.hasOwnProperty.call(parsed, 'pesticideRecords');
        if (hasFertKey || hasPestKey) {
          const {
            syncFertilizerRecords, syncPesticideRecords,
            adjustFertilizerStock, adjustPesticideStock,
            getOldFertilizerSync, getOldPesticideSync,
          } = require('../lib/syncDailyRecords');
          const fertItems: any[] = Array.isArray(parsed.fertilizerRecords) ? parsed.fertilizerRecords : [];
          const pestItems: any[] = Array.isArray(parsed.pesticideRecords) ? parsed.pesticideRecords : [];
          // 先恢复旧同步记录扣减的库存，再删除旧记录
          for (const o of getOldFertilizerSync(db, recordId)) adjustFertilizerStock(db, o.code, o.qty);
          for (const o of getOldPesticideSync(db, recordId)) adjustPesticideStock(db, o.code, o.qty);
          db.run('DELETE FROM fertilizer_records WHERE source_daily_record_id = ?', [recordId]);
          db.run('DELETE FROM pesticide_records WHERE source_daily_record_id = ?', [recordId]);
          const ctx = {
            relatedId: id, relatedCode: (planting as any).planting_code || '', relatedType: 'planting' as const,
            recordDate: recordDate || formatLocalDateISO(),
            cropName: (planting as any).crop_name || '', cropVariety: (planting as any).crop_variety || '',
            greenhouseName: (planting as any).area_name || (planting as any).greenhouse_name || '',
            areaId: (planting as any).area_id || '', areaName: (planting as any).area_name || (planting as any).greenhouse_name || '',
            operatorId: (req as any).body?.operatorId || '',
            operatorName: (req as any).body?.operatorName || (req as any).body?.createBy || '',
          };
          if (fertItems.length > 0) {
            syncFertilizerRecords(db, recordId, fertItems, {
              ...ctx,
              primaryMethod: fertItems.find((it: any) => it.applicationMethod)?.applicationMethod || '',
            });
          }
          if (pestItems.length > 0) {
            syncPesticideRecords(db, recordId, pestItems, {
              ...ctx,
              primaryMethod: pestItems.find((it: any) => it.applicationMethod)?.applicationMethod || '',
              primaryTargetPest: pestItems.find((it: any) => it.targetPest)?.targetPest || '',
            });
          }
        }
      } catch (syncErr) {
        console.error('[plantingDailyRecords] 编辑时施肥/用药同步失败:', (syncErr as Error)?.message || syncErr);
      }
    }

    db.exec('COMMIT');
    saveDatabase();
    const updated = queryToObjects<any>(db, 'SELECT * FROM daily_records WHERE id = ?', [recordId]);
    res.json({ success: true, data: updated[0] || { id: recordId } });
    // 2026-07-22：追溯修复
    writeAuditLog({
      businessType: 'planting.daily_record',
      businessId: id,
      action: 'daily_record_change',
      operatorName: (req.body as any)?.createBy || (req as any).user?.name,
      opinion: `编辑种植日常记录 ${recordId}`,
    });
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch { /* 可能在校验分支已回滚 */ }
    console.error('[plantingDailyRecords] 编辑失败:', error);
    res.status(500).json({ success: false, error: '编辑种植每日记录失败' });
  }
});

/** DELETE /:recordId — 删除每日记录（事务：反向累加 + 恢复同步库存） */
router.delete('/:recordId', (req: Request, res: Response) => {
  let archiveId: string | null = null;
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();

    const pStmt = db.prepare('SELECT end_time FROM plantings WHERE id = ?');
    pStmt.bind([id]);
    const planting = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!planting) return res.status(404).json({ success: false, error: '种植记录不存在' });
    if (planting.end_time) return res.status(400).json({ success: false, error: '种植已结束，无法删除' });

    // 读旧记录
    const oldStmt = db.prepare('SELECT data FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?');
    oldStmt.bind([recordId, id, 'planting']);
    let oldData: any = {};
    if (oldStmt.step()) {
      try { oldData = JSON.parse((oldStmt.getAsObject() as any).data || '{}'); } catch { oldData = {}; }
    }
    oldStmt.free();

    // 2026-10-17：删除前归档（含同步生成的肥料/防治记录快照）
    archiveId = archiveBeforeDelete('daily_record', recordId, {
      operator: { name: (req as any).user?.name, id: (req as any).user?.userId },
      sourcePage: '/crop/planting',
    });

    db.run('DELETE FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?', [recordId, id, 'planting']);

    // 恢复同步库存
    try {
      const { adjustFertilizerStock, adjustPesticideStock, getOldFertilizerSync, getOldPesticideSync } = require('../lib/syncDailyRecords');
      for (const o of getOldFertilizerSync(db, recordId)) adjustFertilizerStock(db, o.code, o.qty);
      for (const o of getOldPesticideSync(db, recordId)) adjustPesticideStock(db, o.code, o.qty);
      db.run('DELETE FROM fertilizer_records WHERE source_daily_record_id = ?', [recordId]);
      db.run('DELETE FROM pesticide_records WHERE source_daily_record_id = ?', [recordId]);
      // 2026-10-18：同步清理浇水记录（原实现遗漏，删除每日记录后留下孤儿浇水行）
      db.run('DELETE FROM watering_records WHERE source_daily_record_id = ?', [recordId]);
    } catch (e) {
      console.error('[plantingDailyRecords] 恢复库存失败:', (e as Error)?.message || e);
    }

    // 反向累加
    if (oldData && Object.keys(oldData).length > 0) {
      applyDailyChangeToPlanting(id, normalizeChangeData(oldData), -1);
    }

    saveDatabase();
    res.json({ success: true });
    // 2026-07-22：追溯修复
    writeAuditLog({
      businessType: 'planting.daily_record',
      businessId: id,
      action: 'daily_record_change',
      operatorName: (req as any).user?.name,
      opinion: `删除种植日常记录 ${recordId}`,
    });
  } catch (error) {
    markArchiveFailed(archiveId, error);
    console.error('[plantingDailyRecords] 删除失败:', error);
    res.status(500).json({ success: false, error: '删除种植每日记录失败' });
  }
});

export default router;
