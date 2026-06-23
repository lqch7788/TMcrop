/**
 * 种植批次 API 路由
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { writeFlowLog, writeCorrection } from '../services/flowLogService';
import { handleMove } from '../services/plantingMoveHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// C1：全局应用 auth 中间件（演示模式自动放行）
router.use(authenticate);

/**
 * 2026-06-18: 单位字典白名单
 * 与 server/src/db/seedBasicData.ts 的 categoryCode='unit' 字典保持一致
 * 用 zod enum 暴露，safeParse 校验写入值
 */
export const UNIT_ENUM = z.enum(['袋', '株', '粒', '千克', '克', '吨', '亩'])

/**
 * C 阶段 ZP-1：plantings 表允许更新的列白名单
 * 防止 SQL 注入（攻击者通过 `{"id":"...","is_harvest=0; --":"x"}` 改非授权列）
 */
const PLANTING_ALLOWED_UPDATE_COLUMNS = new Set<string>([
  'planting_code', 'plan_type', 'crop_category', 'crop_name', 'crop_variety',
  'greenhouse_id', 'greenhouse_name', 'area_id', 'area_name', 'planting_area', 'planting_area_unit',
  'planting_date', 'expected_harvest_date', 'actual_harvest_date',
  'target_yield', 'target_yield_unit', 'actual_yield', 'planting_quantity', 'harvest_quantity', 'unit',
  'status', 'end_type', 'end_time', 'is_harvest', 'is_deleted',
  'remarks', 'operator_id', 'operator_name', 'production_plan_id', 'production_plan_code',
  'soil_ph', 'soil_ec', 'attrition_rate',
  'is_harvest_locked',  // 2026-06-17: 软锁标志
  'update_time',
]);

/** 通用 UPDATE 白名单过滤：拒绝未知列，返回 {fields, values} */
function buildWhitelistedUpdate(
  updates: Record<string, any>,
  extra: any[] = [],
  allowed: Set<string> = PLANTING_ALLOWED_UPDATE_COLUMNS,
): { fields: string; values: any[]; rejected: string[] } {
  const cols: string[] = [];
  const vals: any[] = [];
  const rejected: string[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'id') continue;
    if (!allowed.has(k)) {
      rejected.push(k);
      continue;
    }
    cols.push(`${k} = ?`);
    vals.push(v);
  }
  return { fields: cols.join(', '), values: [...vals, ...extra], rejected };
}

/**
 * farm_tasks 表允许更新的列白名单（同样防 SQL 注入）
 */
const FARM_TASK_ALLOWED_UPDATE_COLUMNS = new Set<string>([
  'task_code', 'task_title', 'task_type', 'task_content', 'assignee_id', 'assignee_name',
  'greenhouse_id', 'greenhouse_name', 'area_name', 'plan_date', 'plan_time',
  'actual_date', 'status', 'is_completed', 'priority', 'remarks', 'create_by',
  'production_plan_id', 'production_plan_code', 'batch_id', 'batch_code',
  'update_time',
]);

router.get('/', (req: Request, res: Response) => {
  try {
    const { crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 使用 SQL 别名将数据库字段映射到前端期望的字段名
    // LEFT JOIN seedlings + production_plans 获取关联生产计划（育苗→计划链路）
    let baseSql = `SELECT
      p.id,
      p.planting_code AS plantCode,
      p.source_type AS sourceType,
      p.source_id AS sourceId,
      p.source_name AS sourceCode,
      p.crop_code AS cropCode,
      p.crop_name AS cropName,
      p.crop_variety AS cropVariety,
      -- 2026-06-20: 兜底品种路径 — 当 crop_code 在前端 varietyCache 查不到时回填
      cv.category_name AS categoryName,
      cv.type_name AS typeName,
      cv.variety_name AS varietyName,
      cv.sub_variety1_name AS subVariety1Name,
      p.root_name AS rootName,
      (SELECT s.area_id FROM planting_area_stocks s WHERE s.planting_id = p.id ORDER BY s.quantity DESC LIMIT 1) AS areaId,
      (SELECT s.area_name FROM planting_area_stocks s WHERE s.planting_id = p.id ORDER BY s.quantity DESC LIMIT 1) AS areaName,
      COALESCE((SELECT SUM(s.quantity) FROM planting_area_stocks s WHERE s.planting_id = p.id), 0) AS plantingCount,
      p.planting_date AS plantingDate,
      p.soil_ph AS soilPH,
      p.soil_ec AS soilEC,
      p.transplant_count AS transplantCount,
      p.transplant_date AS transplantDate,
      p.is_harvest AS isHarvest,
      p.harvest_date AS harvestDate,
      p.attrition_rate AS attritionRate,
      p.print_count AS printCount,
      p.traceability_code AS traceabilityCode,
      p.pictures,
      p.greenhouse_name AS greenhouseName,
      p.planted_quantity AS plantedQuantity,
      p.survival_quantity AS survivalQuantity,
      p.survival_rate AS survivalRate,
      p.growth_status AS growthStatus,
      p.expected_harvest_date AS expectedHarvestDate,
      p.actual_harvest_date AS actualHarvestDate,
      p.harvest_quantity AS harvestQuantity,
      p.target_yield AS targetYield,
      p.target_yield_unit AS targetYieldUnit,
      p.unit,
      p.status,
      p.remarks,
      p.production_plan_id AS productionPlanId,
      p.production_plan_code AS productionPlanCode,
      -- 2026-06-05: 强结分支字段（与 fixMissingSchema ALTER TABLE 同步）
      p.end_type AS endType,
      p.end_time AS endTime,
      p.is_harvest_locked AS isHarvestLocked,
      p.create_by AS createBy,
      p.create_time AS createTime,
      p.update_time AS updateTime,
      -- 2026-06-17: 4 列聚合（LEFT JOIN + SUM(CASE WHEN destination=...) GROUP BY p.id）
      COALESCE(SUM(CASE WHEN phr.destination = 'harvest' THEN phr.quantity END), 0) AS harvestToInventoryQty,
      COALESCE(SUM(CASE WHEN phr.destination = 'circulate' THEN phr.quantity END), 0) AS residualToSourceQty,
      COALESCE(SUM(CASE WHEN phr.destination = 'self_seed' THEN phr.quantity END), 0) AS selfSeedToSourceQty,
      -- 2026-06-18: 加 dispose 聚合（之前漏了，列表里看不到废弃量）
      COALESCE(SUM(CASE WHEN phr.destination = 'dispose' THEN phr.quantity END), 0) AS disposeQty,
      -- 2026-06-19: 最近一次"采收入库"记录的单位（用户实际入库时选择的单位）
      -- 解决"列表显示单位与入库单位不一致"的 bug（如入库 kg 但显示 株）
      (SELECT unit FROM planting_harvest_records
        WHERE planting_id = p.id AND destination = 'harvest'
        ORDER BY record_date DESC, create_time DESC LIMIT 1) AS harvestToInventoryUnit,
      -- 2026-06-19: 同样为"残株回种源/自交种子/直接废弃"3 列返回最近单位
      (SELECT unit FROM planting_harvest_records
        WHERE planting_id = p.id AND destination = 'circulate'
        ORDER BY record_date DESC, create_time DESC LIMIT 1) AS residualToSourceUnit,
      (SELECT unit FROM planting_harvest_records
        WHERE planting_id = p.id AND destination = 'self_seed'
        ORDER BY record_date DESC, create_time DESC LIMIT 1) AS selfSeedToSourceUnit,
      (SELECT unit FROM planting_harvest_records
        WHERE planting_id = p.id AND destination = 'dispose'
        ORDER BY record_date DESC, create_time DESC LIMIT 1) AS disposeUnit
      -- 2026-06-18: 去掉 circulate_to_inventory（4 个去向变 4 个：harvest/circulate/self_seed/dispose）
    FROM plantings p
    LEFT JOIN planting_harvest_records phr ON phr.planting_id = p.id
    LEFT JOIN crop_varieties cv ON cv.crop_code = p.crop_code
    WHERE p.deleted_at IS NULL`;
    const params: any[] = [];

    if (crop_name) {
      baseSql += ' AND p.crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      baseSql += ' AND p.status = ?';
      params.push(status);
    }

    // COUNT 查询用同样的 WHERE 条件
    // 注意：countSql 不能加 LEFT JOIN，否则 1 个 planting + N 条 harvest records 会被算 N 次
    const countSql = `SELECT COUNT(*) FROM plantings p WHERE p.deleted_at IS NULL` +
      (crop_name ? ' AND p.crop_name LIKE ?' : '') +
      (status ? ' AND p.status = ?' : '');

    // 2026-06-17: GROUP BY p.id 让每个 planting 只出现一次，且 SUM 聚合能正确计算
    baseSql += ' GROUP BY p.id';
    baseSql += ' ORDER BY p.create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    baseSql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, baseSql, params);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取种植记录失败:', error);
    res.status(500).json({ success: false, error: '获取种植记录失败' });
  }
});

// ========== 代码生成 API（必须在 /:id 路由之前）==========

/**
 * 生成种植批号
 * GET /api/plantings/generate-code
 * 格式: ZZ + YYYYMMDD + - + 3位流水号 (如 ZZ20260228-001)
 * 与种源/育苗保持一致；流水号按当日自增（查询当日 MAX+1）
 *
 * 2026-06-22 修复 8 处查重：
 * - SQL 过滤 deleted_at IS NULL（仅 active）
 * - 候选号若与全表（含 soft-deleted）冲突则 +1 重试
 * - 最多 10 次重试；找不到目标 pattern 时返回 null
 */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const db = getDatabase();
    const MAX_RETRIES = 10;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // 查询当日最大序号（仅 active）: ZZ + 8位日期 + - + 3位序号 = 14 字符
      const pattern = `ZZ${dateStr}-___`;
      const stmt = db.prepare(`
        SELECT planting_code FROM plantings
        WHERE planting_code LIKE ? AND LENGTH(planting_code) = 14
          AND (deleted_at IS NULL OR deleted_at = '')
        ORDER BY planting_code DESC LIMIT 1
      `);
      stmt.bind([pattern]);
      let maxSerial = 0;
      if (stmt.step()) {
        const row = stmt.getAsObject() as { planting_code: string };
        maxSerial = parseInt(row.planting_code.slice(-3), 10) || 0;
      }
      stmt.free();

      // 候选号 = MAX+1+尝试次数；先验 active 无冲突，再验全表（含 soft-deleted）无冲突
      const candidate = `ZZ${dateStr}-${String(maxSerial + 1 + attempt).padStart(3, '0')}`;

      // 全表查重：包括软删记录（防历史 conflict）
      const checkStmt = db.prepare(`
        SELECT 1 FROM plantings WHERE planting_code = ? LIMIT 1
      `);
      checkStmt.bind([candidate]);
      const exists = checkStmt.step();
      checkStmt.free();

      if (!exists) {
        return res.json({ success: true, data: candidate });
      }
    }

    // 重试耗尽：返回 null（前端处理）
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成种植批号失败' });
  }
});

/**
 * 获取某 planting 的所有采收记录（按日期降序）
 * GET /api/plantings/:id/harvest-records
 * 注意：必须放在 GET /:id 之前，否则 :id 会吞掉 "harvest-records" 路径段
 */
router.get('/:id/harvest-records', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const items = queryToObjects(
      db,
      `SELECT * FROM planting_harvest_records WHERE planting_id = ? ORDER BY record_date DESC, create_time DESC`,
      [id],
    );
    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('获取采收记录失败:', error);
    res.status(500).json({ success: false, error: '获取采收记录失败' });
  }
});

/**
 * 2026-06-21: 种植移入/移出（整批级别，不依赖 plant_labels 单株粒度）
 * POST /api/plantings/:id/move
 * Body: { operationType, toAreaId, toAreaName, quantity, operationDate, remarks, sourceType, sourceId, sourceCode, targetPlantingId, fromAreaId, fromAreaName }
 * 行为：见 plantingMoveHandler.ts（核心校验 + 事务写入；本路由只做参数提取 + 落盘）
 */
router.post('/:id/move', async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const result = await handleMove(db, id, req.body || {}, (req as any).user || {});
  // 成功提交事务后落盘（handler 内部已 COMMIT；失败不落盘）
  if (result.status === 200) {
    try { saveDatabase(); } catch (e: any) {
      console.error('saveDatabase failed:', e?.message || e);
    }
  }
  res.status(result.status).json(result.body);
});

/**
 * 2026-06-19: 查询种植移入/移出履历
 * GET /api/plantings/:id/move-records
 */
router.get('/:id/move-records', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const items = queryToObjects(
      db,
      `SELECT * FROM planting_move_records WHERE planting_id = ? ORDER BY operation_date DESC, create_time DESC`,
      [id],
    );
    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('获取移入/移出履历失败:', error);
    res.status(500).json({ success: false, error: '获取移入/移出履历失败' });
  }
});

/**
 * 编辑 1 条采收记录（事务原子：反向补偿 + 正向重放）
 * PUT /api/plantings/:id/harvest-records/:recordId
 */
router.put('/:id/harvest-records/:recordId', async (req, res) => {
  try {
    const { id, recordId } = req.params;
    const { recordDate, destination, subType, warehouseId, warehouseName, quantity, unit, notes } = req.body || {};
    const db = getDatabase();
    const now = formatLocalDateISO();

    // 校验 planting 未锁定
    const pStmt = db.prepare('SELECT is_harvest_locked, source_id FROM plantings WHERE id = ?');
    pStmt.bind([id]);
    const planting = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!planting) return res.status(404).json({ success: false, error: '种植记录不存在' });
    if (planting.is_harvest_locked) {
      return res.status(400).json({ success: false, error: '种植已结束，无法编辑采收记录' });
    }

    // 校验记录存在
    const oldStmt = db.prepare('SELECT * FROM planting_harvest_records WHERE id = ? AND planting_id = ?');
    oldStmt.bind([recordId, id]);
    const old = oldStmt.step() ? oldStmt.getAsObject() : null;
    oldStmt.free();
    if (!old) return res.status(404).json({ success: false, error: '采收记录不存在' });

    // 字段校验
    if (!destination) return res.status(400).json({ success: false, error: '缺少 destination' });
    // 2026-06-18: destination 白名单校验（去掉 circulate_to_inventory 后只接受 4 个值）
    const PUT_ALLOWED_DESTINATIONS = ['harvest', 'circulate', 'self_seed', 'dispose'];
    if (!PUT_ALLOWED_DESTINATIONS.includes(destination)) {
      return res.status(400).json({ success: false, error: `destination 必须是 4 个之一: ${PUT_ALLOWED_DESTINATIONS.join(' / ')}` });
    }
    if (destination === 'harvest' && !warehouseId) {
      return res.status(400).json({ success: false, error: '必须选择仓库' });
    }
    if (destination !== 'dispose' && (!quantity || quantity <= 0)) {
      return res.status(400).json({ success: false, error: '数量必须大于 0' });
    }
    // 2026-06-18: dispose 上限校验 — 剩余可废弃 = 种植数量 − Σ(其他 dispose records)
    // 编辑时：新数量 + 当前 old 的旧数量 替换；剩余 = plantingQty − (Σ全部 − old.quantity)
    if (destination === 'dispose' && quantity && Number(quantity) > 0) {
      const disposeSum = db.prepare(
        `SELECT COALESCE(SUM(quantity), 0) AS sum FROM planting_harvest_records WHERE planting_id = ? AND destination = ? AND id != ?`
      );
      disposeSum.bind([id, 'dispose', recordId]);
      const sumRow = disposeSum.step() ? disposeSum.getAsObject() : { sum: 0 };
      disposeSum.free();
      const plantingQty = Number(planting.planting_quantity) || 0;
      const othersDisposed = Number(sumRow.sum) || 0;
      const remaining = plantingQty - othersDisposed;
      if (Number(quantity) > remaining) {
        return res.status(400).json({
          success: false,
          error: `直接废弃数量 ${quantity} 超过剩余可废弃 ${remaining}（种植 ${plantingQty} - 其他已废弃 ${othersDisposed}）`
        });
      }
    }
    // 2026-06-18: 单位字典白名单校验
    const unitParse = UNIT_ENUM.safeParse(unit);
    if (!unitParse.success) {
      return res.status(400).json({ success: false, error: '单位必须是字典中的值（袋/株/粒/千克/克/吨/亩）' });
    }

    // === 反向补偿：删除旧的下游副作用 ===
    if (old.harvest_record_id) {
      db.run('DELETE FROM harvest_records WHERE id = ?', [old.harvest_record_id]);
    }
    if (old.inventory_stock_id) {
      db.run('DELETE FROM inventory_stock WHERE id = ?', [old.inventory_stock_id]);
    }
    if (old.circulation_record_id) {
      db.run('DELETE FROM crop_circulation_records WHERE id = ?', [old.circulation_record_id]);
    }

    // === 正向重放：写新下游副作用（与 POST 路由同逻辑） ===
    let generatedHarvestId: string | null = null;
    let generatedStockId: string | null = null;
    let generatedCircId: string | null = null;

    if (destination === 'harvest') {
      // 同 POST 路由 harvest 分支（行 950-1008）
      const whRow = db.prepare('SELECT name FROM warehouses WHERE id = ? OR oid = ? LIMIT 1').get([warehouseId, warehouseId]) as any;
      const realWarehouseName = whRow?.name || warehouseName || warehouseId;
      const dateStr = recordDate || now.split('T')[0];
      generatedHarvestId = `HV${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      const harvestCode = `HV${dateStr}-${String(Date.now()).slice(-4)}`;
      generatedStockId = `STK${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
      const harvestUnit = unit || old.unit || 'g';

      const hvStmt = db.prepare(`
        INSERT INTO harvest_records (
          id, harvest_code, source_id, source_name, crop_name, crop_variety,
          greenhouse_id, greenhouse_name, harvest_date, harvest_quantity, unit, unit_price,
          total_amount, quality_grade, buyer_id, buyer_name, sales_channel, status,
          remarks, create_by, create_time, update_time, warehouse_id, auditor_id,
          harvester_ids, harvester_names, inbound_type, batch_code,
          create_by_id, planting_mode, target_yield, harvest_area, products, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      hvStmt.run([
        generatedHarvestId, harvestCode, id, old.planting_code,
        old.crop_name || '', old.crop_variety || '',
        null, null, dateStr, quantity, harvestUnit, 0,
        0, null, null, null, null, 'completed',
        notes || '', old.create_by || 'system', now, now, warehouseId, null,
        null, null, 'planting_harvest', old.planting_code,
        null, null, 0, 0, null, null,
      ]);
      hvStmt.free();

      const stockStmt = db.prepare(`
        INSERT INTO inventory_stock (
          id, instance_id, stock_type, business_id, business_type, business_code,
          crop_id, crop_name, variety_id, variety_name,
          current_quantity, frozen_quantity, available_quantity, unit,
          warehouse_id, warehouse_name, inbound_date, source_type,
          production_plan_code, source_instance_id, status, version,
          create_time, update_time,
          crop_code, planting_mode, target_yield, grade, auditor, remarks, greenhouse_name,
          supplier_id, supplier_name, unit_price, total_amount, purchase_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stockStmt.run([
        generatedStockId, `IPR${dateStr}-${String(Date.now()).slice(-4)}`, 'harvest',
        generatedHarvestId, 'harvest', harvestCode,
        null, old.crop_name || '', null, old.crop_variety || '',
        quantity, 0, quantity, harvestUnit,
        warehouseId, realWarehouseName, dateStr, 'self_produced',
        null, null, 'in_stock', 1,
        now, now,
        null, null, 0, null, null, notes || '', null,
        null, null, 0, 0, null,
      ]);
      stockStmt.free();
    } else if (destination === 'dispose') {
      // DISPOSAL 不走 executeCirculation（与 POST 路由一致）
      const circId = `CIRC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        db.run(
          `INSERT INTO crop_circulation_records (id, circulation_type, source_module, source_id, parent_source_id, quantity, unit, circulation_date, notes, disposition) VALUES (?, 'DISPOSAL', 'planting', ?, NULL, ?, ?, ?, ?, 'DISPOSAL')`,
          [circId, id, Number(quantity) || 0, unit || '', recordDate || now.split('T')[0], notes || '']
        );
        generatedCircId = circId;
      } catch (e) {
        console.error('[harvest-records PUT/dispose] write circulation failed:', e);
      }
    } else if (destination === 'circulate' || destination === 'self_seed') {
      if (!planting.source_id) {
        return res.status(400).json({ success: false, error: '该种植记录无种源，无法回流' });
      }
      // 自交种子强制 seed_saving；QUANTITY 类型不需要 subType
      let finalSubType: string | undefined;
      if (destination === 'self_seed') {
        finalSubType = 'seed_saving';
      } else if (subType === 'quantity_refill') {
        finalSubType = undefined;
      } else {
        finalSubType = subType;
      }
      const circType = subType === 'quantity_refill' ? 'QUANTITY' : 'PROPAGATION';
      // 动态 require 避免循环依赖（与 POST 路由一致）
      const { executeCirculation } = require('../services/circulation.service');
      const result = executeCirculation({
        circulationType: circType,
        sourceModule: 'planting',
        sourceId: id,
        parentSourceId: planting.source_id,
        subType: finalSubType,
        destination: 'seed_source',
        quantity, unit, notes,
      });
      if (result?.circulationId) generatedCircId = result.circulationId;
    }

    // UPDATE planting_harvest_records
    db.run(
      `UPDATE planting_harvest_records SET
        record_date = ?, destination = ?, sub_type = ?, warehouse_id = ?, warehouse_name = ?,
        quantity = ?, unit = ?, notes = ?, update_time = ?,
        harvest_record_id = ?, inventory_stock_id = ?, circulation_record_id = ?
       WHERE id = ? AND planting_id = ?`,
      [
        recordDate || now.split('T')[0], destination, subType || null, warehouseId || null, warehouseName || null,
        quantity, unit || 'g', notes || null, now,
        generatedHarvestId, generatedStockId, generatedCircId,
        recordId, id,
      ]
    );

    saveDatabase();
    res.json({ success: true, data: { id: recordId } });
  } catch (e: any) {
    console.error('编辑采收记录失败:', e);
    res.status(400).json({ success: false, error: e.message });
  }
});

/**
 * 删除 1 条采收记录（事务原子：反向补偿）
 * DELETE /api/plantings/:id/harvest-records/:recordId
 */
router.delete('/:id/harvest-records/:recordId', (req, res) => {
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();
    const now = formatLocalDateISO();

    // 校验 planting 未锁定
    const pStmt = db.prepare('SELECT is_harvest_locked FROM plantings WHERE id = ?');
    pStmt.bind([id]);
    const p = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!p) return res.status(404).json({ success: false, error: '种植记录不存在' });
    if (p.is_harvest_locked) {
      return res.status(400).json({ success: false, error: '种植已结束，无法删除' });
    }

    // 读旧记录以反向补偿
    const oldStmt = db.prepare('SELECT harvest_record_id, inventory_stock_id, circulation_record_id FROM planting_harvest_records WHERE id = ? AND planting_id = ?');
    oldStmt.bind([recordId, id]);
    const old = oldStmt.step() ? oldStmt.getAsObject() : null;
    oldStmt.free();
    if (!old) return res.status(404).json({ success: false, error: '采收记录不存在' });

    // 反向补偿：删除下游副作用
    if (old.harvest_record_id) {
      db.run('DELETE FROM harvest_records WHERE id = ?', [old.harvest_record_id]);
    }
    if (old.inventory_stock_id) {
      db.run('DELETE FROM inventory_stock WHERE id = ?', [old.inventory_stock_id]);
    }
    if (old.circulation_record_id) {
      db.run('DELETE FROM crop_circulation_records WHERE id = ?', [old.circulation_record_id]);
    }

    // DELETE planting_harvest_records
    db.run('DELETE FROM planting_harvest_records WHERE id = ?', [recordId]);

    // 如果该 planting 没有任何采收记录了，status 回退到 growing
    const cnt = execCount(db, 'SELECT COUNT(*) FROM planting_harvest_records WHERE planting_id = ?', [id]);
    if (cnt === 0) {
      db.run('UPDATE plantings SET status = ?, update_time = ? WHERE id = ?', ['growing', now, id]);
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('删除采收记录失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM plantings WHERE id = ? AND deleted_at IS NULL');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '种植记录不存在' });
    }

    // 2026-06-19: 附加最近一次"采收入库/残株回种源/自交种子/直接废弃"记录的单位（与列表接口一致）
    const unitRows = queryToObjects<any>(db,
      `SELECT destination, unit FROM planting_harvest_records
       WHERE planting_id = ?
       ORDER BY record_date DESC, create_time DESC`,
      [id],
    );
    const seen = new Set<string>();
    for (const row of unitRows) {
      const dest = row.destination;
      if (!dest || seen.has(dest)) continue;
      if (dest === 'harvest') item.harvestToInventoryUnit = row.unit || '';
      else if (dest === 'circulate') item.residualToSourceUnit = row.unit || '';
      else if (dest === 'self_seed') item.selfSeedToSourceUnit = row.unit || '';
      else if (dest === 'dispose') item.disposeUnit = row.unit || '';
      seen.add(dest);
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取种植详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body;

    // 统一字段映射（支持前端驼峰和后端下划线命名）
    const finalPlantCode = body.planting_code || body.plantCode || `PL${Date.now()}`;
    const newId = body.id || `PL${Date.now()}`;
    const now = new Date().toISOString();

    const finalSourceType = body.source_type || body.sourceType || '';
    const finalSourceId = body.source_id || body.sourceId || '';
    const finalSourceName = body.source_name || body.sourceCode || '';

    const finalCropName = body.crop_name || body.cropName || '';
    const finalCropVariety = body.crop_variety || body.cropVariety || '';
    const finalCropCode = body.crop_code || body.cropCode || '';

    const finalAreaId = body.area_id || body.areaId || '';
    const finalAreaName = body.area_name || body.areaName || '';
    const finalRootName = body.root_name || body.rootName || '';
    const finalGreenhouseName = body.greenhouse_name || body.greenhouseName || '';

    const finalPlantingDate = body.planting_date || body.plantingDate || '';
    const finalPlantingQuantity = body.planting_quantity || body.plantingCount || 0;
    const finalPlantedQuantity = body.planted_quantity || body.plantedQuantity || 0;
    const finalSurvivalQuantity = body.survival_quantity || 0;
    const finalSurvivalRate = body.survival_rate || body.survivalRate || 0;

    const finalGrowthStatus = body.growth_status || body.growthStatus || '';
    const finalExpectedHarvestDate = body.expected_harvest_date || body.expectedHarvestDate || '';
    const finalStatus = body.status || 'planted';
    const finalRemarks = body.remarks || '';

    const finalCreateBy = body.create_by || body.createBy || '';

    const finalSoilPh = body.soil_ph || body.soilPH || 0;
    const finalSoilEc = body.soil_ec || body.soilEC || 0;
    const finalAttritionRate = body.attrition_rate || body.attritionRate || 0;
    // 2026-06-18: 目标产量（完成比例 = harvestToInventoryQty / target_yield）
    const finalTargetYield = body.target_yield || body.targetYield || 0;
    const finalTargetYieldUnit = body.target_yield_unit || body.targetYieldUnit || '克';
    const finalTransplantCount = body.transplant_count || body.transplantCount || 0;
    const finalTransplantDate = body.transplant_date || body.transplantDate || '';
    const finalIsHarvest = body.is_harvest ?? (body.isHarvest ? 1 : 0);
    const finalHarvestDate = body.harvest_date || body.harvestDate || '';
    const finalHarvestQuantity = body.harvest_quantity || 0;
    const finalPrintCount = body.print_count || 0;
    const finalTraceabilityCode = body.traceability_code || body.traceabilityCode || '';
    // 2026-06-18: 强制 stringify — 前端可能传 数组/对象/string
    // sql.js TEXT 列只能绑定 string，array/object 会触发 "unknown type ([object Object])" 报错
    const finalPictures = typeof body.pictures === 'string'
      ? body.pictures
      : JSON.stringify(body.pictures || []);
    const finalProductionPlanId = body.production_plan_id || body.productionPlanId || '';
    const finalProductionPlanCode = body.production_plan_code || body.productionPlanCode || '';

    const db = getDatabase();

    // 2026-06-22 修复 8 处查重：POST 前全表查重（含软删记录）
    // 防止前端传重复的 planting_code
    const dupStmt = db.prepare(`
      SELECT 1 FROM plantings WHERE planting_code = ? LIMIT 1
    `);
    dupStmt.bind([finalPlantCode]);
    if (dupStmt.step()) {
      dupStmt.free();
      return res.status(400).json({ success: false, error: `编号 ${finalPlantCode} 已存在` });
    }
    dupStmt.free();

    // 事务开始：扣减来源数量 + 插入种植记录 + 写物料流转流水
    db.exec('BEGIN');
    try {
      let flowType = 'external→planting'; // 默认外部来源

      // 根据来源类型扣减上游数量（兼容小写和大写）
      const lowerSourceType = finalSourceType.toLowerCase();
      if (lowerSourceType === 'seed' || lowerSourceType === 'seed_source') {
        if (finalSourceId) {
          // 扣减种源 remaining_quantity
          const chk = db.exec('SELECT remaining_quantity FROM seed_sources WHERE id = ? AND deleted_at IS NULL', [finalSourceId]);
          const remaining = Number(chk[0]?.values?.[0]?.[0] || 0);
          if (remaining >= finalPlantingQuantity) {
            db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?',
              [finalPlantingQuantity, now, finalSourceId]);
          }
        }
        flowType = 'seed_source→planting';
      } else if (lowerSourceType === 'seedling') {
        if (finalSourceId) {
          // 2026-06-15: 数量体系重构 — 统一可定植量公式（1:1 / 1:多 同公式）
          // 可定植量 = mother_plant_count + expanded_plant_count - seedling_loss_count
          //              - transplanted_count - auto_planted_count - harvest_stocked_count
          const chk = db.exec(
            "SELECT propagation_mode, mother_plant_count, expanded_plant_count, seedling_loss_count, transplanted_count, auto_planted_count, harvest_stocked_count FROM seedlings WHERE id = ? AND deleted_at IS NULL",
            [finalSourceId]
          );
          if (!chk[0]?.values?.[0]) {
            try { db.exec('ROLLBACK'); } catch {}
            return res.status(404).json({ success: false, error: '育苗记录不存在' });
          }
          const mother = Number(chk[0].values[0][1] || 0);
          const expanded = Number(chk[0].values[0][2] || 0);
          const seedlingLoss = Number(chk[0].values[0][3] || 0);
          const transplanted = Number(chk[0].values[0][4] || 0);
          const autoPlanted = Number(chk[0].values[0][5] || 0);
          const harvestStocked = Number(chk[0].values[0][6] || 0);
          // 统一公式
          const available = mother + expanded - seedlingLoss - transplanted - autoPlanted - harvestStocked;
          if (available < finalPlantingQuantity) {
            try { db.exec('ROLLBACK'); } catch {}
            return res.status(400).json({
              success: false,
              error: `可定植余量不足：当前 ${available}（母株+扩繁-损耗-已定植-自动定植-已采收），需 ${finalPlantingQuantity}`
            });
          }
          // 2026-06-15: 累加到 auto_planted_count（不再累加到 planted_count）
          db.run('UPDATE seedlings SET auto_planted_count = auto_planted_count + ? WHERE id = ?',
            [finalPlantingQuantity, finalSourceId]);
        }
        flowType = 'seedling→planting';
      }

      // 插入种植记录
      db.run(`
        INSERT INTO plantings (
          id, planting_code, source_type, source_id, source_name, crop_name, crop_variety, crop_code,
          area_id, area_name, root_name, greenhouse_name, planting_date, planting_quantity, planted_quantity,
          survival_quantity, survival_rate, growth_status, expected_harvest_date, status, remarks, create_by, create_time, update_time,
          soil_ph, soil_ec, attrition_rate, target_yield, target_yield_unit, transplant_count, transplant_date, is_harvest, harvest_date,
          harvest_quantity, print_count, traceability_code, pictures, production_plan_id, production_plan_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId, finalPlantCode, finalSourceType, finalSourceId, finalSourceName,
        finalCropName, finalCropVariety, finalCropCode,
        finalAreaId, finalAreaName, finalRootName, finalGreenhouseName, finalPlantingDate,
        finalPlantingQuantity, finalPlantedQuantity,
        finalSurvivalQuantity, finalSurvivalRate, finalGrowthStatus, finalExpectedHarvestDate,
        finalStatus, finalRemarks, finalCreateBy, now, now,
        finalSoilPh, finalSoilEc, finalAttritionRate, finalTargetYield, finalTargetYieldUnit, finalTransplantCount, finalTransplantDate,
        finalIsHarvest, finalHarvestDate, finalHarvestQuantity, finalPrintCount, finalTraceabilityCode,
        finalPictures, finalProductionPlanId, finalProductionPlanCode
      ]);

      // 写入 material_flow_log 流转流水
      writeFlowLog({
        flow_type: flowType,
        crop_name: finalCropName,
        crop_variety: finalCropVariety,
        source_type: finalSourceType || null,
        source_id: finalSourceId || null,
        source_code: finalSourceName || null,
        source_quantity: finalPlantingQuantity,
        source_unit: '株',
        source_category: null,
        target_type: 'planting',
        target_id: newId,
        target_code: finalPlantCode,
        target_quantity: finalPlantingQuantity,
        target_unit: '株',
        business_code: finalPlantCode,
        created_by: finalCreateBy,
      });

      db.exec('COMMIT');
      saveDatabase();
      res.status(201).json({ success: true, data: { id: newId } });
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }
  } catch (error) {
    console.error('创建种植记录失败:', error);
    res.status(500).json({ success: false, error: '创建种植记录失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 数量变更检测：UPDATE 前先查旧值，用于 correction 补偿流水
    const plantingQtyChanged = updates.planting_quantity !== undefined || updates.plantingQuantity !== undefined;
    let oldPlantingQty = 0;
    let oldCropName = '';
    let oldCropVariety = '';
    let oldSourceType = '';
    let oldSourceId = '';
    if (plantingQtyChanged) {
      try {
        const oldChk = db.exec('SELECT planting_quantity, crop_name, crop_variety, source_type, source_id FROM plantings WHERE id = ?', [id]);
        oldPlantingQty = Number(oldChk[0]?.values?.[0]?.[0] || 0);
        oldCropName = (oldChk[0]?.values?.[0]?.[1] as string) || '';
        oldCropVariety = (oldChk[0]?.values?.[0]?.[2] as string) || '';
        oldSourceType = String(oldChk[0]?.values?.[0]?.[3] || '').toLowerCase();
        oldSourceId = String(oldChk[0]?.values?.[0]?.[4] || '');
      } catch {}
    }

    const { fields, values, rejected } = buildWhitelistedUpdate(updates, [now, id]);
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有可更新的合法字段' });
    }
    if (rejected.length > 0) {
      // 静默忽略非法字段（保持原行为兼容老接口）；可按需改成 400
      console.warn(`[ZP-1] rejected unknown columns: ${rejected.join(', ')}`);
    }

    db.run(`UPDATE plantings SET ${fields}, update_time = ? WHERE id = ?`, values);

    // correction 补偿流水 + 上游增量补偿
    if (plantingQtyChanged) {
      try {
        const newQty = updates.planting_quantity ?? updates.plantingQuantity ?? 0;
        const delta = newQty - oldPlantingQty;
        if (Math.abs(delta) > 0.001) {
          writeCorrection({
            flow_type: 'external→planting',
            target_type: 'planting',
            target_id: id,
            source_quantity_delta: delta,
            source_unit: '株',
            crop_name: oldCropName,
            crop_variety: oldCropVariety,
          });
          // 2026-06-14: 上游增量补偿
          // delta > 0 多用了 → 种源扣减 / 育苗已定植 +delta
          // delta < 0 少用了 → 种源归还 / 育苗已定植 -delta
          if (oldSourceType === 'seed' && oldSourceId) {
            db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?',
              [delta, now, oldSourceId]);
          } else if (oldSourceType === 'seedling' && oldSourceId) {
            db.run('UPDATE seedlings SET auto_planted_count = auto_planted_count - ?, update_time = ? WHERE id = ?',
              [delta, now, oldSourceId]);
          }
        }
      } catch {}
    }

    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新种植记录失败' });
  }
});

// 批量操作路由必须在 /:id 之前定义，否则 /batch 会被当作 :id 参数

/**
 * 批量获取种植记录
 * GET /api/plantings/batch?ids=id1,id2,id3
 */
router.get('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 ids 参数' });
    }

    const idArray = ids.split(',').filter(id => id.trim() !== '');
    if (idArray.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const db = getDatabase();
    const placeholders = idArray.map(() => '?').join(',');
    const sql = `SELECT * FROM plantings WHERE id IN (${placeholders})`;
    const items = queryToObjects(db, sql, idArray);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量获取种植记录失败' });
  }
});

/**
 * 批量更新种植记录
 * PUT /api/plantings/batch
 */
router.put('/batch', (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 ids 参数或 ids 不是有效数组' });
    }
    if (ids.length > 200) {
      return res.status(400).json({ success: false, error: '批量更新最多 200 条' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: '缺少 updates 参数或 updates 不是有效对象' });
    }

    const now = new Date().toISOString();
    const db = getDatabase();

    const { fields, values, rejected } = buildWhitelistedUpdate(updates, [now]);
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有可更新的合法字段' });
    }
    if (rejected.length > 0) {
      console.warn(`[ZP-1 batch] rejected unknown columns: ${rejected.join(', ')}`);
    }

    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE plantings SET ${fields}, update_time = ? WHERE id IN (${placeholders})`, [...values, ...ids]);

    saveDatabase();
    res.json({ success: true, data: { ids, updated: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量更新种植记录失败' });
  }
});

/**
 * 批量删除种植记录
 * DELETE /api/plantings/batch?ids=id1,id2,id3
 */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 ids 参数' });
    }
    const idArray = ids.split(',').filter(id => id.trim() !== '');
    if (idArray.length === 0) {
      return res.json({ success: true, data: { deletedCount: 0 } });
    }
    const db = getDatabase();
    const now = new Date().toISOString();
    const placeholders = idArray.map(() => '?').join(',');
    db.run(`UPDATE plantings SET deleted_at = ? WHERE id IN (${placeholders})`, [now, ...idArray]);
    saveDatabase();
    res.json({ success: true, data: { deletedCount: idArray.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除种植记录失败' });
  }
});

/**
 * 检查种植记录是否可删除（是否被标签引用）
 * GET /api/plantings/:id/check-deletable
 */
router.get('/:id/check-deletable', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const cntResult = db.exec(
      'SELECT COUNT(*) as cnt FROM plant_labels WHERE planting_id = ? AND move_in_area_name IS NOT NULL',
      [id]
    );
    const labelCount = Number(cntResult[0]?.values[0]?.[0]) || 0;
    res.json({ success: true, data: { deletable: labelCount === 0, labelCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: '检查删除失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const now = new Date().toISOString();

    // 2026-06-14: 删除前先取 source_type/source_id/planting_quantity 用于反向累加
    const stmt = db.prepare('SELECT source_type, source_id, planting_quantity FROM plantings WHERE id = ?');
    stmt.bind([id]);
    let row: any = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();

    // 软删除：标记 deleted_at 而非物理删除
    db.run('UPDATE plantings SET deleted_at = ? WHERE id = ?', [now, id]);

    // 2026-06-14: 反向累加到上游
    if (row) {
      try {
        const qty = Number(row.planting_quantity) || 0;
        const stype = String(row.source_type || '').toLowerCase();
        const sid = row.source_id;
        if (qty > 0 && sid) {
          if (stype === 'seedling') {
            // 育苗 → 回滚 seedlings.auto_planted_count
            db.run('UPDATE seedlings SET auto_planted_count = auto_planted_count - ? WHERE id = ?', [qty, sid]);
          } else if (stype === 'seed') {
            // 种源 → 回滚 seed_sources.remaining_quantity
            db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity + ? WHERE id = ?', [qty, sid]);
          }
        }
      } catch (e) {
        // 反向累加失败不影响主流程（删除已生效）
        console.error('[planting DELETE] 反向累加失败:', e);
      }
    }

    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除种植记录失败' });
  }
});

// 采收路由 - 更新种植记录的采收状态和采收数量
router.post('/:id/harvest', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { harvest_quantity, harvest_date } = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 检查种植记录是否存在
    const stmt = db.prepare('SELECT id FROM plantings WHERE id = ?');
    stmt.bind([id]);
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      return res.status(404).json({ success: false, error: '种植记录不存在' });
    }

    // 更新采收状态和采收数量
    db.run(
      `UPDATE plantings SET is_harvest = 1, harvest_date = ?, harvest_quantity = ?, status = 'harvested', update_time = ? WHERE id = ?`,
      [harvest_date || now, harvest_quantity || 0, now, id]
    );
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '采收操作失败' });
  }
});

// ========== 辅助查询 API ==========

/**
 * 根据来源ID获取种植记录
 * GET /api/plantings/source/:sourceId
 */
router.get('/source/:sourceId', (req: Request, res: Response) => {
  try {
    const { sourceId } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM plantings WHERE source_id = ? AND deleted_at IS NULL ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, [sourceId]);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取来源种植记录失败' });
  }
});

/**
 * 获取未采收的种植列表
 * GET /api/plantings/unharvested
 */
router.get('/unharvested', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const sql = "SELECT * FROM plantings WHERE deleted_at IS NULL AND status != 'harvested' ORDER BY create_time DESC";
    const items = queryToObjects(db, sql, []);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取未采收种植记录失败' });
  }
});

/**
 * 获取已采收的种植列表
 * GET /api/plantings/harvested
 */
router.get('/harvested', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const sql = "SELECT * FROM plantings WHERE deleted_at IS NULL AND status = 'harvested' ORDER BY actual_harvest_date DESC";
    const items = queryToObjects(db, sql, []);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取已采收种植记录失败' });
  }
});

/**
 * 重置种植数据到默认状态
 * POST /api/plantings/reset
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 先删除所有现有数据
    db.run('DELETE FROM plantings');

    // 插入默认数据
    const defaultData = [
      ['PL001', 'ZZ2026-001-01', 'seedling', 'SD001', 'YM2026-001', '番茄', '红果番茄', '', '', '', '一棚', '01区', '2026-03-01', 40000, 40000, 38000, 95, '生长期', '2026-05-01', null, 0, 'planted', '长势良好', '李明辉', '2026-03-01 09:00:00', '2026-04-20 16:00:00'],
      ['PL002', 'ZZ2026-002-01', 'seed', 'SS003', 'ZZ2026-003', '黄瓜', '水果黄瓜', '', '', '', '一棚', '02区', '2026-03-15', 5000, 5000, 4850, 97, '已采收', '2026-04-15', '2026-04-15', 4800, 'harvested', '第一批采收完成', '王建国', '2026-03-15 10:00:00', '2026-04-15 18:00:00']
    ];

    for (const item of defaultData) {
      db.run(`
        INSERT INTO plantings (id, planting_code, source_type, source_id, source_name, crop_name, crop_variety, crop_code,
          area_id, area_name, root_name, greenhouse_name, planting_date, planting_quantity, planted_quantity,
          survival_quantity, survival_rate, growth_status, expected_harvest_date, actual_harvest_date,
          harvest_quantity, status, remarks, create_by, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, item);
    }

    saveDatabase();
    res.json({ success: true, message: '种植数据已重置' });
  } catch (error) {
    console.error('重置种植数据失败:', error);
    res.status(500).json({ success: false, error: '重置种植数据失败' });
  }
});

// ========== 田间管理每日记录 API ==========

/**
 * 获取田间管理每日记录列表
 * GET /api/plantings/daily-records
 */
router.get('/daily-records', (req: Request, res: Response) => {
  try {
    const { greenhouse_name, crop_name, record_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = `SELECT * FROM farm_tasks WHERE task_type IN ('日常管理', '浇水', '施肥', '除草', '病虫害防治') AND 1=1`;
    const params: any[] = [];

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    if (crop_name) {
      sql += ' AND task_content LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (record_date) {
      sql += ' AND plan_date = ?';
      params.push(record_date);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    const total = execCount(db, countSql, params);

    sql += ' ORDER BY plan_date DESC, plan_time DESC';
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);
    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取田间管理记录失败' });
  }
});

/**
 * 创建田间管理每日记录
 * POST /api/plantings/daily-records
 */
router.post('/daily-records', (req: Request, res: Response) => {
  try {
    const { task_code, task_title, task_type, task_content, assignee_name,
            greenhouse_name, area_name, plan_date, plan_time, batch_id, batch_code, create_by } = req.body;

    const newId = `FM${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO farm_tasks (id, task_code, task_title, task_type, task_content, assignee_name,
        greenhouse_name, area_name, plan_date, plan_time, batch_id, batch_code, status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, task_code || `FM${Date.now()}`, task_title, task_type || '日常管理', task_content,
        assignee_name, greenhouse_name, area_name, plan_date, plan_time || '08:00',
        batch_id, batch_code, 'completed', create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建田间管理记录失败:', error);
    res.status(500).json({ success: false, error: '创建田间管理记录失败' });
  }
});

/**
 * 更新田间管理每日记录
 * PUT /api/plantings/daily-records/:id
 */
router.put('/daily-records/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    const { fields, values, rejected } = buildWhitelistedUpdate(updates, [now, id], FARM_TASK_ALLOWED_UPDATE_COLUMNS);
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有可更新的合法字段' });
    }
    if (rejected.length > 0) {
      console.warn(`[ZP-1 farm_task] rejected unknown columns: ${rejected.join(', ')}`);
    }

    db.run(`UPDATE farm_tasks SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新田间管理记录失败' });
  }
});

/**
 * 删除田间管理每日记录
 * DELETE /api/plantings/daily-records/:id
 */
router.delete('/daily-records/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM farm_tasks WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除田间管理记录失败' });
  }
});

// ============================================================
// V2 改造: 种植结束路由 (任务 10: Phase 2, 2026-06-17 修 5 个分支全跑通)
// 5 种结束方式:
//   - harvest(采收入库) → 写 harvest_records + inventory_stock, status='harvested'
//   - circulate(残株回种源) → status='ended'
//   - self_seed(自交种子入种源) → status='ended'
//   - dispose(直接废弃) → status='cancelled'
// 公共收尾: UPDATE plantings SET status, end_type, end_time, update_time
// ============================================================
// ============================================
// 2026-06-17: 种植采收记录 V2 路由 (Phase 1)
// 4 个路由：CRUD + 副作用路由（搬运 /end 路由 4 个分支代码：harvest/circulate/self_seed/dispose）
// 2026-06-18: 去掉 circulate_to_inventory（4 个去向变 4 个）
// ============================================
router.post('/:id/harvest-records', async (req, res) => {
  try {
    const { id } = req.params
    const {
      recordDate, destination, subType, warehouseId, warehouseName,
      quantity, unit, notes, operatorName, createBy, createById
    } = req.body || {}

    if (!destination) return res.status(400).json({ success: false, error: '缺少 destination' })
    // 2026-06-18: destination 白名单校验（去掉 circulate_to_inventory 后只接受 4 个值）
    const POST_ALLOWED_DESTINATIONS = ['harvest', 'circulate', 'self_seed', 'dispose']
    if (!POST_ALLOWED_DESTINATIONS.includes(destination)) {
      return res.status(400).json({ success: false, error: `destination 必须是 4 个之一: ${POST_ALLOWED_DESTINATIONS.join(' / ')}` })
    }

    const db = getDatabase()
    // sql.js 标准模式：bind + step + getAsObject（与 /end 路由一致）
    const stmt = db.prepare('SELECT * FROM plantings WHERE id = ?')
    stmt.bind([id])
    const planting = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    if (!planting) return res.status(404).json({ success: false, error: '种植记录不存在' })
    if (planting.is_harvest_locked) {
      return res.status(400).json({ success: false, error: '种植已结束，无法添加采收记录' })
    }

    // destination 必填字段校验（与设计文档 §4.1 对齐）
    if (destination === 'harvest' && !warehouseId) {
      return res.status(400).json({ success: false, error: '必须选择仓库' })
    }
    if (destination !== 'dispose' && (!quantity || quantity <= 0)) {
      return res.status(400).json({ success: false, error: '数量必须大于 0' })
    }
    // 2026-06-18: dispose 上限校验 — 剩余可废弃 = 种植数量 − Σ已dispose
    // 防止"超过种植数量"的废弃数据脏掉统计
    if (destination === 'dispose' && quantity && Number(quantity) > 0) {
      const disposeSum = db.prepare(
        `SELECT COALESCE(SUM(quantity), 0) AS sum FROM planting_harvest_records WHERE planting_id = ? AND destination = ?`
      )
      disposeSum.bind([id, 'dispose'])
      const sumRow = disposeSum.step() ? disposeSum.getAsObject() : { sum: 0 }
      disposeSum.free()
      const plantingQty = Number(planting.planting_quantity) || 0
      const alreadyDisposed = Number(sumRow.sum) || 0
      const remaining = plantingQty - alreadyDisposed
      if (Number(quantity) > remaining) {
        return res.status(400).json({
          success: false,
          error: `直接废弃数量 ${quantity} 超过剩余可废弃 ${remaining}（种植 ${plantingQty} - 已废弃 ${alreadyDisposed}）`
        })
      }
    }
    // 2026-06-18: 单位字典白名单校验
    const postUnitParse = UNIT_ENUM.safeParse(unit)
    if (!postUnitParse.success) return res.status(400).json({ success: false, error: '单位必须是字典中的值（袋/株/粒/千克/克/吨/亩）' })

    const now = formatLocalDateISO()
    const harvestRecordId = `PHR${Date.now()}`
    const plantingId = id
    let generatedHarvestId: string | null = null
    let generatedStockId: string | null = null
    let generatedCircId: string | null = null

    // === 副作用前置：2 个回流类 destination 必须先调 executeCirculation ===
    // (executeCirculation 内部调 saveDatabase()，与外层 BEGIN/COMMIT 冲突会破坏 sql.js 事务状态 — 与 /end 路由保持一致: 不在外层事务中)
    if (destination === 'circulate' || destination === 'self_seed') {
      // 必须有种源才能回流
      if (!planting.source_id) {
        return res.status(400).json({ success: false, error: '该种植记录无种源，无法回流' })
      }
      // 自交种子强制 seed_saving；QUANTITY 类型不需要 subType；其余按入参
      let finalSubType: string | undefined
      if (destination === 'self_seed') {
        finalSubType = 'seed_saving'
      } else if (subType === 'quantity_refill') {
        finalSubType = undefined
      } else {
        finalSubType = subType
      }

      const circType = subType === 'quantity_refill' ? 'QUANTITY' : 'PROPAGATION'
      // 动态 require 避免循环依赖
      const { executeCirculation } = require('../services/circulation.service')
      const result = executeCirculation({
        circulationType: circType,
        sourceModule: 'planting',
        sourceId: plantingId,
        parentSourceId: planting.source_id,
        subType: finalSubType,
        destination: 'seed_source',
        quantity, unit, notes,
      })
      if (result?.circulationId) generatedCircId = result.circulationId
    }

    db.exec('BEGIN')
    try {
      // === 副作用路由：harvest 分支 ===
      // 2026-06-19: 修复双写库存 bug
      // 主链路 submitUnifiedInbound → POST /api/inventory/inbound-from-source 已写完 4 张表
      // (harvest_records + inventory_stock + inventory_inbound_records + inventory_transaction)
      // 这里只需写 planting_harvest_records 审计记录，不再重复写库
      if (destination === 'harvest') {
        // 占位：保留分支结构对齐 dispose；实际不写下游表
      }
      // === 副作用路由：dispose 分支（1:1 搬运行 1122-1140 /end 路由，Phase 1 不结束种植） ===
      // DISPOSAL 不走 executeCirculation（Zod parentSourceId 必填），用 raw SQL 写记录
      else if (destination === 'dispose') {
        const circId = `CIRC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        try {
          db.run(
            `INSERT INTO crop_circulation_records (id, circulation_type, source_module, source_id, parent_source_id, quantity, unit, circulation_date, notes, disposition) VALUES (?, 'DISPOSAL', 'planting', ?, NULL, ?, ?, ?, ?, 'DISPOSAL')`,
            [circId, plantingId, Number(quantity) || 0, unit || '', recordDate || now.split('T')[0], notes || '']
          )
          generatedCircId = circId
        } catch (e) {
          // 写 circulation 失败不阻断主流程
          console.error('[harvest-records/dispose] write circulation record failed:', e)
        }
      }
      // 注: circulate / self_seed 已在 BEGIN 之前完成 executeCirculation (避免与外层事务冲突)

      // INSERT planting_harvest_records（副作用审计记录）
      db.run(`
        INSERT INTO planting_harvest_records (
          id, record_type, record_date, planting_id, planting_code,
          destination, sub_type, warehouse_id, warehouse_name,
          quantity, unit, notes, operator_name, create_by, create_by_id,
          create_time, update_time,
          harvest_record_id, inventory_stock_id, circulation_record_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        harvestRecordId, 'planting', recordDate || now.split('T')[0], plantingId, planting.planting_code,
        destination, subType || null, warehouseId || null, warehouseName || null,
        quantity, unit || 'g', notes || null, operatorName || null, createBy || null, createById || null,
        now, now,
        generatedHarvestId, generatedStockId, generatedCircId,
      ])

      // UPDATE planting.status（标记为采收中，但未结束）
      if (planting.status !== 'ended' && planting.status !== 'cancelled' && planting.status !== 'harvesting') {
        db.run('UPDATE plantings SET status = ?, update_time = ? WHERE id = ?', ['harvesting', now, plantingId])
      }

      db.exec('COMMIT')
    } catch (txErr) {
      try { db.exec('ROLLBACK') } catch {}
      throw txErr
    }

    saveDatabase()
    res.status(201).json({
      success: true,
      data: {
        id: harvestRecordId,
        plantingId,
        destination,
        subType: subType || null,
        warehouseId: warehouseId || null,
        warehouseName: warehouseName || null,
        quantity,
        unit: unit || 'g',
        notes: notes || null,
        operatorName: operatorName || null,
        createBy: createBy || null,
        recordDate: recordDate || now.split('T')[0],
        createTime: now,
        harvestRecordId: generatedHarvestId,
        inventoryStockId: generatedStockId,
        circulationRecordId: generatedCircId,
      }
    })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

import { executeCirculation } from '../services/circulation.service'
import { formatLocalDateISO } from '../utils/dateUtil'
import { HarvestService } from '../services/harvest.service'
import { generateInstanceId } from '../services/inventory.service'
import { formatLocalDateYYYYMMDD } from '../utils/dateUtil'

const harvestService = new HarvestService()

router.post('/:id/end', async (req, res) => {
  try {
    const { id } = req.params
    const { endType, subType, warehouseId, quantity, unit, notes } = req.body || {}
    const db = getDatabase()
    // sql.js 标准模式：bind + step + getAsObject（.get() 在 sql.js 中不可靠，返回空对象）
    const stmt = db.prepare(`SELECT * FROM plantings WHERE id = ?`)
    stmt.bind([id])
    const planting = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    if (!planting || !planting.id) return res.status(404).json({ success: false, error: '种植记录不存在' })

    const now = formatLocalDateISO()

    // ========== 1. 采收入库：写 harvest_records + inventory_stock（库存实例） ==========
    if (endType === 'harvest') {
      const harvestQty = Number(quantity) || planting.harvest_quantity || 0
      if (harvestQty <= 0) {
        return res.status(400).json({ success: false, error: '采收入库必须填写数量' })
      }
      if (!warehouseId) {
        return res.status(400).json({ success: false, error: '采收入库必须选择仓库' })
      }

      // 查仓库名称
      const whRow = db.prepare(`SELECT name FROM warehouses WHERE id = ? OR oid = ? LIMIT 1`).get([warehouseId, warehouseId]) as any
      const warehouseName = whRow?.name || warehouseId

      // 生成 instance_id（库存实例编码）
      const dateStr = formatLocalDateYYYYMMDD(new Date())
      const instanceId = await generateInstanceId('IPR', dateStr)

      // 事务原子：写 harvest_records + inventory_stock
      // 不用 harvestService.createOneWithInventory（其内部 inventoryStockRepository.create 抛 "37 values" bug）
      const harvestId = `HV${Date.now()}`
      const harvestCode = `HV${dateStr}-${String(Date.now()).slice(-4)}`
      const stockId = `STK${Date.now()}`
      const harvestDate = now.split('T')[0]
      const harvestUnit = unit || planting.unit || '株'
      const operator = (req.body as any)?.operatorId || 'system'

      db.exec('BEGIN')
      try {
        // 1) 写 harvest_records（34 列：与 schema 对齐）
        const hvStmt = db.prepare(`
          INSERT INTO harvest_records (
            id, harvest_code, source_id, source_name, crop_name, crop_variety,
            greenhouse_id, greenhouse_name, harvest_date, harvest_quantity, unit, unit_price,
            total_amount, quality_grade, buyer_id, buyer_name, sales_channel, status,
            remarks, create_by, create_time, update_time, warehouse_id, auditor_id,
            harvester_ids, harvester_names, inbound_type, batch_code,
            create_by_id, planting_mode, target_yield, harvest_area, products, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        hvStmt.run([
          harvestId, harvestCode, planting.id, planting.planting_code,
          planting.crop_name, planting.crop_variety,
          null, planting.greenhouse_name, harvestDate, harvestQty, harvestUnit, 0,
          0, null, null, null, null, 'completed',
          notes || '', operator, now, now, warehouseId, null,
          null, null, 'planting_harvest', planting.planting_code,
          null, null, 0, 0, null, null,
        ])
        hvStmt.free()

        // 2) 写 inventory_stock（36 列：与 schema 对齐）
        const stockStmt = db.prepare(`
          INSERT INTO inventory_stock (
            id, instance_id, stock_type, business_id, business_type, business_code,
            crop_id, crop_name, variety_id, variety_name,
            current_quantity, frozen_quantity, available_quantity, unit,
            warehouse_id, warehouse_name, inbound_date, source_type,
            production_plan_code, source_instance_id, status, version,
            create_time, update_time,
            crop_code, planting_mode, target_yield, grade, auditor, remarks, greenhouse_name,
            supplier_id, supplier_name, unit_price, total_amount, purchase_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        stockStmt.run([
          stockId, instanceId, 'harvest', harvestId, 'harvest', harvestCode,
          null, planting.crop_name, null, planting.crop_variety,
          harvestQty, 0, harvestQty, harvestUnit,
          warehouseId, warehouseName, harvestDate, 'self_produced',
          planting.production_plan_code || null, null, 'in_stock', 1,
          now, now,
          planting.crop_code || null, null, 0, null, null, notes || '', planting.greenhouse_name || null,
          null, null, 0, 0, null,
        ])
        stockStmt.free()

        db.exec('COMMIT')
      } catch (txErr) {
        try { db.exec('ROLLBACK') } catch {}
        throw txErr
      }

      saveDatabase()

      // 收尾：更新种植记录
      db.run(
        `UPDATE plantings SET is_harvest = 1, harvest_date = ?, harvest_quantity = ?, status = 'harvested', end_type = 'harvest', end_time = ?, update_time = ? WHERE id = ?`,
        [now, harvestQty, now, now, id]
      )
      saveDatabase()
      return res.json({
        success: true,
        data: {
          id,
          status: 'harvested',
          endType: 'harvest',
          harvestId,
          inventoryId: stockId,
        }
      })
    }

    // ========== 2. 直接废弃：不依赖种源，写 circulation 记录(无 parent_source_id) + 标记 cancelled ==========
    if (endType === 'dispose') {
      // DISPOSAL 不走 executeCirculation（Zod parentSourceId 必填），用 raw SQL 写记录
      const circId = `CIRC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      try {
        db.run(
          `INSERT INTO crop_circulation_records (id, circulation_type, source_module, source_id, parent_source_id, quantity, unit, circulation_date, notes, disposition) VALUES (?, 'DISPOSAL', 'planting', ?, NULL, ?, ?, ?, ?, 'DISPOSAL')`,
          [circId, id, Number(quantity) || 0, unit || '', now, notes || '']
        )
      } catch (e) {
        // 写 circulation 失败不阻断主流程
        console.error('[end/dispose] write circulation record failed:', e)
      }
      db.run(
        `UPDATE plantings SET status = 'cancelled', end_type = 'disposal', end_time = ?, update_time = ? WHERE id = ?`,
        [now, now, id]
      )
      saveDatabase()
      return res.json({ success: true, data: { id, status: 'cancelled', endType: 'disposal', circulationId: circId } })
    }

    // ========== 3-5. 回流类：必须有种源 ==========
    if (!planting.source_id) {
      return res.status(400).json({ success: false, error: '该种植记录无种源,无法回流' })
    }
    // 自交种子 强制 seed_saving
    let finalSubType: string | undefined
    if (endType === 'self_seed') {
      finalSubType = 'seed_saving'
    } else if (subType === 'quantity_refill') {
      finalSubType = undefined  // QUANTITY 类型不需要 subType
    } else {
      finalSubType = subType  // cutting/seed_saving (PROPAGATION)
    }

    const circType = subType === 'quantity_refill' ? 'QUANTITY' : 'PROPAGATION'
    const result = executeCirculation({
      circulationType: circType,
      sourceModule: 'planting',
      sourceId: id,
      parentSourceId: planting.source_id,
      subType: finalSubType,
      destination: 'seed_source',
      quantity, unit, notes,
    })

    // 公共收尾：标记种植记录已结束
    db.run(
      `UPDATE plantings SET status = 'ended', end_type = ?, end_time = ?, update_time = ? WHERE id = ?`,
      [endType, now, now, id]
    )
    saveDatabase()
    return res.json({ success: true, data: { id, status: 'ended', endType, ...result } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

export default router;
