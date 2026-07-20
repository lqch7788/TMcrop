/**
 * 育苗管理 — 每日记录子路由（2026-07-21 从 seedling.ts 提取）
 * 挂载点：/api/seedlings/:id/daily-records
 */
import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { getDatabase, saveDatabase } from "../db";
import { queryToObjects, execCount } from "../utils/queryHelper";
import { formatLocalDateISO } from "../utils/dateUtil";
import { seedLog } from "../lib/seedLogger";
// 2026-07-21：育苗专用 daily change 函数
import { validateSeedlingDailyChange, normalizeSeedlingChange, applyDailyChangeToSeedling } from "../services/seedlingDailyChange";

const router = Router({ mergeParams: true });
/**
 * 添加每日记录
 * POST /seedlings/:id/daily-records
 */
router.post("/", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      record_date,
      crop_name,
      crop_variety,
      greenhouse_name,
      quantity,
      unit,
      data,
      remarks,
      create_by
    } = req.body;

    // 验证育苗记录是否存在
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let seedling = null;
    if (stmt.step()) {
      seedling = stmt.getAsObject();
    }
    stmt.free();

    if (!seedling || Object.keys(seedling).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    // 2026-06-15: 先做业务上限校验，越界直接 400 拒绝（避免先 INSERT daily_records 再发现越界）
    // 复用 applyDailyChangeToSeedling 的校验逻辑：dryRun 仅校验不写库
    // 兼容旧字段名：survivalCountChange/lossCountChange/plantedCountChange/runnerIncreaseCount → 新字段名
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const normalized = normalizeSeedlingChange(parsed, (seedling as any).propagation_mode);
        const validateErr = validateSeedlingDailyChange(id, normalized);
        if (validateErr) {
          return res.status(400).json({ success: false, error: validateErr });
        }
      } catch (e) { /* JSON 解析失败时 校验跳过，下面 applyDailyChangeToSeedling 内的 try 也会兜底 */ }
    }

    // 生成每日记录ID和OID
    const newId = `DR${Date.now()}`;
    const newOid = `DR-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 插入每日记录
    db.run(`
      INSERT INTO daily_records (
        id, oid, record_type, record_date, related_id, related_code, related_type,
        crop_name, crop_variety, greenhouse_name, quantity, unit, data, remarks,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      newOid,
      'seedling',
      record_date || formatLocalDateISO(),
      id,
      (seedling as any).seedling_code,
      'seedling',
      crop_name || (seedling as any).crop_name,
      crop_variety || (seedling as any).crop_variety,
      greenhouse_name || (seedling as any).greenhouse_name,
      quantity || 0,
      unit || '株',
      data ? JSON.stringify(data) : null,
      remarks,
      create_by,
      now,
      now
    ]);

    // 2026-06-14: 按 propagation_mode 累加到 seedlings 主表
    // 2026-06-15: 兼容旧字段名（survivalCountChange 等）→ 新字段名
    // 2026-07-14：修复静默吞错 — 添加 console.error 并传播错误
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const normalized = normalizeSeedlingChange(parsed, (seedling as any).propagation_mode);
        applyDailyChangeToSeedling(id, normalized, 1);
      } catch (e) {
        console.error('[seedling] applyDailyChangeToSeedling 失败（JSON 解析或数量更新异常）:', e);
      }
    }

    // 2026-07-04 v3：状态机自动切换（合并 sown→in_progress 和 in_progress→transplant_ready）
    // 规则 1：首次添加每日记录 → sown → in_progress
    // 规则 2：累计产出 ≥ 目标成苗数 → in_progress → transplant_ready（优先于规则 1，避免状态来回切换）
    // 失败不抛错：状态切换是"业务增强"，主流程（daily_records 写入）已成功
    // 2026-07-04：用后端原生字符串字面量，不依赖前端 SeedlingStatus 枚举（避免跨层耦合）
    const STATUS_SOWN = 'sown';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_TRANSPLANT_READY = 'transplant_ready';
    try {
      const sStmt = db.prepare('SELECT expanded_plant_count, target_survival_count, status FROM seedlings WHERE id = ?');
      sStmt.bind([id]);
      let sRow: any = null;
      if (sStmt.step()) sRow = sStmt.getAsObject();
      sStmt.free();

      if (sRow) {
        const expanded = Number(sRow.expanded_plant_count) || 0;
        const target = Number(sRow.target_survival_count) || 0;
        const currentStatus = sRow.status;

        // 规则 2 优先（如果已满足出圃条件，直接跳到 transplant_ready）
        if (target > 0 && expanded >= target && currentStatus === STATUS_IN_PROGRESS) {
          db.run(`UPDATE seedlings SET status = ?, update_time = ? WHERE id = ?`,
            [STATUS_TRANSPLANT_READY, now, id]);
          seedLog.info(`✓ 育苗状态自动切换：${currentStatus} → ${STATUS_TRANSPLANT_READY}（${(seedling as any).seedling_code} 累计产出 ${expanded} ≥ 目标 ${target}）`);
        }
        // 规则 1：首次添加每日记录
        else if (currentStatus === STATUS_SOWN) {
          const cntStmt = db.prepare(`SELECT COUNT(*) AS cnt FROM daily_records WHERE related_id = ? AND related_type = ?`);
          cntStmt.bind([id, 'seedling']);
          let firstCount = 0;
          if (cntStmt.step()) firstCount = (cntStmt.getAsObject() as { cnt: number }).cnt;
          cntStmt.free();
          // 当前这次 INSERT 后，COUNT == 1 说明是首次（INSERT 前为 0）
          if (firstCount === 1) {
            db.run(`UPDATE seedlings SET status = ?, update_time = ? WHERE id = ?`,
              [STATUS_IN_PROGRESS, now, id]);
            seedLog.info(`✓ 育苗状态自动切换：sown → ${STATUS_IN_PROGRESS}（${(seedling as any).seedling_code} 首次添加每日记录）`);
          }
        }
      }
    } catch (e) {
      console.error('[seedling daily-record] 状态自动切换失败（非致命）:', e);
    }

    // 2026-07-15：同步施肥/用药子记录到施肥/病虫害管理页（失败不影响主记录）
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const fertItems: any[] = parsed?.fertilizerRecords || [];
        const pestItems: any[] = parsed?.pesticideRecords || [];
        if (fertItems.length > 0 || pestItems.length > 0) {
          const { syncFertilizerRecords, syncPesticideRecords } = require('../lib/syncDailyRecords');
          // 2026-07-15：从 JWT 取操作人；primaryMethod/primaryTargetPest 取首条 item
          const jwtUser3 = (req as any).user;
          const operatorId3 = (req as any).body?.operatorId || jwtUser3?.aid || jwtUser3?.userId || '';
          // 2026-07-15：兼容多种字段名（operatorName / createBy / create_by）+ JWT
          const operatorName3 = (req as any).body?.operatorName
            || (req as any).body?.createBy
            || (req as any).body?.create_by
            || jwtUser3?.name
            || '';
          const primaryFertMethod3 = fertItems.find((it: any) => it.applicationMethod)?.applicationMethod || '';
          const primaryPestMethod3 = pestItems.find((it: any) => it.applicationMethod)?.applicationMethod || '';
          const primaryTargetPest3 = pestItems.find((it: any) => it.targetPest)?.targetPest || '';
          if (fertItems.length > 0) {
            syncFertilizerRecords(db, newId, fertItems, {
              relatedId: id, relatedCode: (seedling as any).seedling_code || '', relatedType: 'seedling',
              recordDate: record_date || formatLocalDateISO(),
              cropName: crop_name || (seedling as any).crop_name || '',
              cropVariety: crop_variety || (seedling as any).crop_variety || '',
              // 2026-07-21：greenhouseName/areaName 优先用幼苗记录自身的字段（中文），请求体 greenhouse_name 仅兜底
              greenhouseName: (seedling as any).greenhouse_name || greenhouse_name || '',
              areaId: (seedling as any).area_id || '',
              areaName: (seedling as any).area_name || (seedling as any).greenhouse_name || greenhouse_name || '',
              operatorId: operatorId3, operatorName: operatorName3,
              primaryMethod: primaryFertMethod3,
            });
          }
          if (pestItems.length > 0) {
            syncPesticideRecords(db, newId, pestItems, {
              relatedId: id, relatedCode: (seedling as any).seedling_code || '', relatedType: 'seedling',
              recordDate: record_date || formatLocalDateISO(),
              cropName: crop_name || (seedling as any).crop_name || '',
              cropVariety: crop_variety || (seedling as any).crop_variety || '',
              greenhouseName: (seedling as any).greenhouse_name || greenhouse_name || '',
              areaId: (seedling as any).area_id || '',
              areaName: (seedling as any).area_name || (seedling as any).greenhouse_name || greenhouse_name || '',
              operatorId: operatorId3, operatorName: operatorName3,
              primaryMethod: primaryPestMethod3,
              primaryTargetPest: primaryTargetPest3,
            });
          }
          // 2026-07-21：浇水字段同步到浇水记录列表
          const wateringData = parsed?.watering != null ? {
            watering: !!parsed.watering,
            wateringMethod: parsed.wateringMethod,
            wateringAmount: parsed.wateringAmount,
            wateringUnit: parsed.wateringUnit,
          } : null;
          if (wateringData?.watering && wateringData.wateringAmount > 0) {
            const { syncWateringRecords } = require('../lib/syncDailyRecords');
            syncWateringRecords(db, newId, wateringData, {
              relatedId: id, relatedCode: (seedling as any).seedling_code || '', relatedType: 'seedling',
              recordDate: record_date || formatLocalDateISO(),
              cropName: crop_name || (seedling as any).crop_name || '',
              cropVariety: crop_variety || (seedling as any).crop_variety || '',
              greenhouseName: (seedling as any).greenhouse_name || greenhouse_name || '',
              areaId: (seedling as any).area_id || '',
              areaName: (seedling as any).area_name || (seedling as any).greenhouse_name || greenhouse_name || '',
              operatorId: operatorId3, operatorName: operatorName3,
            });
          }
        }
      } catch (syncErr) {
        console.error('[seedling daily-records] 施肥/用药/浇水同步失败（不影响主记录）:', (syncErr as Error)?.message || syncErr);
      }
    }

    saveDatabase();
    res.status(201).json({ success: true, data: queryToObjects(db, 'SELECT * FROM daily_records WHERE id = ?', [newId])[0] });
  } catch (error) {
    console.error('添加每日记录失败:', error);
    res.status(500).json({ success: false, error: '添加每日记录失败' });
  }
});

/**
 * 获取育苗的每日记录列表
 * GET /seedlings/:id/daily-records
 */
router.get("/", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 获取该育苗的所有每日记录
    const countSql = 'SELECT COUNT(*) FROM daily_records WHERE related_id = ? AND related_type = ?';
    const countParams = [id, 'seedling'];
    const total = execCount(db, countSql, countParams);

    let sql = 'SELECT * FROM daily_records WHERE related_id = ? AND related_type = ? ORDER BY record_date DESC, create_time DESC';
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ' + Number(limit) + ' OFFSET ' + offset;

    const items = queryToObjects(db, sql, [id, 'seedling']);
    // 2026-06-05: 解析 data JSON 字段还原业务字段（温度/湿度/pH/EC/浇水/成活/定植/损耗/操作员）
    const expandedItems = items.map((it: any) => {
      if (it.data) {
        try {
          const parsed = JSON.parse(it.data);
          return { ...parsed, ...it };  // 业务字段优先，原始字段兜底
        } catch { /* ignore parse error */ }
      }
      return it;
    });

    res.json({
      success: true,
      data: expandedItems,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取每日记录失败:', error);
    res.status(500).json({ success: false, error: '获取每日记录失败' });
  }
});

/**
 * 更新每日记录
 * PUT /seedlings/:id/daily-records/:recordId
 * 2026-06-05: 新增（之前缺失，导致前端编辑/删除失败）
 */
router.put("/:recordId", (req: Request, res: Response) => {
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();
    const now = new Date().toISOString();
    // 2026-07-21：加载育苗记录（浇水同步需要 crop_name/greenhouse_name 等字段）
    const seedling = queryToObjects<Record<string, unknown>>(db, 'SELECT * FROM seedlings WHERE id = ?', [id])[0];

    // 2026-06-14: 先取旧记录算 diff，用于反向补偿 + 正向应用
    const oldStmt = db.prepare('SELECT data FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?');
    oldStmt.bind([recordId, id, 'seedling']);
    let oldData: any = {};
    if (oldStmt.step()) {
      const row = oldStmt.getAsObject() as any;
      try { oldData = row.data ? JSON.parse(row.data) : {}; } catch { oldData = {}; }
    }
    oldStmt.free();

    // 业务字段打包成 data JSON（与 POST 一致：只 stringify data 字段内容，不要嵌套包装）
    const { recordDate, remarks, data } = req.body;
    const dataJson = data ? JSON.stringify(data) : null;

    // 2026-06-15: 编辑场景上限校验
    // 思路：先临时反向抵消旧值，让主表退回到"没有这条记录"的状态，再校验新值是否越界
    //      校验失败必须把旧值补回去，避免数据不一致
    // 兼容旧字段名：调用 normalizeSeedlingChange 把旧字段名映射为新字段名
    if (dataJson !== null) {
      try {
        const newData = JSON.parse(dataJson);
        // 加载育苗记录以获取 propagation_mode
        const sStmt = db.prepare('SELECT propagation_mode FROM seedlings WHERE id = ?');
        sStmt.bind([id]);
        let sRow: any = null;
        if (sStmt.step()) sRow = sStmt.getAsObject();
        sStmt.free();
        const propagationMode = sRow?.propagation_mode || 'one_to_one';
        const newDataNormalized = normalizeSeedlingChange(newData, propagationMode);
        const oldDataNormalized = normalizeSeedlingChange(oldData, propagationMode);
        const hasMeaningfulChange = ['survivalCountChange', 'plantedCountChange', 'lossCountChange', 'runnerIncreaseCount']
          .some(k => Number(oldData[k] ?? 0) !== Number(newData[k] ?? 0));
        if (hasMeaningfulChange) {
          // 1) 临时反向抵消旧值（用 normalized 数据）
          if (oldData && Object.keys(oldData).length > 0) {
            applyDailyChangeToSeedling(id, oldDataNormalized, -1);
          }
          // 2) 校验新值（用 normalized 数据）
          const validateErr = validateSeedlingDailyChange(id, newDataNormalized);
          if (validateErr) {
            // 3) 校验失败：旧值还原回去（避免数据不一致）
            if (oldData && Object.keys(oldData).length > 0) {
              applyDailyChangeToSeedling(id, oldDataNormalized, 1);
            }
            return res.status(400).json({ success: false, error: validateErr });
          }
          // 4) 校验通过：把新值应用上去（用 normalized 数据）
          applyDailyChangeToSeedling(id, newDataNormalized, 1);
        }
      } catch (e) { /* JSON 解析失败时跳过校验 */ }
    }

    const fields = ['update_time = ?'];
    const values: any[] = [now];
    if (recordDate) { fields.push('record_date = ?'); values.push(recordDate); }
    if (dataJson !== null) { fields.push('data = ?'); values.push(dataJson); }
    if (remarks !== undefined) { fields.push('remarks = ?'); values.push(remarks || ''); }
    values.push(recordId, id, 'seedling');

    const result = db.run(
      `UPDATE daily_records SET ${fields.join(', ')} WHERE id = ? AND related_id = ? AND related_type = ?`,
      values
    );

    // 2026-06-15: 上面已经先反向抵消旧值再正向应用新值，此处不再二次 apply diff
    // (原 2026-06-14 的 diff 累加逻辑在新校验流程下会重复累加，已移除)

    // 2026-07-21：编辑场景浇水同步（参照 POST 浇水同步逻辑）
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const wateringData = parsed?.watering != null ? {
          watering: !!parsed.watering,
          wateringMethod: parsed.wateringMethod,
          wateringAmount: parsed.wateringAmount,
          wateringUnit: parsed.wateringUnit,
        } : null;
        if (wateringData?.watering && wateringData.wateringAmount > 0) {
          const { syncWateringRecords } = require('../lib/syncDailyRecords');
          syncWateringRecords(db, recordId, wateringData, {
            relatedId: id, relatedCode: (seedling as any).seedling_code || '', relatedType: 'seedling',
            recordDate: recordDate || (seedling as any).seedling_date || formatLocalDateISO(),
            cropName: (seedling as any).crop_name || '',
            cropVariety: (seedling as any).crop_variety || '',
            greenhouseName: (seedling as any).greenhouse_name || '',
            areaId: (seedling as any).area_id || '',
            areaName: (seedling as any).area_name || (seedling as any).greenhouse_name || '',
            operatorId: (req as any).body?.operatorId || '',
            operatorName: (req as any).body?.operatorName || (req as any).body?.createBy || '',
          });
        } else {
          // 无浇水或水量为 0 → 删除旧同步记录
          db.run('DELETE FROM watering_records WHERE source_daily_record_id = ?', [recordId]);
        }
      } catch (syncErr) {
        console.error('[seedling daily-records PUT] 浇水同步失败（不影响主记录）:', (syncErr as Error)?.message || syncErr);
      }
    }

    saveDatabase();
    const updatedPut = queryToObjects<Record<string, unknown>>(db, 'SELECT * FROM daily_records WHERE id = ?', [recordId]);
    res.json({ success: true, data: updatedPut[0] });
  } catch (error) {
    console.error('更新每日记录失败:', error);
    res.status(500).json({ success: false, error: '更新每日记录失败' });
  }
});

/**
 * 删除每日记录
 * DELETE /seedlings/:id/daily-records/:recordId
 * 2026-06-05: 新增（之前缺失）
 */
router.delete("/:recordId", (req: Request, res: Response) => {
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();

    // 2026-06-14: 删除前先取旧 data，反向累加（sign=-1）回退主表变更
    const oldStmt = db.prepare('SELECT data FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?');
    oldStmt.bind([recordId, id, 'seedling']);
    let oldData: any = {};
    if (oldStmt.step()) {
      const row = oldStmt.getAsObject() as any;
      try { oldData = row.data ? JSON.parse(row.data) : {}; } catch { oldData = {}; }
    }
    oldStmt.free();

    db.run(
      'DELETE FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?',
      [recordId, id, 'seedling']
    );

    // 2026-07-15：恢复同步扣减的库存
    try {
      const { adjustFertilizerStock, adjustPesticideStock, getOldFertilizerSync, getOldPesticideSync } = require('../lib/syncDailyRecords');
      const oldFert = getOldFertilizerSync(db, recordId);
      const oldPest = getOldPesticideSync(db, recordId);
      for (const o of oldFert) adjustFertilizerStock(db, o.code, o.qty);
      for (const o of oldPest) adjustPesticideStock(db, o.code, o.qty);
      db.run('DELETE FROM fertilizer_records WHERE source_daily_record_id = ?', [recordId]);
      db.run('DELETE FROM pesticide_records WHERE source_daily_record_id = ?', [recordId]);
    } catch (e) {
      console.error('[seedling daily-records DELETE] 恢复库存失败（不影响主流程）:', (e as Error)?.message || e);
    }

    // 反向累加（用 -1 把之前 +1 的变更抵消）
    if (oldData && Object.keys(oldData).length > 0) {
      applyDailyChangeToSeedling(id, oldData, -1);
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('删除每日记录失败:', error);
    res.status(500).json({ success: false, error: '删除每日记录失败' });
  }
});


export default router;