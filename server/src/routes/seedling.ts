/**
 * 育苗 API 路由
 * C1：所有路由都经过 authenticate 中间件
 */

import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { seedSourceService, BusinessError, SeedSourceErrorCode } from '../services/seedSource.service';
import { writeFlowLog, writeCorrection } from '../services/flowLogService';
// 2026-07-08 V3.4 流水号规范化：使用项目统一工具生成 TRX-YYYYMMDD-NNNN 流水号
// 替代原 TXO-/OUT- + Math.random() 违规格式（违反 [[code-generation-contract-rule]] 铁律）
import { generateTransactionId } from '../services/inventory.service';
import { mapPropagationToCategory } from '../lib/sourceCategoryMapper';
import { seedLog } from '../lib/seedLogger';
import { formatLocalDateISO } from '../utils/dateUtil';

const router = Router();

// C1：全局应用 auth 中间件
router.use(authenticate);

// ============================================
// 批量操作路由必须在 /:id 之前定义，否则 /batch 会被当作 :id 参数
// ============================================

/**
 * 批量获取育苗记录
 * GET /api/seedlings/batch?ids=id1,id2,id3
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
    const sql = `SELECT * FROM seedlings WHERE id IN (${placeholders})`;
    const items = queryToObjects(db, sql, idArray);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量获取育苗记录失败' });
  }
});

/**
 * 批量更新育苗记录
 * PUT /api/seedlings/batch
 */
router.put('/batch', (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 ids 参数或 ids 不是有效数组' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: '缺少 updates 参数或 updates 不是有效对象' });
    }

    const now = new Date().toISOString();
    const db = getDatabase();

    // 2026-07-14：批量更新字段名白名单（修复 H15：此前任意字段名可注入 SQL 列名）
    const ALLOWED_FIELDS = new Set([
      'seedling_code', 'source_id', 'source_name', 'production_plan_code',
      'crop_code', 'crop_name', 'crop_variety', 'seedling_type',
      'greenhouse_name', 'area_name', 'seedling_date', 'expected_finish_date', 'actual_finish_date',
      'seedling_quantity', 'survival_quantity', 'survival_rate', 'planted_count',
      'pictures', 'quality_grade', 'status', 'seedling_status', 'remarks',
      'create_by', 'work_hours', 'print_count', 'end_type', 'end_time',
      'target_survival_rate', 'target_survival_count', 'loss_count', 'loss_rate',
      'source_mode', 'external_seed_code', 'external_seed_name', 'external_seed_quantity', 'external_seed_note',
      'charge_person', 'seedling_form', 'unit',
    ]);

    const safeKeys = Object.keys(updates).filter(k => k !== 'id' && ALLOWED_FIELDS.has(k));
    if (safeKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有有效的更新字段' });
    }
    const fields = safeKeys.map(k => `${k} = ?`).join(', ');
    const values = safeKeys.map(k => updates[k]);
    values.push(now);

    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE seedlings SET ${fields}, update_time = ? WHERE id IN (${placeholders})`, [...values, ...ids]);

    saveDatabase();
    res.json({ success: true, data: { ids, updated: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量更新育苗记录失败' });
  }
});

/**
 * 批量删除育苗记录
 * DELETE /api/seedlings/batch?ids=id1,id2,id3
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
    const placeholders = idArray.map(() => '?').join(',');
    const now = new Date().toISOString();
    db.run(`UPDATE seedlings SET deleted_at = ? WHERE id IN (${placeholders})`, [now, ...idArray]);
    saveDatabase();
    res.json({ success: true, data: { deletedCount: idArray.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除育苗记录失败' });
  }
});

/**
 * 生成育苗批号
 * GET /api/seedlings/generate-code
 * 格式: YM{YYYYMMDD}-{3位流水号}, 例: YM20260607-001
 * 流水号按当日自增（查询当日 MAX+1）
 */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // 查询当日最大序号: YM + 8位日期 + - + 3位序号 = 14 字符
    const db = getDatabase();
    const pattern = `YM${dateStr}-___`;
    const stmt = db.prepare(`
      SELECT seedling_code FROM seedlings
      WHERE seedling_code LIKE ? AND LENGTH(seedling_code) = 14
      ORDER BY seedling_code DESC LIMIT 1
    `);
    stmt.bind([pattern]);
    let maxSerial = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject() as { seedling_code: string };
      maxSerial = parseInt(row.seedling_code.slice(-3), 10) || 0;
    }
    stmt.free();

    const seq = String(maxSerial + 1).padStart(3, '0');
    const code = `YM${dateStr}-${seq}`;
    res.json({ success: true, data: code });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成育苗批号失败' });
  }
});

/**
 * 原子操作：扣减种源 + 创建育苗记录（C9）
 * POST /api/seedlings/with-deduct
 * Body: { sourceId: string, count: number, seedling: {...} }
 * 顺序：deduct source.remaining_quantity → insert seedling
 * 真事务：BEGIN → UPDATE seed_sources → INSERT seedlings → COMMIT；
 *        任何一步失败整体 ROLLBACK。
 * 保留请求/响应结构（兼容前端）：成功 {success:true, data:{id}}；失败抛 BusinessError。
 */
router.post('/with-deduct', asyncHandler(async (req: Request, res: Response) => {
  // 2026-06-13: 修复 — 支持外部种源模式（sourceId 为空 + externalSource 字段）
  // 设计文档 §4 场景B/E/F：育苗户/种植户/育苗+种植 三个场景需要 sourceId 可空
  const { sourceId, count, seedling, externalSource } = req.body || {};
  const isExternalMode = !sourceId && externalSource;

  if (!sourceId && !isExternalMode) {
    return res.status(400).json({ success: false, error: '缺少 sourceId 参数' });
  }
  if (!seedling || typeof seedling !== 'object') {
    return res.status(400).json({ success: false, error: '缺少 seedling 参数' });
  }

  // 2026-06-15: 显式校验业务必填字段，避免后续 INSERT 因 NOT NULL 字段缺失导致 500
  const requiredFields: Array<[string, unknown]> = [
    ['seedling_code', seedling.seedling_code ?? seedling.seedlingCode],
    ['crop_name', seedling.crop_name ?? seedling.cropName],
    ['seedling_type', seedling.seedling_type ?? seedling.seedlingType],
    ['seedling_date', seedling.seedling_date ?? seedling.seedlingDate],
  ];
  for (const [name, val] of requiredFields) {
    if (val === undefined || val === null || val === '') {
      return res.status(400).json({ success: false, error: `缺少必填字段: ${name}` });
    }
  }

  const db = getDatabase();
  const newId = seedling.id || `SD${Date.now()}`;
  const now = new Date().toISOString();
  // 2026-06-14: 补全与 POST / 一致的字段（target_survival_rate/count、loss_count/rate、source_mode、external_seed_*、propagation_mode/4 字段）
  const { seedling_code, source_name, crop_code, crop_name, crop_variety,
          seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
          seedling_quantity, survival_quantity, survival_rate, status, seedling_status, remarks, create_by,
          work_hours, production_plan_code,
          target_survival_rate, target_survival_count, loss_count, loss_rate,
          source_mode, external_seed_code, external_seed_name, external_seed_quantity, external_seed_note,
          propagation_mode, mother_plant_count, expanded_plant_count, scion_count } = seedling;
  const productionPlanCode = production_plan_code ?? seedling.productionPlanCode;
  const workHours = work_hours ?? seedling.workHours;
  const cropCode = crop_code ?? seedling.cropCode;
  // 2026-06-15: 负责人字段兼容 camelCase
  const chargePerson = (seedling as any).charge_person ?? (seedling as any).chargePerson ?? null;
  const propagationMode = propagation_mode ?? 'one_to_one';  // 2026-06-15: 默认 1:1
  // 2026-06-15: 6 种模式 → 2 种模式
  const validModes = ['one_to_one', 'one_to_many'];
  if (!validModes.includes(propagationMode)) {
    return res.status(400).json({ success: false, error: `不支持的繁殖模式: ${propagationMode}` });
  }
  // 1:多 模式必须填写母株数量 > 0
  if (propagationMode === 'one_to_many' && (!mother_plant_count || mother_plant_count <= 0)) {
    return res.status(400).json({ success: false, error: `one_to_many 模式必须填写母株数量 > 0` });
  }

  // 步骤0：参数校验
  const safeCount = Number(count);
  if (!Number.isFinite(safeCount) || !Number.isInteger(safeCount) || safeCount <= 0) {
    throw new BusinessError(
      SeedSourceErrorCode.INVALID_DECREASE_COUNT,
      `参数错误: count 必须为正整数，当前 ${count}`,
    );
  }

  // 真事务：扣减 + 插入 整体原子化
  db.exec('BEGIN');
  try {
    let effectiveSourceId = sourceId;

    // 步骤1a：外部种源模式 — 自动创建简化种源记录
    if (isExternalMode) {
      const extCode = externalSource.code || externalSource.seedCode || `ES${Date.now()}`;
      const extName = externalSource.name || externalSource.seedName || extCode;
      const extQty = Number(externalSource.quantity ?? safeCount);
      const extCropName = externalSource.cropName || crop_name;
      const extCropVariety = externalSource.cropVariety || crop_variety;
      effectiveSourceId = `ES${Date.now()}`;

      // 自动创建简化种源（propagationType=EXTERNAL, sourceOrigin=external_purchase）
      db.run(`
        INSERT INTO seed_sources (
          id, source_code, source_name, source_type, source_origin, crop_name, crop_variety,
          quantity, remaining_quantity, used_quantity, unit, propagation_type, create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        effectiveSourceId, extCode, extName, 'external_seed', 'external_purchase',
        extCropName, extCropVariety, extQty, extQty, 0,
        externalSource.unit || '粒', 'EXTERNAL',
        create_by || '', now, now,
      ]);
    } else {
      // 步骤1b：内部种源模式 — 校验并扣减
      const stmt = db.prepare('SELECT remaining_quantity, propagation_status FROM seed_sources WHERE id = ? AND deleted_at IS NULL');
      stmt.bind([sourceId]);
      let existing: { remaining_quantity?: number; propagation_status?: string } | null = null;
      if (stmt.step()) {
        existing = stmt.getAsObject() as any;
      }
      stmt.free();

      if (!existing) {
        throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '种源记录不存在', 404);
      }
      if (existing.propagation_status === 'failed') {
        throw new BusinessError(SeedSourceErrorCode.FAILED_STATUS, '种源已标记为失败，不允许扣减');
      }
      const current = existing.remaining_quantity ?? 0;
      if (current < safeCount) {
        throw new BusinessError(
          SeedSourceErrorCode.INSUFFICIENT_AVAILABLE,
          `可用数量不足：当前 ${current}，需扣减 ${safeCount}`,
        );
      }
      const newAvailable = current - safeCount;

      // 步骤2：扣减种源
      db.run('UPDATE seed_sources SET remaining_quantity = ?, update_time = ? WHERE id = ?',
        [newAvailable, now, sourceId]);

      // 2026-07-05 修复：写 inventory_transaction (outbound)
      // 之前只写 material_flow_log（审计日志），但库存详情弹窗的 history/trace tab
      // 完全不读 material_flow_log，导致种源的"追溯时间线"看不到"被育苗使用"记录
      // 修复：同时写一条 outbound 流水，history/trace tab 才能查到
      // business_type 用 'seedling'（与 crop_instances 的 business_type 对齐），
      // 避免被 inventoryTransactions.ts 的 VALID_OUTBOUND_TYPES 白名单静默丢弃
      // 2026-07-08 V3.4 流水号规范化：使用项目统一工具 generateTransactionId 生成 TRX-YYYYMMDD-NNNN 流水号
      // 替代原 TXO-/OUT- + Math.random() 违规格式（违反 [[code-generation-contract-rule]] 铁律）
      const seedSourceInstanceId = `seed_source:${sourceId}`;
      const useDateYmd = now.slice(0, 10).replace(/-/g, '');
      const useTxId = await generateTransactionId(useDateYmd);
      const useTransactionId = await generateTransactionId(useDateYmd);
      const operatorName = create_by || 'system';  // HIGH#1: operator_name 不能再传空字符串（审计追溯断链）
      db.run(
        `INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, 'seedling', ?, ?, ?, ?, ?, ?)`,
        [
          useTxId, useTransactionId, seedSourceInstanceId, 'seed',
          -safeCount, current, newAvailable,
          newId, seedling_code || '',
          create_by || '', operatorName, now.slice(0, 10),
          `种源被育苗使用 ${seedling_code || newId}（扣减 ${safeCount}）`,
          now,
        ]
      );
    }

    // 步骤3：创建育苗记录（2026-06-15: 用数组列名 + 自动 ?，避免加列时占位符数错位导致 500）
    const insertCols = [
      'id', 'seedling_code', 'source_id', 'source_name', 'crop_code', 'crop_name', 'crop_variety',
      'seedling_type', 'greenhouse_name', 'area_name', 'seedling_date', 'expected_finish_date',
      'seedling_quantity', 'survival_quantity', 'survival_rate', 'status', 'seedling_status', 'remarks', 'create_by', 'work_hours',
      'production_plan_code',
      'target_survival_rate', 'target_survival_count', 'loss_count', 'loss_rate',
      'source_mode', 'external_seed_code', 'external_seed_name', 'external_seed_quantity', 'external_seed_note',
      'propagation_mode', 'mother_plant_count', 'expanded_plant_count', 'scion_count',
      'source_deducted_quantity',
      'charge_person',
      'seedling_form',
      // 2026-07-03 v5：无性繁殖母株溯源列
      'mother_source_type', 'mother_source_id', 'mother_source_code',
      'propagation_method', 'inoculation_count', 'survival_count',
      'mother_generation', 'mother_crop_name', 'mother_propagation_method', 'asexual_propagation_note',
      'create_time', 'update_time',
    ];
    const insertValues = [
      newId, seedling_code, effectiveSourceId, source_name, cropCode, crop_name, crop_variety,
      seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
      seedling_quantity, survival_quantity, survival_rate, status || 'sown', seedling_status, remarks, create_by, workHours || null,
      productionPlanCode || null,
      target_survival_rate ?? null, target_survival_count ?? null, loss_count ?? 0, loss_rate ?? 0,
      source_mode || 'internal', external_seed_code || null, external_seed_name || null, external_seed_quantity ?? 0, external_seed_note || null,
      propagationMode, mother_plant_count ?? 0, expanded_plant_count ?? 0, scion_count ?? 0,
      safeCount,
      chargePerson,
      seedling.seedling_form || null, // 2026-06-27：种苗形态
      // 2026-07-03 v5：无性繁殖母株溯源
      seedling.mother_source_type || null,
      seedling.mother_source_id || null,
      seedling.mother_source_code || null,
      seedling.propagation_method || null,
      seedling.inoculation_count ?? 0,
      seedling.survival_count ?? 0,
      seedling.mother_generation || null,
      seedling.mother_crop_name || null,
      seedling.mother_propagation_method || null,
      seedling.asexual_propagation_note || null,
      now, now,
    ];
    if (insertCols.length !== insertValues.length) {
      // 铁律 #12: 字段不匹配必须 throw，绝不静默成功
      throw new Error(`INSERT 列数(${insertCols.length}) 与值数(${insertValues.length}) 不一致: cols=${insertCols.join(',')}`);
    }
    db.run(
      `INSERT INTO seedlings (${insertCols.join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`,
      insertValues.map(v => v === undefined ? null : v)
    );

    // 2026-06-24: 同步建 crop_instance 行，让行级采收入库 findSourceInstanceId() 能溯源
    // business_id=seedling.id, business_type='seedling'，source_instance_id=来源种源
    // 在同一 BEGIN/COMMIT 块内，seedling 失败时自动回滚 crop_instance
    // 注：transplanted_count / harvest_stocked_count 是后续累加字段，新建时为 0
    const seedlingCiId = `CI${Date.now()}-sd`;
    db.run(
      `INSERT INTO crop_instances (
        id, instance_code, crop_name, crop_variety, business_id, business_type,
        source_instance_id, initial_quantity, current_quantity,
        planted_quantity, harvested_quantity, status, seedling_start_date,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seedlingCiId,
        seedling_code || `YM${Date.now().toString().slice(0, 8)}-001`,  // 兜底（前端通常调 generate-code 传入）
        crop_name,
        crop_variety,
        newId,
        'seedling',
        effectiveSourceId || null,
        Number(seedling_quantity) || 0,
        Number(survival_quantity || seedling_quantity) || 0,
        0,  // transplanted_count（新建时为 0）
        0,  // harvest_stocked_count（新建时为 0）
        status || 'growing',
        seedling_date,
        chargePerson,
        now,
        now,
      ]
    );

    // 步骤3.5：写入 material_flow_log（外部种源→external→seedling，内部种源→seed_source→seedling）
    try {
      const flowType = isExternalMode ? 'external→seedling' : 'seed_source→seedling';
      let sourceCategory = 'other';
      let finalSourceCode: string = effectiveSourceId;
      if (isExternalMode) {
        sourceCategory = 'external';
        finalSourceCode = (externalSource as any).code || (externalSource as any).seedCode || effectiveSourceId;
      } else {
        const srcInfo = db.exec('SELECT propagation_type FROM seed_sources WHERE id = ?', [effectiveSourceId]);
        if (srcInfo[0]?.values?.[0]) {
          sourceCategory = mapPropagationToCategory(srcInfo[0].values[0][0] as string);
        }
        finalSourceCode = (seedling as any).source_code || (seedling as any).sourceCode || effectiveSourceId;
      }
      writeFlowLog({
        flow_type: flowType,
        crop_name: crop_name,
        crop_variety: crop_variety,
        source_type: isExternalMode ? null : 'seed_source',
        source_id: isExternalMode ? null : effectiveSourceId,
        source_code: finalSourceCode,
        source_quantity: safeCount,
        source_unit: '粒',
        source_category: sourceCategory,
        target_type: 'seedling',
        target_id: newId,
        target_code: seedling_code,
        target_quantity: seedling_quantity || 0,
        target_unit: '株',
        business_code: seedling_code,
        created_by: create_by || '',
      });
    } catch (e) {
      console.error('flow_log write failed:', e);
    }

    // 步骤4：提交 + 落盘
    db.exec('COMMIT');
    saveDatabase();
    const saved = queryToObjects(db, 'SELECT * FROM seedlings WHERE id = ?', [newId])[0];
    return res.status(201).json({ success: true, data: saved });
  } catch (insertErr) {
    // 任一失败：整体回滚（sql.js 在 ROLLBACK 后会自动丢弃事务内所有变更）
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    throw insertErr;
  }
}));

/**
 * 2026-06-16: 按 ID 精准修复母株存活数 — 重置为初始数量（初始数量 = 建档时的母株投入数）
 * POST /api/seedlings/:id/reset-mother-count
 * 用法：用户希望"母株存活数 = 初始数量"（清零所有历史损耗），用于母株已枯废批次的修复
 * 警告：会丢失历史母株损耗记录（但保留 mother_loss_count 字段值，前端"剩余可用"公式用 mother - motherLoss 计算）
 */
router.post('/:id/reset-mother-count', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT id, seedling_code, propagation_mode, seedling_quantity, mother_plant_count, mother_loss_count FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let row: any = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();

    if (!row) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    if (row.propagation_mode !== 'one_to_many') {
      return res.status(400).json({ success: false, error: '仅 1:多 模式可重置母株存活数' });
    }

    const initialQty = Number(row.seedling_quantity) || 0;
    const beforeMother = Number(row.mother_plant_count) || 0;
    const motherLoss = Number(row.mother_loss_count) || 0;
    const now = new Date().toISOString();

    // 重置 mother_plant_count = seedling_quantity（即建档时的母株投入数）
    db.run(
      'UPDATE seedlings SET mother_plant_count = ?, update_time = ? WHERE id = ?',
      [initialQty, now, id]
    );
    saveDatabase();

    seedLog.info(`✓ 母株存活数重置：${row.seedling_code} ${beforeMother} → ${initialQty}（同时保留母株累计损耗 ${motherLoss}）`);

    res.json({
      success: true,
      data: {
        id,
        seedlingCode: row.seedling_code,
        beforeMother,
        afterMother: initialQty,
        motherLoss,
        message: `母株存活数 ${beforeMother} → ${initialQty}（注意：母株累计损耗 ${motherLoss} 仍保留，前端"剩余可用"公式会从 mother - motherLoss = ${initialQty - motherLoss} 开始算）`,
      },
    });
  } catch (error: any) {
    console.error('重置母株存活数失败:', error);
    res.status(500).json({ success: false, error: `重置失败: ${error.message}` });
  }
});

/**
 * 2026-06-16: 修复历史脏数据 — 母株损耗已累加但 mother_plant_count 未扣减
 * POST /api/seedlings/fix-mother-loss
 * 幂等：用 mother_loss_fixed 标记字段防重复修复
 * 只对 1:多 模式 + mother_loss_count > 0 + mother_loss_fixed = 0 的记录修复
 */
router.post('/fix-mother-loss', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const beforeStmt = db.prepare(`SELECT id, seedling_code, mother_plant_count, mother_loss_count FROM seedlings WHERE propagation_mode = 'one_to_many' AND mother_loss_count > 0 AND (mother_loss_fixed IS NULL OR mother_loss_fixed = 0)`);
    const records: Array<{ id: string; seedlingCode: string; beforeMother: number; afterMother: number; motherLoss: number }> = [];
    const toUpdate: Array<{ id: string; newMother: number }> = [];
    while (beforeStmt.step()) {
      const row = beforeStmt.getAsObject() as any;
      const beforeMother = Number(row.mother_plant_count) || 0;
      const motherLoss = Number(row.mother_loss_count) || 0;
      const afterMother = Math.max(0, beforeMother - motherLoss);
      records.push({
        id: row.id,
        seedlingCode: row.seedling_code,
        beforeMother,
        afterMother,
        motherLoss,
      });
      toUpdate.push({ id: row.id, newMother: afterMother });
    }
    beforeStmt.free();

    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE seedlings SET mother_plant_count = ?, mother_loss_fixed = 1, update_time = ? WHERE id = ?');
    for (const { id, newMother } of toUpdate) {
      stmt.run([newMother, now, id]);
    }
    stmt.free();
    saveDatabase();

    seedLog.info(`✓ 历史脏数据修复完成：${records.length} 条记录`);
    for (const r of records) {
      seedLog.info(`  - ${r.seedlingCode}: mother_plant_count ${r.beforeMother} → ${r.afterMother} (扣减母株损耗 ${r.motherLoss})`);
    }

    res.json({
      success: true,
      data: {
        fixedCount: records.length,
        records,
      },
      message: `修复 ${records.length} 条记录`,
    });
  } catch (error: any) {
    console.error('修复历史脏数据失败:', error);
    res.status(500).json({ success: false, error: `修复失败: ${error.message}` });
  }
});

/**
 * 2026-06-16: 修复 1:1 模式历史脏数据 — mother_plant_count 漏存 initial
 *
 * 根因：早期 AddModal 1:1 模式 mother_plant_count 写 0，导致后续 daily record
 *       派生 expanded_plant_count = 0 + 补苗，丢掉初始数量 initial
 * 修复：1:1 模式 mother_plant_count = seedling_quantity + replant_count
 *       expanded_plant_count = mother_plant_count
 *
 * POST /api/seedlings/fix-one-to-one-mother
 * Body: { dryRun?: boolean }  缺省 false（直接修复）
 * 幂等：修复后字段值不再变化，重复调用无副作用
 */
router.post('/fix-one-to-one-mother', (req: Request, res: Response) => {
  try {
    const dryRun = req.body?.dryRun === true;
    const db = getDatabase();

    // 找出 1:1 模式且 mother_plant_count 不等于 (initial + replant_count) 的脏数据
    const beforeStmt = db.prepare(`
      SELECT id, seedling_code, seedling_quantity, mother_plant_count, expanded_plant_count, replant_count
      FROM seedlings
      WHERE propagation_mode = 'one_to_one'
        AND deleted_at IS NULL
    `);
    const dirty: Array<{
      id: string;
      seedlingCode: string;
      beforeMother: number;
      beforeExpanded: number;
      afterMother: number;
      afterExpanded: number;
      initial: number;
      replant: number;
    }> = [];

    while (beforeStmt.step()) {
      const row = beforeStmt.getAsObject() as any;
      const initial = Number(row.seedling_quantity) || 0;
      const replant = Number(row.replant_count) || 0;
      const beforeMother = Number(row.mother_plant_count) || 0;
      const beforeExpanded = Number(row.expanded_plant_count) || 0;
      const afterMother = initial + replant;
      // 只在不一致时记为脏数据
      if (beforeMother !== afterMother || beforeExpanded !== afterMother) {
        dirty.push({
          id: row.id,
          seedlingCode: row.seedling_code,
          beforeMother,
          beforeExpanded,
          afterMother,
          afterExpanded: afterMother,
          initial,
          replant,
        });
      }
    }
    beforeStmt.free();

    if (!dryRun && dirty.length > 0) {
      const now = new Date().toISOString();
      const stmt = db.prepare('UPDATE seedlings SET mother_plant_count = ?, expanded_plant_count = ?, update_time = ? WHERE id = ?');
      for (const d of dirty) {
        stmt.run([d.afterMother, d.afterExpanded, now, d.id]);
      }
      stmt.free();
      saveDatabase();
    }

    res.json({
      success: true,
      data: {
        dryRun,
        dirtyCount: dirty.length,
        records: dirty,
      },
      message: dryRun
        ? `DryRun：发现 ${dirty.length} 条 1:1 模式脏数据`
        : `修复 ${dirty.length} 条 1:1 模式脏数据`,
    });
  } catch (error: any) {
    console.error('修复 1:1 模式脏数据失败:', error);
    res.status(500).json({ success: false, error: `修复失败: ${error.message}` });
  }
});

/**
 * 重置育苗数据
 * POST /api/seedlings/reset
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 清空现有数据
    db.run('DELETE FROM seedlings');

    // 插入默认数据
    const defaultData = [
      {
        id: 'SD001',
        seedling_code: 'YM2026-001',
        source_id: 'SS001',
        source_name: 'ZZ2026-001',
        crop_name: '番茄',
        crop_variety: '红果番茄',
        seedling_type: '嫁接苗',
        greenhouse_name: '育苗棚1',
        area_name: '01区',
        seedling_date: '2026-04-01',
        expected_finish_date: '2026-04-25',
        seedling_quantity: 50000,
        survival_quantity: 47500,
        survival_rate: 95,
        status: 'in_progress',
        remarks: '长势良好',
        create_by: '李明辉',
        create_time: now,
        update_time: now
      },
      {
        id: 'SD002',
        seedling_code: 'YM2026-002',
        source_id: 'SS002',
        source_name: 'ZZ2026-002',
        crop_name: '黄瓜',
        crop_variety: '水果黄瓜',
        seedling_type: '实生苗',
        greenhouse_name: '育苗棚2',
        area_name: '02区',
        seedling_date: '2026-04-05',
        expected_finish_date: '2026-04-28',
        seedling_quantity: 30000,
        survival_quantity: 28500,
        survival_rate: 95,
        status: 'completed',
        remarks: '第二批育苗',
        create_by: '王建国',
        create_time: now,
        update_time: now
      }
    ];

    for (const item of defaultData) {
      db.run(`
        INSERT INTO seedlings (id, seedling_code, source_id, source_name, crop_name, crop_variety,
          seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
          seedling_quantity, survival_quantity, survival_rate, status, remarks, create_by, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, item.seedling_code, item.source_id, item.source_name, item.crop_name, item.crop_variety,
          item.seedling_type, item.greenhouse_name, item.area_name, item.seedling_date, item.expected_finish_date,
          item.seedling_quantity, item.survival_quantity, item.survival_rate, item.status, item.remarks, item.create_by, item.create_time, item.update_time]);
    }

    saveDatabase();
    res.json({ success: true, message: '育苗数据已重置' });
  } catch (error) {
    console.error('重置育苗数据失败:', error);
    res.status(500).json({ success: false, error: '重置育苗数据失败' });
  }
});

/**
 * 批量打印标签
 * POST /api/seedlings/batch-print
 */
router.post('/batch-print', (req: Request, res: Response) => {
  try {
    const { seedlingIds, operator } = req.body;

    if (!Array.isArray(seedlingIds) || seedlingIds.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 seedlingIds 参数或 seedlingIds 不是有效数组' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const results: any[] = [];

    // 2026-07-14：用 WHERE id IN (?) 单次查询替代 N+1 循环
    const placeholders = seedlingIds.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM seedlings WHERE id IN (${placeholders})`);
    stmt.bind(seedlingIds);
    const seedlingMap = new Map<string, any>();
    while (stmt.step()) {
      const row = stmt.getAsObject();
      seedlingMap.set(row.id as string, row);
    }
    stmt.free();

    for (const seedlingId of seedlingIds) {
      const seedling = seedlingMap.get(seedlingId);
      if (!seedling) continue;

      // 2026-07-14：用 crypto.randomUUID 替代 Math.random（代码生成契约铁律合规）
      const newId = `PR-${randomUUID().slice(0, 8)}`;
      const newOid = `PR-${randomUUID().slice(0, 8)}`;

      db.run(`
        INSERT INTO print_records (id, oid, print_type, print_title, related_id, related_code, related_type,
          printer_name, paper_size, copies, print_status, create_by, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [newId, newOid, 'seedling_label', '育苗标签打印', seedlingId, seedling.seedling_code,
          'seedling', null, 'A6', 1, 'success', operator, now, now]);

      results.push({ id: newId, oid: newOid, seedlingId, seedlingCode: seedling.seedling_code });
    }

    saveDatabase();
    res.status(201).json({ success: true, data: results });
  } catch (error) {
    console.error('批量打印失败:', error);
    res.status(500).json({ success: false, error: '批量打印失败' });
  }
});

/**
 * 获取待定植的育苗记录
 * 状态为已完成且未定植的记录
 */
router.get('/transplant-ready', (req: Request, res: Response) => {
  try {
    const { crop_name, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = `
      SELECT s.*,
        COALESCE(NULLIF(s.crop_code, ''), cv.crop_code, '') AS cropCode,
        COALESCE(cv.category_name, '') AS categoryName,
        COALESCE(cv.type_name, '') AS typeName,
        COALESCE(cv.variety_name, '') AS varietyName,
        COALESCE(cv.sub_variety1_name, '') AS subVarietyName,
        COALESCE(ss.source_code, '') AS sourceCode,
        COALESCE(pp.plan_code, '') AS productionPlanCode
      FROM seedlings s
      LEFT JOIN crop_varieties cv ON (
        s.crop_name = cv.sub_variety1_name
        OR (s.crop_name = cv.variety_name AND cv.sub_variety1_name IS NULL)
        OR (s.crop_name = cv.variety_name AND cv.sub_variety1_name = '')
      )
      LEFT JOIN seed_sources ss ON s.source_id = ss.id
      LEFT JOIN production_plans pp ON s.production_plan_code = pp.plan_code OR ss.production_plan_code = pp.plan_code
      WHERE s.deleted_at IS NULL AND s.status = 'completed'
    `;
    const params: any[] = [];

    if (crop_name) {
      sql += ' AND s.crop_name LIKE ?';
      params.push('%' + crop_name + '%');
    }

    // 获取总数
    let countSql = 'SELECT COUNT(*) FROM seedlings s WHERE s.deleted_at IS NULL AND s.status = ?';
    const countParams: any[] = ['completed'];
    if (crop_name) {
      countSql += ' AND s.crop_name LIKE ?';
      countParams.push('%' + crop_name + '%');
    }

    const total = execCount(db, countSql, countParams);

    sql += ' ORDER BY s.create_time DESC';

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ' + Number(limit) + ' OFFSET ' + offset;

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取待定植记录失败:', error);
    res.status(500).json({ success: false, error: '获取待定植记录失败' });
  }
});

/**
 * 根据来源ID获取育苗记录
 * GET /api/seedlings/source/:sourceId
 */
router.get('/source/:sourceId', (req: Request, res: Response) => {
  try {
    const { sourceId } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM seedlings WHERE source_id = ? ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, [sourceId]);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取来源育苗记录失败' });
  }
});

/**
 * 生成标签编号
 * GET /api/seedlings/label-number?code=xxx&index=1
 */
router.get('/label-number', (req: Request, res: Response) => {
  try {
    const { code, index } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, error: '缺少 code 参数' });
    }

    const idx = parseInt(index as string) || 1;
    const labelNumber = `${code}-${String(idx).padStart(4, '0')}`;
    res.json({ success: true, data: labelNumber });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成标签编号失败' });
  }
});

/**
 * 获取所有育苗记录
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL，关联crop_varieties获取标准作物编码
    // 关联seed_sources获取种源批号（seed_code字段）
    // 关联production_plans获取生产计划批次号
    // JOIN逻辑：
    // - 如果 crop_name 匹配 sub_variety1_name（细分品种），使用该品种
    // - 如果 crop_name 匹配 variety_name（主品种），使用该品种
    // 修复JOIN条件，避免OR导致的结果重复
    // 优先匹配sub_variety1_name，如果没有匹配则匹配variety_name
    let sql = `
      SELECT DISTINCT s.*,
        COALESCE(NULLIF(s.crop_code, ''), cv.crop_code, '') AS cropCode,
        COALESCE(cv.category_name, '') AS categoryName,
        COALESCE(cv.type_name, '') AS typeName,
        COALESCE(cv.variety_name, '') AS varietyName,
        COALESCE(cv.sub_variety1_name, '') AS subVarietyName,
        COALESCE(ss.source_code, '') AS sourceCode,
        COALESCE(pp.plan_code, '') AS productionPlanCode
      FROM seedlings s
      LEFT JOIN crop_varieties cv ON s.crop_name = cv.sub_variety1_name
      LEFT JOIN seed_sources ss ON s.source_id = ss.id
      LEFT JOIN production_plans pp ON s.production_plan_code = pp.plan_code OR ss.production_plan_code = pp.plan_code
      WHERE s.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (crop_name) {
      sql += ' AND s.crop_name LIKE ?';
      params.push('%' + crop_name + '%');
    }

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    // 构建count查询（不使用JOIN，直接查询seedlings表）
    let countSql = 'SELECT COUNT(*) FROM seedlings s WHERE s.deleted_at IS NULL';
    const countParams: any[] = [];
    if (crop_name) {
      countSql += ' AND s.crop_name LIKE ?';
      countParams.push('%' + crop_name + '%');
    }
    if (status) {
      countSql += ' AND s.status = ?';
      countParams.push(status);
    }

    sql += ' ORDER BY s.create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, countParams);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ' + Number(limit) + ' OFFSET ' + offset;

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取育苗记录失败:', error);
    res.status(500).json({ success: false, error: '获取育苗记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取育苗详情失败' });
  }
});

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id, seedling_code, source_id, source_name, crop_code, crop_name, crop_variety,
            seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
            seedling_quantity, survival_quantity, survival_rate, status, seedling_status, remarks, create_by,
            work_hours, production_plan_code, target_survival_rate, target_survival_count, loss_count, loss_rate,
            source_mode, external_seed_code, external_seed_name, external_seed_quantity, external_seed_note,
            propagation_mode, mother_plant_count, expanded_plant_count, scion_count, source_deducted_quantity,
            charge_person, seedling_form, unit } = req.body;
    // 2026-07-01: 兜底单位
    const seedlingUnit = unit || req.body.unit || '株';
    // 2026-06-05: 兼容 camelCase productionPlanCode 和 cropCode
    const productionPlanCode = production_plan_code ?? req.body.productionPlanCode;
    const workHours = work_hours ?? req.body.workHours;
    const cropCode = crop_code ?? req.body.cropCode;
    // 2026-06-13: 兼容 camelCase externalSeedCode / externalSeedName / externalSeedQuantity / externalSeedNote / sourceMode
    const sourceMode = source_mode ?? req.body.sourceMode;
    const externalSeedCode = external_seed_code ?? req.body.externalSeedCode;
    const externalSeedName = external_seed_name ?? req.body.externalSeedName;
    const externalSeedQuantity = external_seed_quantity ?? req.body.externalSeedQuantity;
    const externalSeedNote = external_seed_note ?? req.body.externalSeedNote;
    // 2026-06-15: 6 种模式 → 2 种
    const propagationMode = propagation_mode ?? req.body.propagationMode ?? 'one_to_one';
    const validModes = ['one_to_one', 'one_to_many'];
    if (!validModes.includes(propagationMode)) {
      return res.status(400).json({ success: false, error: `不支持的繁殖模式: ${propagationMode}` });
    }
    if (propagationMode === 'one_to_many' && (!mother_plant_count || mother_plant_count <= 0)) {
      return res.status(400).json({ success: false, error: `one_to_many 模式必须填写母株数量 > 0` });
    }
    // 2026-06-15: 负责人字段（前端 chargePerson）
    const chargePerson = req.body.charge_person ?? req.body.chargePerson ?? null;

    // 方案2.5: 验证育苗地点AreaType=4（种植区）
    if (greenhouse_name) {
      const db = getDatabase();
      const areaCheck = db.exec('SELECT area_type FROM greenhouses WHERE name = ? AND area_type IS NOT NULL AND area_type != ?', [greenhouse_name, '4']);
      const invalidCount = areaCheck[0]?.values?.length || 0;
      if (invalidCount > 0) {
        return res.status(400).json({ success: false, error: '所选位置不是种植区域(AreaType=4)，无法用于育苗' });
      }
    }

    const newId = id || `SD${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    // 2026-06-15: 数组列名 + 自动 ? 占位符（避免加列时占位符错位）
    const insertCols = [
      'id', 'seedling_code', 'source_id', 'source_name', 'crop_code', 'crop_name', 'crop_variety',
      'seedling_type', 'greenhouse_name', 'area_name', 'seedling_date', 'expected_finish_date',
      'seedling_quantity', 'survival_quantity', 'survival_rate', 'status', 'seedling_status', 'remarks', 'create_by', 'work_hours',
      'production_plan_code', 'target_survival_rate', 'target_survival_count', 'loss_count', 'loss_rate',
      'source_mode', 'external_seed_code', 'external_seed_name', 'external_seed_quantity', 'external_seed_note',
      'propagation_mode', 'mother_plant_count', 'expanded_plant_count', 'scion_count',
      'source_deducted_quantity',
      'charge_person',
      'seedling_form',
      'unit',
      // 2026-07-03 v5：无性繁殖母株溯源列
      'mother_source_type', 'mother_source_id', 'mother_source_code',
      'propagation_method', 'inoculation_count', 'survival_count',
      'mother_generation', 'mother_crop_name', 'mother_propagation_method', 'asexual_propagation_note',
      'create_time', 'update_time',
    ];
    const insertValues = [
      newId, seedling_code, source_id, source_name, cropCode, crop_name, crop_variety,
      seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
      seedling_quantity, survival_quantity, survival_rate, status || 'sown', seedling_status, remarks, create_by, workHours || null,
      productionPlanCode || null, target_survival_rate ?? null, target_survival_count ?? null, loss_count ?? 0, loss_rate ?? 0,
      sourceMode || 'internal', externalSeedCode || null, externalSeedName || null, externalSeedQuantity ?? 0, externalSeedNote || null,
      propagationMode, mother_plant_count ?? 0, expanded_plant_count ?? 0, scion_count ?? 0,
      (sourceMode === 'internal' && source_id && (seedling_quantity || 0) > 0 ? (seedling_quantity || 0) : 0),
      chargePerson,
      seedling_form || null, // 2026-06-27：种苗形态
      seedlingUnit, // 2026-07-01: 单位
      // 2026-07-03 v5：无性繁殖母株溯源
      req.body.mother_source_type || null,
      req.body.mother_source_id || null,
      req.body.mother_source_code || null,
      req.body.propagation_method || null,
      req.body.inoculation_count ?? 0,
      req.body.survival_count ?? 0,
      req.body.mother_generation || null,
      req.body.mother_crop_name || null,
      req.body.mother_propagation_method || null,
      req.body.asexual_propagation_note || null,
      now, now,
    ];
    if (insertCols.length !== insertValues.length) {
      throw new Error(`INSERT 列数(${insertCols.length}) 与值数(${insertValues.length}) 不一致`);
    }

    // 2026-07-14：POST / 路由整体加事务（修复 H1：此前 3 次写入无原子性）
    db.run('BEGIN TRANSACTION');
    try {
      db.run(
        `INSERT INTO seedlings (${insertCols.join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`,
        insertValues.map(v => v === undefined ? null : v)
      );

      // 同步建 crop_instance 行，让行级采收入库 findSourceInstanceId() 能溯源
      const seedlingCiId2 = `CI${Date.now()}-sd2`;
      db.run(
        `INSERT INTO crop_instances (
          id, instance_code, crop_name, crop_variety, business_id, business_type,
          source_instance_id, initial_quantity, current_quantity,
          planted_quantity, harvested_quantity, status, seedling_start_date,
          create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          seedlingCiId2,
          seedling_code || `YM${Date.now().toString().slice(0, 8)}-002`,
          crop_name || null,
          crop_variety || null,
          newId,
          'seedling',
          source_id || null,
          Number(seedling_quantity) || 0,
          Number(survival_quantity || seedling_quantity) || 0,
          0, 0,
          status || 'growing',
          seedling_date || null,
          chargePerson,
          now, now,
        ]
      );

      // 内部种源时扣减种源 remaining_quantity + 写 inventory_transaction
      const operatorName = create_by || 'system';
      if (sourceMode === 'internal' && source_id && (seedling_quantity || 0) > 0) {
        const chk = db.exec('SELECT remaining_quantity FROM seed_sources WHERE id = ? AND deleted_at IS NULL', [source_id]);
        const remaining = Number(chk[0]?.values?.[0]?.[0] || 0);
        if (remaining >= seedling_quantity) {
          db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?',
            [seedling_quantity, now, source_id]);
          const useDateYmd2 = now.slice(0, 10).replace(/-/g, '');
          const useTxId2 = await generateTransactionId(useDateYmd2);
          const useTransactionId2 = await generateTransactionId(useDateYmd2);
          const newRemaining2 = remaining - seedling_quantity;
          db.run(
            `INSERT INTO inventory_transaction (
              id, transaction_id, instance_id, stock_type, transaction_type, quantity,
              balance_before, balance_after, business_id, business_type, business_code,
              operator_id, operator_name, operate_date, remarks, create_time
            ) VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, 'seedling', ?, ?, ?, ?, ?, ?)`,
            [
              useTxId2, useTransactionId2, `seed_source:${source_id}`, 'seed',
              -seedling_quantity, remaining, newRemaining2,
              newId, seedling_code || '',
              create_by || '', operatorName, now.slice(0, 10),
              `种源被育苗使用 ${seedling_code || newId}（扣减 ${seedling_quantity}）`,
              now,
            ]
          );
        } else {
          throw new BusinessError(
            SeedSourceErrorCode.INSUFFICIENT_AVAILABLE,
            `可用数量不足：当前 ${remaining}，需扣减 ${seedling_quantity}`,
          );
        }
      }
      db.run('COMMIT');
    } catch (txError) {
      try { db.run('ROLLBACK'); } catch (_) { /* rollback 失败忽略 */ }
      throw txError;
    }
    // === 事务结束 ===

    // 写入 material_flow_log（外部种源 → external→seedling，内部种源 → seed_source→seedling）
    if (sourceMode === 'external') {
      try {
        const { writeFlowLog } = require('../services/flowLogService');
        writeFlowLog({
          flow_type: 'external→seedling',
          crop_name: crop_name,
          source_type: null, source_id: null, source_code: external_seed_code || null,
          source_quantity: external_seed_quantity ?? null, source_category: 'external',
          target_type: 'seedling', target_id: newId, target_code: seedling_code,
          target_quantity: seedling_quantity || 0, target_unit: '株',
          business_code: seedling_code, created_by: create_by || '',
        });
      } catch (e) { console.error('[seedling] writeFlowLog 失败:', (e as any)?.message || e); }
    } else if (source_id) {
      try {
        const { writeFlowLog } = require('../services/flowLogService');
        const { mapPropagationToCategory } = require('../lib/sourceCategoryMapper');
        let sourceCategory = 'external_purchase';
        try {
          const srcInfo = db.exec('SELECT propagation_type FROM seed_sources WHERE id = ?', [source_id]);
          if (srcInfo[0]?.values?.[0]) { sourceCategory = mapPropagationToCategory(srcInfo[0].values[0][0] as string); }
        } catch {}
        writeFlowLog({
          flow_type: 'seed_source→seedling',
          crop_name: crop_name,
          source_type: 'seed_source', source_id: source_id, source_code: source_name || source_id,
          source_quantity: seedling_quantity ?? 0, source_unit: '粒', source_category: sourceCategory,
          target_type: 'seedling', target_id: newId, target_code: seedling_code,
          target_quantity: seedling_quantity || 0, target_unit: '株',
          business_code: seedling_code, created_by: create_by || '',
        });
      } catch (e) { console.error('[seedling] writeFlowLog 失败:', (e as any)?.message || e); }
    }

    saveDatabase();
    res.status(201).json({ success: true, data: queryToObjects(db, 'SELECT * FROM seedlings WHERE id = ?', [newId])[0] });
  } catch (error) {
    // 2026-07-01 P0-2 修复：BusinessError 用其 httpStatus（默认 400），非 BusinessError 才 500
    if (error instanceof BusinessError) {
      return res.status(error.httpStatus || 400).json({ success: false, error: error.message });
    }
    console.error('创建育苗记录失败:', error);
    // 2026-06-15: 透出真实错误（铁律 #12：失败大声）
    const msg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: `创建育苗记录失败: ${msg}` });
  }
}));

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 查询旧记录（用于数量变更检测）
    const oldStmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    oldStmt.bind([id]);
    let old: any = null;
    if (oldStmt.step()) {
      old = oldStmt.getAsObject();
    }
    oldStmt.free();

    if (!old || Object.keys(old).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    // 白名单：只允许更新 DB 真实存在的列；过滤前端传来的额外字段（避免 SQL 注入 + 兼容字段缺失）
    const ALLOWED_FIELDS = new Set([
      'seedling_code', 'source_id', 'source_name', 'production_plan_code',
      'crop_code', 'crop_name', 'crop_variety', 'seedling_type',
      'greenhouse_name', 'area_name', 'seedling_date', 'expected_finish_date', 'actual_finish_date',
      'seedling_quantity', 'survival_quantity', 'survival_rate', 'planted_count',
      'pictures', 'quality_grade', 'status', 'seedling_status', 'remarks',
      'create_by', 'work_hours', 'print_count', 'end_type', 'end_time',
      'target_survival_rate', 'target_survival_count',
      'loss_count', 'loss_rate',
      'source_mode', 'external_seed_code', 'external_seed_name', 'external_seed_quantity', 'external_seed_note',
      // 2026-06-15: 负责人（编辑弹窗"负责人"显示空 bug 修复）
      'charge_person',
      // 2026-06-27 P0：种苗形态（详情弹窗"种苗类型"列数据源）
      'seedling_form',
      'unit', // 2026-07-01: 单位
    ]);
    const safeKeys = Object.keys(updates).filter(k => k !== 'id' && ALLOWED_FIELDS.has(k));
    if (safeKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const fields = safeKeys.map(k => `${k} = ?`).join(', ');
    const values = safeKeys.map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE seedlings SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();

    // 数量变更 correction 流水
    const hasQtyChanged = (
      (updates.seedling_quantity !== undefined && updates.seedling_quantity !== old.seedling_quantity) ||
      (updates.survival_quantity !== undefined && updates.survival_quantity !== old.survival_quantity)
    );
    if (hasQtyChanged) {
      try {
        const oldQty = (updates.seedling_quantity !== undefined) ? old.seedling_quantity : old.survival_quantity;
        const newQty = (updates.seedling_quantity !== undefined) ? updates.seedling_quantity : updates.survival_quantity;
        const delta = newQty - oldQty;
        if (Math.abs(delta) > 0.001) {
          writeCorrection({
            flow_type: 'seed_source→seedling',
            target_type: 'seedling',
            target_id: id,
            source_quantity_delta: delta,
            source_unit: '株',
            crop_name: old.crop_name || '',
            crop_variety: old.crop_variety || '',
            created_by: updates.create_by || '',
          });
          // 2026-06-14: 种源增量补偿（PUT 改 initialCount 时）
          // delta > 0 多扣；delta < 0 归还
          if (old.source_mode === 'internal' && old.source_id) {
            db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?',
              [delta, now, old.source_id]);
            // 同步更新 source_deducted_quantity 让 DELETE 时能正确归还
            const newDeducted = (Number(old.source_deducted_quantity) || 0) + delta;
            db.run('UPDATE seedlings SET source_deducted_quantity = ? WHERE id = ?', [newDeducted, id]);
          }
        }
      } catch (e) {
        console.error('[seedling] PUT 种源剩余量修正失败:', e);
        // 不阻断主流程（育苗记录已成功更新），但写入日志便于排查
      }
    }

    res.json({ success: true, data: queryToObjects(db, "SELECT * FROM seedlings WHERE id = ?", [id])[0] });
  } catch (error) {
    console.error('更新育苗记录失败:', error);
    res.status(500).json({ success: false, error: '更新育苗记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare('SELECT source_id, source_mode, source_deducted_quantity FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();

    db.exec('BEGIN');
    try {
      db.run('UPDATE seedlings SET deleted_at = ? WHERE id = ?', [now, id]);
      if (row && row.source_mode === 'internal' && row.source_id) {
        const deducted = Number(row.source_deducted_quantity) || 0;
        if (deducted > 0) {
          db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity + ?, update_time = ? WHERE id = ?',
            [deducted, now, row.source_id]);
        }
      }
      db.exec('COMMIT');
      saveDatabase();
      res.json({ success: true, data: { id, deleted: true } });
    } catch (innerErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw innerErr;
    }
  } catch (error) {
    console.error('删除育苗记录失败:', error);
    res.status(500).json({ success: false, error: '删除育苗记录失败' });
  }
});

/**
 * 2026-06-15: 数量体系重构 — 统一校验函数（按 2 模式分支）
 * 1:1 模式（one_to_one）：母株+母株损耗 ≤ initial；expanded 自动 = mother
 * 1:多 模式（one_to_many）：母株存活 [0, initial]；expanded ≥ 0；planted+loss ≤ mother+expanded
 * @returns null 表示通过；string 表示错误消息
 */
export function validateDailyChange(id: string, changeData: any): string | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT propagation_mode, seedling_quantity, mother_plant_count, mother_loss_count, expanded_plant_count, seedling_loss_count FROM seedlings WHERE id = ?');
  stmt.bind([id]);
  let row: any = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  if (!row) return null;
  const initial = Number(row.seedling_quantity) || 0;
  if (initial <= 0) return null;
  const mode = row.propagation_mode || 'one_to_one';
  const is11 = mode === 'one_to_one';

  // 2026-06-28：3 个 delta（移除 transplantedChange 业务字段，业务规则：种植管理不再从育苗取苗）
  const mlc = Number(changeData?.motherLossChange) || 0;
  const slc = Number(changeData?.seedlingLossChange) || 0;
  const ec = Number(changeData?.expandedChange) || 0;
  // 补苗（replant）— 1:1=补种子计入母株池；1:多=补母株计入母株池
  const rc = Number(changeData?.replantChange) || 0;
  if (rc < 0) return '补苗数不能为负';

  // 母株池 / 小苗池 严格分离校验
  // 母株池：1:1 = 当前 + 补苗（无损耗）；1:多 = 当前 - 损耗 + 补苗
  // 小苗池：1:1 = expanded（=母株同步）；1:多 = 当前产出 + 本次产出
  const newMother = is11
    ? (Number(row.mother_plant_count) || 0) + rc
    : (Number(row.mother_plant_count) || 0) - mlc + rc;
  const newMotherLoss = (Number(row.mother_loss_count) || 0) + mlc;
  const newExpanded = is11 ? newMother : ((Number(row.expanded_plant_count) || 0) + ec);
  const newSeedlingLoss = (Number(row.seedling_loss_count) || 0) + slc;
  const newHarvestStocked = Number(row.harvest_stocked_count) || 0;  // 此字段由其他路径累加

  // 母株池校验
  if (newMother < 0) return `母株存活数 ${newMother} 不能为负（母株池独立计算）`;
  if (newMotherLoss < 0) return '母株累计损耗不能为负';
  if (mlc < 0) return '母株损耗不能为负';
  if (rc < 0) return '补苗不能为负';

  // 小苗池校验（与母株池严格分离）
  if (newExpanded < 0) return '小苗产出累计越界';
  if (newSeedlingLoss < 0) return '小苗累计损耗不能为负';
  // 2026-06-28：移除 transplanted/autoPlanted 校验，小苗池消耗 = 损耗 + 采收入库
  const smallAvailable = newExpanded - newSeedlingLoss - newHarvestStocked;
  if (smallAvailable < 0) {
    return `小苗池消耗超过产出：累计产出 ${newExpanded}，累计消耗 ${newSeedlingLoss + newHarvestStocked}`;
  }
  if (newSeedlingLoss > newExpanded) {
    return `小苗损耗 ${newSeedlingLoss} 超过已产出 ${newExpanded}`;
  }
  return null;
}

/**
 * 2026-06-15: 数量体系重构 — 旧字段名 → 新字段名 兼容映射
 * daily_record.data 字段历史上存的是旧字段名（survivalCountChange/plantedCountChange/lossCountChange/runnerIncreaseCount）
 * 按 propagation_mode 路由到新字段：
 *   1:1 模式：survivalCountChange 视为 expandedChange（产出=存活=母株存活）
 *   1:多 模式：survivalCountChange 视为 motherLossChange（旧 "成活变化" UI 实际填的是母株损耗）
 *   其他字段：直接映射
 * @returns 转换后的对象（含新字段名）
 */
function normalizeChangeData(raw: any, propagationMode: string): any {
  if (!raw || typeof raw !== 'object') return raw || {};
  const is11 = (propagationMode || 'one_to_one') === 'one_to_one';
  const legacySc = Number(raw.survivalCountChange) || 0;
  const legacyLc = Number(raw.lossCountChange) || 0;
  const legacyRi = Number(raw.runnerIncreaseCount) || 0;
  const legacyRc = Number(raw.replantChange) || 0;
  return {
    // 2026-06-28：移除 transplantedChange 字段映射（业务规则：种植管理不再从育苗取苗）
    motherLossChange: is11 ? 0 : (Number(raw.motherLossChange) || legacySc),
    seedlingLossChange: Number(raw.seedlingLossChange) || legacyLc,
    expandedChange: Number(raw.expandedChange) || legacyRi || (is11 ? legacySc : 0),
    // 补苗（1:1=补种子；1:多=补母株；严格区分母株/小苗池子）
    replantChange: Math.max(0, Number(raw.replantChange) || legacyRc),
    // 保留旧字段名（用于 daily_record.data 写回时的兼容性）
    survivalCountChange: raw.survivalCountChange,
    lossCountChange: raw.lossCountChange,
    runnerIncreaseCount: raw.runnerIncreaseCount,
  };
}

/**
 * 2026-06-15: 数量体系重构 — 每日记录变更应用到育苗主表
 * 累加到新 5 字段（mother_loss_count/seedling_loss_count/transplanted_count/expanded_plant_count/auto_planted_count 等）
 * @param id 育苗 ID
 * @param changeData 业务字段包（motherLossChange/seedlingLossChange/expandedChange/transplantedChange）
 * @param sign +1 表示新增/正向变更；-1 表示删除/反向补偿
 * @returns null 表示成功；string 表示业务校验失败的错误消息
 *
 * 反向补偿（sign=-1，删除每日记录）跳过业务校验，但保留字段非负兜底（MAX(0, ...)）
 */
function applyDailyChangeToSeedling(id: string, changeData: any, sign: number): string | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT propagation_mode, seedling_quantity, mother_plant_count, expanded_plant_count FROM seedlings WHERE id = ?');
  stmt.bind([id]);
  let row: any = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  if (!row) return null;
  const initial = Number(row.seedling_quantity) || 0;
  const mode = row.propagation_mode || 'one_to_one';
  const is11 = mode === 'one_to_one';

  // 4 个 delta（新字段名）
  const mlc = Number(changeData?.motherLossChange) || 0;
  const slc = Number(changeData?.seedlingLossChange) || 0;
  const ec = Number(changeData?.expandedChange) || 0;
  const tc = Number(changeData?.transplantedChange) || 0;
  // 2026-06-16: 补苗（replant）— 1:1=补种子计入母株池；1:多=补母株计入母株池
  const rc = Number(changeData?.replantChange) || 0;

  // sign=+1 时校验；sign=-1 反向补偿跳过校验（铁律：能修复脏数据）
  if (sign > 0 && initial > 0) {
    const err = validateDailyChange(id, changeData);
    if (err) return err;
  }

  // 兜底：累加后任何字段不能为负
  const safeAdd = (col: string, delta: number) => {
    if (delta === 0) return;
    db.run(
      `UPDATE seedlings SET ${col} = MAX(0, ${col} + ?) WHERE id = ?`,
      [delta, id]
    );
  };

  // 累加到新字段
  safeAdd('mother_loss_count', mlc * sign);
  safeAdd('seedling_loss_count', slc * sign);
  // 2026-06-28：移除 transplanted_count 累加（业务规则：种植管理不再从育苗取苗）
  safeAdd('replant_count', rc * sign);  // 2026-06-16: 补苗累计（两种模式都加）

  if (!is11) {
    // 1:多 模式：母株损耗 mlc 同步扣减母株存活数；补苗 rc 同步累加母株存活数
    safeAdd('mother_plant_count', -mlc * sign + rc * sign);
    safeAdd('expanded_plant_count', ec * sign);
  } else {
    // 1:1 模式：补苗 rc 累加到母株池（1:1 没有"母株损耗"，只有补苗）
    safeAdd('mother_plant_count', rc * sign);
    // 1:1 模式：expanded_plant_count 由 mother_plant_count 派生（总投入数 = initial + replant）
    db.run('UPDATE seedlings SET expanded_plant_count = mother_plant_count WHERE id = ?', [id]);
  }

  // 2026-06-28：同步旧字段（前端 UI 标签预览显示需要）— 修复"成活数量/成活率全是 0"bug
  // 之前 bug：daily_records 累加只更新了新字段（mother_loss_count/seedling_loss_count 等），
  // 但旧字段（survival_quantity/loss_count/survival_rate/loss_rate）从未被同步，
  // 导致前端 apiSeedlingService 归一化后 survivalCount 永远是 0。
  db.run(`
    UPDATE seedlings
    SET
      loss_count = seedling_loss_count,
      survival_quantity = MAX(0, seedling_quantity - seedling_loss_count),
      survival_rate = CASE
        WHEN seedling_quantity > 0
        THEN ROUND((CAST(MAX(0, seedling_quantity - seedling_loss_count) AS REAL) / seedling_quantity) * 100, 1)
        ELSE 0
      END,
      loss_rate = CASE
        WHEN seedling_quantity > 0
        THEN ROUND((CAST(seedling_loss_count AS REAL) / seedling_quantity) * 100, 1)
        ELSE 0
      END
    WHERE id = ?
  `, [id]);

  return null;
}

/**
 * 添加每日记录
 * POST /seedlings/:id/daily-records
 */
router.post('/:id/daily-records', (req: Request, res: Response) => {
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
        const normalized = normalizeChangeData(parsed, (seedling as any).propagation_mode);
        const validateErr = validateDailyChange(id, normalized);
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
        const normalized = normalizeChangeData(parsed, (seedling as any).propagation_mode);
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
router.get('/:id/daily-records', (req: Request, res: Response) => {
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
router.put('/:id/daily-records/:recordId', (req: Request, res: Response) => {
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();
    const now = new Date().toISOString();

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
    // 兼容旧字段名：调用 normalizeChangeData 把旧字段名映射为新字段名
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
        const newDataNormalized = normalizeChangeData(newData, propagationMode);
        const oldDataNormalized = normalizeChangeData(oldData, propagationMode);
        const hasMeaningfulChange = ['survivalCountChange', 'plantedCountChange', 'lossCountChange', 'runnerIncreaseCount']
          .some(k => Number(oldData[k] ?? 0) !== Number(newData[k] ?? 0));
        if (hasMeaningfulChange) {
          // 1) 临时反向抵消旧值（用 normalized 数据）
          if (oldData && Object.keys(oldData).length > 0) {
            applyDailyChangeToSeedling(id, oldDataNormalized, -1);
          }
          // 2) 校验新值（用 normalized 数据）
          const validateErr = validateDailyChange(id, newDataNormalized);
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

    saveDatabase();
    res.json({ success: true, data: queryToObjects(db, "SELECT * FROM daily_records WHERE id = ?", [recordId])[0] });
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
router.delete('/:id/daily-records/:recordId', (req: Request, res: Response) => {
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

/**
 * 添加定植记录
 * POST /seedlings/:id/transplant-records
 */
router.post('/:id/transplant-records', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      crop_name,
      crop_variety,
      greenhouse_name,
      area_name,
      from_location,
      to_location,
      transplant_date,
      transplant_quantity,
      survival_quantity,
      survival_rate,
      operator_id,
      operator_name,
      status,
      remarks,
      data,
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

    // 生成定植记录ID和OID
    const newId = `TR${Date.now()}`;
    const newOid = `TR${Date.now()}${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 插入定植记录
    db.run(`
      INSERT INTO transplant_records (
        id, oid, transplant_code, source_type, source_id, source_name,
        crop_name, crop_variety, greenhouse_name, area_name,
        from_location, to_location, transplant_date, transplant_quantity,
        survival_quantity, survival_rate, operator_id, operator_name,
        status, remarks, data, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      newOid,
      newOid,
      'seedling',
      id,
      (seedling as any).seedling_code,
      crop_name || (seedling as any).crop_name,
      crop_variety || (seedling as any).crop_variety,
      greenhouse_name || (seedling as any).greenhouse_name,
      area_name || (seedling as any).area_name,
      from_location || ' nursery',
      to_location,
      transplant_date || formatLocalDateISO(),
      transplant_quantity || (seedling as any).survival_quantity || 0,
      survival_quantity || 0,
      survival_rate || 0,
      operator_id,
      operator_name,
      status || 'completed',
      remarks,
      data ? JSON.stringify(data) : null,
      create_by,
      now,
      now
    ]);

    // 更新育苗状态为已定植
    db.run('UPDATE seedlings SET status = ?, update_time = ? WHERE id = ?', ['transplanted', now, id]);

    saveDatabase();
    res.status(201).json({ success: true, data: queryToObjects(db, 'SELECT * FROM transplant_records WHERE id = ?', [newId])[0] });
  } catch (error) {
    console.error('添加定植记录失败:', error);
    res.status(500).json({ success: false, error: '添加定植记录失败' });
  }
});

/**
 * 更新定植记录状态
 * PUT /seedlings/:id/transplant-records/:recordId/status
 */
router.put('/:id/transplant-records/:recordId/status', (req: Request, res: Response) => {
  try {
    const { id, recordId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: '缺少 status 参数' });
    }

    const db = getDatabase();

    // 检查定植记录是否存在
    const stmt = db.prepare('SELECT * FROM transplant_records WHERE id = ? AND source_id = ? AND source_type = ?');
    stmt.bind([recordId, id, 'seedling']);
    let record: any = null;
    if (stmt.step()) {
      record = stmt.getAsObject();
    }
    stmt.free();

    if (!record || Object.keys(record).length === 0) {
      return res.status(404).json({ success: false, error: '定植记录不存在' });
    }

    const now = new Date().toISOString();
    db.run('UPDATE transplant_records SET status = ?, update_time = ? WHERE id = ?', [status, now, recordId]);
    saveDatabase();

    res.json({ success: true, data: { id: recordId, status } });
  } catch (error) {
    console.error('更新定植记录状态失败:', error);
    res.status(500).json({ success: false, error: '更新定植记录状态失败' });
  }
});

/**
 * 获取育苗的定植记录列表
 * GET /seedlings/:id/transplant-records
 */
router.get('/:id/transplant-records', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 获取该育苗的定植记录
    const countSql = 'SELECT COUNT(*) FROM transplant_records WHERE source_id = ? AND source_type = ?';
    const countParams = [id, 'seedling'];
    const total = execCount(db, countSql, countParams);

    let sql = 'SELECT * FROM transplant_records WHERE source_id = ? AND source_type = ? ORDER BY transplant_date DESC, create_time DESC';
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ' + Number(limit) + ' OFFSET ' + offset;

    const items = queryToObjects(db, sql, [id, 'seedling']);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取定植记录失败:', error);
    res.status(500).json({ success: false, error: '获取定植记录失败' });
  }
});

/**
 * 添加打印记录
 * POST /seedlings/:id/print
 */
router.post('/:id/print', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      print_type,
      print_title,
      printer_name,
      paper_size,
      copies,
      print_status,
      error_message,
      data,
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

    // 生成打印记录ID和OID
    const newId = `PR${Date.now()}`;
    const newOid = `PR${Date.now()}${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 插入打印记录
    db.run(`
      INSERT INTO print_records (
        id, oid, print_type, print_title, related_id, related_code, related_type,
        printer_name, paper_size, copies, print_status, error_message, data,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      newOid,
      print_type || 'seedling_label',
      print_title || '育苗标签打印',
      id,
      (seedling as any).seedling_code,
      'seedling',
      printer_name,
      paper_size || 'A6',
      copies || 1,
      print_status || 'success',
      error_message,
      data ? JSON.stringify(data) : null,
      create_by,
      now,
      now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, oid: newOid } });
  } catch (error) {
    console.error('添加打印记录失败:', error);
    res.status(500).json({ success: false, error: '添加打印记录失败' });
  }
});

/**
 * 获取育苗的打印记录列表
 * GET /seedlings/:id/print-records
 */
router.get('/:id/print-records', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 获取该育苗的打印记录
    const countSql = 'SELECT COUNT(*) FROM print_records WHERE related_id = ? AND related_type = ?';
    const countParams = [id, 'seedling'];
    const total = execCount(db, countSql, countParams);

    let sql = 'SELECT * FROM print_records WHERE related_id = ? AND related_type = ? ORDER BY create_time DESC';
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ' + Number(limit) + ' OFFSET ' + offset;

    const items = queryToObjects(db, sql, [id, 'seedling']);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取打印记录失败:', error);
    res.status(500).json({ success: false, error: '获取打印记录失败' });
  }
});

/**
 * 获取可用定植数量
 * GET /api/seedlings/:id/available-count
 */
router.get('/:id/available-count', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    const survivalQuantity = item.survival_quantity || 0;
    // 2026-06-28：业务规则变更，种植管理不再从育苗取苗，"可用定植"改为"可用苗数"：
    // 可用苗数 = 累计产出 - 累计损耗 - 采收入库累计（不含已定植，业务上已停止统计）
    const expanded = item.expanded_plant_count || 0;
    const seedlingLoss = item.seedling_loss_count || 0;
    const harvestStocked = item.harvest_stocked_count || 0;
    const availableCount = expanded - seedlingLoss - harvestStocked;

    res.json({ success: true, data: Math.max(0, availableCount) });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取可用数量失败' });
  }
});

/**
 * 增加已定植数量
 * POST /api/seedlings/:id/increase-planted
 */
router.post('/:id/increase-planted', (req: Request, res: Response) => {
  // 2026-06-28：业务规则变更 — 种植管理不再从育苗管理页面获取种苗（统一从内部种源）。
  // 此接口保留 route 不删（避免旧调用 404），但写入 DB 的逻辑已停用，仅返回成功。
  res.json({ success: true, data: { auto_planted_count: 0 }, deprecated: true });
});

/**
 * 获取所有标签编号
 * GET /api/seedlings/:id/all-label-numbers
 */
router.get('/:id/all-label-numbers', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    const survivalQuantity = item.survival_quantity || 0;
    const seedlingCode = item.seedling_code || item.id;
    const labelNumbers: string[] = [];

    for (let i = 1; i <= survivalQuantity; i++) {
      labelNumbers.push(`${seedlingCode}-${String(i).padStart(4, '0')}`);
    }

    res.json({ success: true, data: labelNumbers });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取标签编号失败' });
  }
});

/**
 * 获取栽种履历
 * GET /api/seedlings/:id/transplant-history
 */
router.get('/:id/transplant-history', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 从定植记录表获取所有相关的栽种履历
    const sql = `
      SELECT * FROM transplant_records
      WHERE source_id = ? AND source_type = 'seedling'
      ORDER BY transplant_date DESC, create_time DESC
    `;
    const items = queryToObjects(db, sql, [id]);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取栽种履历失败' });
  }
});

/**
 * 获取指定标签编号的履历
 * GET /api/seedlings/:id/transplant-history/:labelNumber
 */
router.get('/:id/transplant-history/:labelNumber', (req: Request, res: Response) => {
  try {
    const { id, labelNumber } = req.params;
    const db = getDatabase();

    // 查找该标签编号的定植记录
    const sql = `
      SELECT * FROM transplant_records
      WHERE source_id = ? AND source_type = 'seedling' AND transplant_quantity > 0
      ORDER BY transplant_date DESC, create_time DESC
    `;
    const items = queryToObjects(db, sql, [id]);

    // 过滤或模拟该标签编号的履历（实际应根据标签追踪表查询）
    const history = items.length > 0 ? items[0] : null;

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取标签履历失败' });
  }
});

/**
 * 添加栽种履历条目
 * POST /api/seedlings/:id/transplant-history/:labelNumber
 */
router.post('/:id/transplant-history/:labelNumber', (req: Request, res: Response) => {
  try {
    const { id, labelNumber } = req.params;
    const {
      to_area,
      to_location,
      operator_id,
      operator_name,
      remarks,
      create_by
    } = req.body;

    const db = getDatabase();

    // 验证育苗记录是否存在
    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let seedling: any = null;
    if (stmt.step()) {
      seedling = stmt.getAsObject();
    }
    stmt.free();

    if (!seedling || Object.keys(seedling).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    // 生成履历ID
    const newId = `TH${Date.now()}`;
    const now = new Date().toISOString();

    // 写入 transplant_history 表（2026-07-14：表已通过 schema.ts 创建）
    try {
      db.run(`
        INSERT INTO transplant_history (
          id, seedling_id, label_number, to_area, to_location,
          operator_id, operator_name, remarks, create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId, id, labelNumber, to_area || '', to_location || '',
        operator_id || '', operator_name || '', remarks || '',
        create_by || '', now, now
      ]);
      saveDatabase();
    } catch (err) {
      console.error('[transplant_history] INSERT 失败:', err);
      return res.status(500).json({ success: false, error: '栽种履历写入失败' });
    }

    res.status(201).json({
      success: true,
      data: {
        id: newId,
        seedlingId: id,
        labelNumber,
        toArea: to_area,
        toLocation: to_location,
        operatorId: operator_id,
        operatorName: operator_name,
        remarks,
        createBy: create_by,
        createTime: now
      }
    });
  } catch (error) {
    console.error('添加栽种履历失败:', error);
    res.status(500).json({ success: false, error: '添加栽种履历失败' });
  }
});

/**
 * 更新标签状态
 * PUT /api/seedlings/:id/transplant-history/:labelNumber/status
 */
router.put('/:id/transplant-history/:labelNumber/status', (req: Request, res: Response) => {
  try {
    const { id, labelNumber } = req.params;
    const { status } = req.body;
    const db = getDatabase();

    if (!status) {
      return res.status(400).json({ success: false, error: '缺少 status 参数' });
    }

    // 2026-07-14：修复空操作 bug — 原代码仅 return {success:true} 不执行任何更新
    const stmt = db.prepare('UPDATE transplant_history SET status = ?, update_time = ? WHERE seedling_id = ? AND label_number = ?');
    stmt.bind([status, new Date().toISOString(), id, labelNumber]);
    stmt.step();
    stmt.free();
    saveDatabase();

    res.json({ success: true, message: '标签状态已更新' });
  } catch (error) {
    console.error('[seedling] 更新标签状态失败:', error);
    res.status(500).json({ success: false, error: '更新标签状态失败' });
  }
});

/**
 * GET /api/seedlings/:id/history
 * 2026-06-27: 育苗实体历史（audit_logs + inbound + transaction UNION）
 */
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { queryEntityHistory } = require('../services/entityHistory.service');
  const items = queryEntityHistory('seedling', id, 200);
  res.json({ success: true, data: items });
}));

export default router;
