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
// 2026-10-17：单位口径判断（种源单位 ≠ 育苗单位时禁止按株扣减，必须显式消耗量）
import { isSameUnitDimension } from '../lib/unitCategories';
import { seedLog } from '../lib/seedLogger';
import { formatLocalDateISO } from '../utils/dateUtil';
// 2026-07-22：追溯修复 - 子表操作写入 audit_log
import { writeAuditLog } from '../services/auditLog.service';

import seedlingDailyRecordsRouter from "./seedlingDailyRecords.route";
import seedlingTransplantRouter from "./seedlingTransplant.route";
import { archiveBeforeDelete, markArchiveFailed } from '../services/recycleBin.service';
const router = Router();

/**
 * 2026-10-17：删除育苗时退回种源扣减（单条/批量共用）
 * - 余额 + 库存流水 + 纠错流转 三件套，保证删除后四 Tab 对账一致
 * - 批量删除此前漏退款，回收站恢复会重复扣减，故统一到本函数
 */
async function refundSeedlingSourceOnDelete(
  db: any,
  row: any,
  now: string,
  operator: { name?: string; id?: string },
): Promise<void> {
  // 注意：queryToObjects 返回 camelCase（不是表字段 snake_case）
  const sourceId = row?.sourceId ?? row?.source_id;
  const sourceMode = String(row?.sourceMode ?? row?.source_mode ?? '');
  const deducted = Number(row?.sourceDeductedQuantity ?? row?.source_deducted_quantity) || 0;
  if (!row || sourceMode !== 'internal' || !sourceId || deducted <= 0) return;

  const srcRows = queryToObjects<any>(
    db,
    'SELECT source_code, unit, remaining_quantity FROM seed_sources WHERE id = ?',
    [sourceId],
  );
  const src = srcRows[0];
  if (!src) return; // 种源已硬删：跳过库存调整（历史孤儿数据）

  // queryToObjects 返回 camelCase：remainingQuantity / sourceCode / unit
  const before = Number(src.remainingQuantity ?? src.remaining_quantity) || 0;
  const after = before + deducted;
  db.run('UPDATE seed_sources SET remaining_quantity = ?, update_time = ? WHERE id = ?', [
    after, now, sourceId,
  ]);

  const ymd = now.slice(0, 10).replace(/-/g, '');
  const txId = await generateTransactionId(ymd);
  const transactionId = await generateTransactionId(ymd);
  const correctCode = row.seedlingCode ?? row.seedling_code ?? row.id;
  db.run(
    `INSERT INTO inventory_transaction (
      id, transaction_id, instance_id, stock_type, transaction_type, quantity,
      balance_before, balance_after, business_id, business_type, business_code,
      operator_id, operator_name, operate_date, remarks, create_time
    ) VALUES (?, ?, ?, ?, 'inbound', ?, ?, ?, ?, 'seedling', ?, ?, ?, ?, ?, ?)`,
    [
      txId, transactionId, `seed_source:${sourceId}`, 'seed',
      deducted, before, after,
      row.id, correctCode,
      operator.id || '', operator.name || 'system', now.slice(0, 10),
      `删除育苗 ${correctCode} 退回种源 ${deducted}${src.unit || ''}`,
      now,
    ],
  );
  // 纠错流转：种源领用量减少（负增量），种源时间线可见
  writeCorrection({
    flow_type: 'seed_source→seedling',
    source_type: 'seed_source',
    source_id: sourceId,
    source_code: String(src.sourceCode ?? src.source_code ?? ''),
    target_type: 'seedling',
    target_id: row.id,
    target_code: correctCode,
    source_quantity_delta: -deducted,
    source_unit: String(src.unit || ''),
    crop_name: String(row.cropName ?? row.crop_name ?? ''),
    crop_variety: String(row.cropVariety ?? row.crop_variety ?? ''),
    created_by: operator.name || 'system',
  });
}

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
    // 2026-07-21 修复：同步单个更新白名单
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
      // 2026-07-21 新增
      'mother_plant_count', 'expanded_plant_count', 'mother_loss_count',
      'seedling_loss_count', 'harvest_stocked_count', 'replant_count',
      'propagation_mode', 'calculate_mode', 'propagation_multiple',
      'custom_multiple', 'theoretical_yield', 'available_transplant_count',
      // 2026-07-25: 区域外键（zones.oid），area_name 仍冗余保留
      'area_oid',
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
router.delete('/batch', asyncHandler(async (req: Request, res: Response) => {
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
  const operator = { name: (req as any).user?.name, id: (req as any).user?.userId };
  // 仅处理未删除记录，避免重复退款
  const rows = queryToObjects<any>(
    db,
    `SELECT * FROM seedlings WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    idArray,
  );

  const archiveIds: Array<string | null> = [];
  const deletedIds: string[] = [];
  db.run('BEGIN');
  try {
    for (const row of rows) {
      // 2026-10-17：删除前归档到回收站
      archiveIds.push(archiveBeforeDelete('seedling', row.id, { operator, sourcePage: '/crop/seedling' }));
      // 2026-10-17：批量删除补退款（与单条删除一致：余额 + 流水 + 纠错流转）
      await refundSeedlingSourceOnDelete(db, row, now, operator);
      db.run('UPDATE seedlings SET deleted_at = ? WHERE id = ?', [now, row.id]);
      deletedIds.push(row.id);
    }
    db.run('COMMIT');
  } catch (error) {
    try { db.run('ROLLBACK'); } catch { /* 保持原错误 */ }
    for (const archiveId of archiveIds) markArchiveFailed(archiveId, error);
    throw error;
  }
  saveDatabase();
  res.json({ success: true, data: { deletedCount: deletedIds.length } });
}));

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
  // 2026-10-17：种源单位与育苗单位不同时，客户端必须显式提交种源消耗量（单位=种源单位）
  const explicitConsumedRaw = req.body?.sourceConsumedQuantity ?? req.body?.source_consumed_quantity;
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
  // 2026-10-17：补齐新增弹窗已提交、但此前 with-deduct 未落库的业务字段
  //   （品质等级 / 计算模式 / 扩繁倍数 / 理论产量 / 图片 / 累计字段）
  const qualityGrade = (seedling as any).quality_grade ?? (seedling as any).qualityGrade ?? null;
  const calculateMode = (seedling as any).calculate_mode ?? (seedling as any).calculateMode ?? 'single';
  const propagationMultiple = Number((seedling as any).propagation_multiple ?? (seedling as any).propagationMultiple ?? 0);
  const customMultiple = Number((seedling as any).custom_multiple ?? (seedling as any).customMultiple ?? 0);
  const theoreticalYield = Number((seedling as any).theoretical_yield ?? (seedling as any).theoreticalYield ?? 0);
  const motherLossCount = Number((seedling as any).mother_loss_count ?? (seedling as any).motherLossCount ?? 0);
  const seedlingLossCount = Number((seedling as any).seedling_loss_count ?? (seedling as any).seedlingLossCount ?? 0);
  const harvestStockedCount = Number((seedling as any).harvest_stocked_count ?? (seedling as any).harvestStockedCount ?? 0);
  const picturesValue = seedling.pictures == null || typeof seedling.pictures === 'string'
    ? (seedling.pictures ?? null)
    : JSON.stringify(seedling.pictures);
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
  // 2026-10-17：实际扣减量（同口径=育苗数量；异口径=用户填写的种源消耗量，可为小数）
  const seedlingUnitForDeduct = String((seedling as any)?.unit || '株');
  let deductCount = safeCount;
  let deductUnit = seedlingUnitForDeduct;

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
      const stmt = db.prepare('SELECT remaining_quantity, propagation_status, unit FROM seed_sources WHERE id = ? AND deleted_at IS NULL');
      stmt.bind([sourceId]);
      let existing: { remaining_quantity?: number; propagation_status?: string; unit?: string } | null = null;
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
      // 2026-10-17 单位口径：同口径直接扣育苗数量；不同口径（如 千克→株）必须显式消耗量
      const sourceUnitForDeduct = String(existing.unit || '');
      deductUnit = sourceUnitForDeduct || seedlingUnitForDeduct;
      if (!isSameUnitDimension(sourceUnitForDeduct, seedlingUnitForDeduct)) {
        const consumed = Number(explicitConsumedRaw);
        if (!Number.isFinite(consumed) || consumed <= 0) {
          throw new BusinessError(
            SeedSourceErrorCode.INVALID_DECREASE_COUNT,
            `种源单位为「${sourceUnitForDeduct}」，与育苗单位「${seedlingUnitForDeduct}」不同，请填写种源消耗量（${sourceUnitForDeduct}）`,
          );
        }
        deductCount = consumed;
      } else {
        deductCount = safeCount;
      }
      if (current < deductCount) {
        throw new BusinessError(
          SeedSourceErrorCode.INSUFFICIENT_AVAILABLE,
          `可用数量不足：当前 ${current}${sourceUnitForDeduct ? ' ' + sourceUnitForDeduct : ''}，需扣减 ${deductCount}${sourceUnitForDeduct ? ' ' + sourceUnitForDeduct : ''}`,
        );
      }
      const newAvailable = current - deductCount;

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
          -deductCount, current, newAvailable,
          newId, seedling_code || '',
          create_by || '', operatorName, now.slice(0, 10),
          `种源被育苗使用 ${seedling_code || newId}（扣减 ${deductCount}${deductUnit ? ' ' + deductUnit : ''}）`,
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
      // 2026-10-17：补齐新增弹窗提交的业务字段（此前被 with-deduct 静默丢弃）
      'unit',
      'quality_grade',
      'calculate_mode', 'propagation_multiple', 'custom_multiple', 'theoretical_yield',
      'mother_loss_count', 'seedling_loss_count', 'harvest_stocked_count',
      'pictures',
      // 2026-07-03 v5：无性繁殖母株溯源列
      'mother_source_type', 'mother_source_id', 'mother_source_code',
      'propagation_method', 'inoculation_count', 'survival_count',
      'mother_generation', 'mother_crop_name', 'mother_propagation_method', 'asexual_propagation_note',
      'create_time', 'update_time',
      // 2026-07-25: 区域外键（zones.oid），area_name 仍冗余保留
      'area_oid',
    ];
    const insertValues = [
      newId, seedling_code, effectiveSourceId, source_name, cropCode, crop_name, crop_variety,
      seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
      seedling_quantity, survival_quantity, survival_rate, status || 'sown', seedling_status, remarks, create_by, workHours || null,
      productionPlanCode || null,
      target_survival_rate ?? null, target_survival_count ?? null, loss_count ?? 0, loss_rate ?? 0,
      source_mode || 'internal', external_seed_code || null, external_seed_name || null, external_seed_quantity ?? 0, external_seed_note || null,
      propagationMode, mother_plant_count ?? 0, expanded_plant_count ?? 0, scion_count ?? 0,
      // 2026-10-17：记录实际扣减量（同口径=育苗数量；异口径=显式种源消耗量）
      deductCount,
      chargePerson,
      seedling.seedling_form || null, // 2026-06-27：种苗形态
      // 2026-10-17：补齐新增弹窗提交的业务字段
      seedlingUnitForDeduct,
      qualityGrade,
      calculateMode, propagationMultiple, customMultiple, theoreticalYield,
      motherLossCount, seedlingLossCount, harvestStockedCount,
      picturesValue,
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
      // 2026-07-25: 区域外键（接受 areaOid camelCase 或 area_oid snake_case）
      seedling.area_oid ?? seedling.areaOid ?? null,
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
      let sourceCategory = '其他';  // 2026-08-21：改为中文持久化
      let finalSourceCode: string = effectiveSourceId;
      if (isExternalMode) {
        sourceCategory = '外部';  // 2026-08-21：改为中文持久化
        finalSourceCode = (externalSource as any).code || (externalSource as any).seedCode || effectiveSourceId;
      } else {
        const srcInfo = db.exec('SELECT propagation_type FROM seed_sources WHERE id = ?', [effectiveSourceId]);
        if (srcInfo[0]?.values?.[0]) {
          sourceCategory = mapPropagationToCategory(srcInfo[0].values[0][0] as string);
        }
        // 2026-10-16 修复：source_code 必须写种源业务编码（ZYxxx）——trace 端点按业务编码匹配
        //   （source_code=? OR target_code=?），原值可能是内部 ID（SSxxx），会导致种源时间线
        //   「流转」分类查不到该育苗领用记录（用户报告：被育苗使用后的流转缺失）
        const ssCodeRows = db.exec('SELECT source_code FROM seed_sources WHERE id = ?', [effectiveSourceId]);
        const realSsCode = ssCodeRows[0]?.values?.[0]?.[0];
        finalSourceCode = (realSsCode ? String(realSsCode) : '')
          || (seedling as any).source_code || (seedling as any).sourceCode || effectiveSourceId;
      }
      writeFlowLog({
        flow_type: flowType,
        crop_name: crop_name,
        crop_variety: crop_variety,
        source_type: isExternalMode ? null : 'seed_source',
        source_id: isExternalMode ? null : effectiveSourceId,
        source_code: finalSourceCode,
        // 2026-10-17：原 source_unit 硬编码 '粒'，与种源真实单位不符；改为实际单位 + 实际扣减量
        source_quantity: deductCount,
        source_unit: deductUnit,
        source_category: sourceCategory,
        target_type: 'seedling',
        target_id: newId,
        target_code: seedling_code,
        target_quantity: seedling_quantity || 0,
        target_unit: seedlingUnitForDeduct,
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

      // 2026-07-22：追溯修复 - 写入 audit_log（每个 ID 一条）
      writeAuditLog({
        businessType: 'seedling.print',
        businessId: seedlingId,
        action: 'print',
        operatorName: operator,
        opinion: `打印育苗标签 ${seedling.seedling_code}`,
      });
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
        COALESCE(ss.unit, '') AS sourceUnit,
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
        COALESCE(ss.unit, '') AS sourceUnit,
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
            charge_person, seedling_form, unit, quality_grade } = req.body;
    // 2026-10-17：品质等级在新增时也可录入（此前仅编辑弹窗支持）
    const qualityGrade = quality_grade ?? req.body.qualityGrade ?? null;
    // 2026-10-17：补齐新增弹窗提交但此前 POST 未落库的业务字段
    const calculateMode = req.body.calculate_mode ?? req.body.calculateMode ?? 'single';
    const propagationMultiple = Number(req.body.propagation_multiple ?? req.body.propagationMultiple ?? 0);
    const customMultiple = Number(req.body.custom_multiple ?? req.body.customMultiple ?? 0);
    const theoreticalYield = Number(req.body.theoretical_yield ?? req.body.theoreticalYield ?? 0);
    const picturesValue = req.body.pictures == null || typeof req.body.pictures === 'string'
      ? (req.body.pictures ?? null)
      : JSON.stringify(req.body.pictures);
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
    // 2026-07-23：育苗后形态必填（防止绕过前端校验 POST null，下游详情弹窗"种苗类型"列显示空）
    // 兼容 camelCase / snake_case 两种字段名（前端 AddModal 用 seedlingForm）
    const seedlingFormRaw = req.body.seedling_form ?? req.body.seedlingForm;
    if (!seedlingFormRaw || !String(seedlingFormRaw).trim()) {
      return res.status(400).json({ success: false, error: '请选择育苗后形态（必填）' });
    }
    const seedlingForm = String(seedlingFormRaw).trim();
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
    // 2026-10-17 单位口径修复：种源单位与育苗单位不同 → 不允许按育苗数量扣减种源
    //   旧行为：22 千克种源被扣 10「株」，剩余变成 12 千克（语义错误）。
    //   新规则：同口径直接扣育苗数量；不同口径必须显式提交种源消耗量（单位=种源单位）。
    const sourceConsumedRaw = req.body.source_consumed_quantity ?? req.body.sourceConsumedQuantity;
    let sourceUnit = '';
    let sourceDeductQuantity = 0;
    if (sourceMode === 'internal' && source_id) {
      const srcRow = db.exec('SELECT unit, remaining_quantity FROM seed_sources WHERE id = ? AND deleted_at IS NULL', [source_id]);
      sourceUnit = String(srcRow[0]?.values?.[0]?.[0] || '');
      const remainingQty = Number(srcRow[0]?.values?.[0]?.[1] || 0);
      if (!isSameUnitDimension(sourceUnit, seedlingUnit)) {
        const consumed = Number(sourceConsumedRaw);
        if (!Number.isFinite(consumed) || consumed <= 0) {
          return res.status(400).json({
            success: false,
            error: `种源单位为「${sourceUnit}」，与育苗单位「${seedlingUnit}」不同，请填写种源消耗量（${sourceUnit}）`,
          });
        }
        if (consumed > remainingQty) {
          return res.status(400).json({
            success: false,
            error: `种源消耗量 ${consumed}${sourceUnit} 超过可用数量 ${remainingQty}${sourceUnit}`,
          });
        }
        sourceDeductQuantity = consumed;
      } else {
        sourceDeductQuantity = Number(seedling_quantity) || 0;
      }
    }

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
      // 2026-10-17：品质等级（新增入口）
      'quality_grade',
      // 2026-10-17：计算模式/扩繁参数/图片（此前 POST 未落库）
      'calculate_mode', 'propagation_multiple', 'custom_multiple', 'theoretical_yield',
      'pictures',
      // 2026-07-03 v5：无性繁殖母株溯源列
      'mother_source_type', 'mother_source_id', 'mother_source_code',
      'propagation_method', 'inoculation_count', 'survival_count',
      'mother_generation', 'mother_crop_name', 'mother_propagation_method', 'asexual_propagation_note',
      'create_time', 'update_time',
      // 2026-07-25: 区域外键（zones.oid），area_name 仍冗余保留
      'area_oid',
    ];
    const insertValues = [
      newId, seedling_code, source_id, source_name, cropCode, crop_name, crop_variety,
      seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
      seedling_quantity, survival_quantity, survival_rate, status || 'sown', seedling_status, remarks, create_by, workHours || null,
      productionPlanCode || null, target_survival_rate ?? null, target_survival_count ?? null, loss_count ?? 0, loss_rate ?? 0,
      sourceMode || 'internal', externalSeedCode || null, externalSeedName || null, externalSeedQuantity ?? 0, externalSeedNote || null,
      propagationMode, mother_plant_count ?? 0, expanded_plant_count ?? 0, scion_count ?? 0,
      // 2026-10-17：按单位口径记录实际扣减量（同口径=育苗数量；异口径=显式种源消耗量）
      (sourceMode === 'internal' && source_id ? sourceDeductQuantity : 0),
      chargePerson,
      seedlingForm, // 2026-07-23：已校验必填，不再 `|| null`
      seedlingUnit, // 2026-07-01: 单位
      qualityGrade, // 2026-10-17：品质等级（新增入口）
      calculateMode, propagationMultiple, customMultiple, theoreticalYield,
      picturesValue,
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
      // 2026-07-25: 区域外键（接受 areaOid camelCase 或 area_oid snake_case）
      req.body.area_oid ?? req.body.areaOid ?? null,
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
      // 2026-10-17：扣减量改按单位口径 —— 同口径=育苗数量；异口径=用户填写的种源消耗量
      const operatorName = create_by || 'system';
      if (sourceMode === 'internal' && source_id && sourceDeductQuantity > 0) {
        const chk = db.exec('SELECT remaining_quantity FROM seed_sources WHERE id = ? AND deleted_at IS NULL', [source_id]);
        const remaining = Number(chk[0]?.values?.[0]?.[0] || 0);
        if (remaining >= sourceDeductQuantity) {
          db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?',
            [sourceDeductQuantity, now, source_id]);
          const useDateYmd2 = now.slice(0, 10).replace(/-/g, '');
          const useTxId2 = await generateTransactionId(useDateYmd2);
          const useTransactionId2 = await generateTransactionId(useDateYmd2);
          const newRemaining2 = remaining - sourceDeductQuantity;
          db.run(
            `INSERT INTO inventory_transaction (
              id, transaction_id, instance_id, stock_type, transaction_type, quantity,
              balance_before, balance_after, business_id, business_type, business_code,
              operator_id, operator_name, operate_date, remarks, create_time
            ) VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, 'seedling', ?, ?, ?, ?, ?, ?)`,
            [
              useTxId2, useTransactionId2, `seed_source:${source_id}`, 'seed',
              -sourceDeductQuantity, remaining, newRemaining2,
              newId, seedling_code || '',
              create_by || '', operatorName, now.slice(0, 10),
              `种源被育苗使用 ${seedling_code || newId}（扣减 ${sourceDeductQuantity}${sourceUnit ? ' ' + sourceUnit : ''}）`,
              now,
            ]
          );
        } else {
          throw new BusinessError(
            SeedSourceErrorCode.INSUFFICIENT_AVAILABLE,
            `可用数量不足：当前 ${remaining}${sourceUnit ? ' ' + sourceUnit : ''}，需扣减 ${sourceDeductQuantity}${sourceUnit ? ' ' + sourceUnit : ''}`,
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
          source_quantity: external_seed_quantity ?? null, source_category: '外部',  // 2026-08-21：改为中文持久化
          target_type: 'seedling', target_id: newId, target_code: seedling_code,
          target_quantity: seedling_quantity || 0, target_unit: '株',
          business_code: seedling_code, created_by: create_by || '',
        });
      } catch (e) { console.error('[seedling] writeFlowLog 失败:', (e as any)?.message || e); }
    } else if (source_id) {
      try {
        const { writeFlowLog } = require('../services/flowLogService');
        const { mapPropagationToCategory } = require('../lib/sourceCategoryMapper');
        let sourceCategory = '外购';  // 2026-08-21：改为中文持久化
        try {
          const srcInfo = db.exec('SELECT propagation_type FROM seed_sources WHERE id = ?', [source_id]);
          if (srcInfo[0]?.values?.[0]) { sourceCategory = mapPropagationToCategory(srcInfo[0].values[0][0] as string); }
        } catch {}
        // 2026-10-16 修复：source_code 写种源业务编码（ZYxxx），与 trace 端点匹配口径一致
        //   （原 source_name || source_id 可能写内部 ID，导致种源时间线「流转」分类查不到）
        let sourceCodeForFlow: string = source_name || source_id;
        try {
          const scr = db.exec('SELECT source_code FROM seed_sources WHERE id = ?', [source_id]);
          const realCode = scr[0]?.values?.[0]?.[0];
          if (realCode) sourceCodeForFlow = String(realCode);
        } catch {}
        writeFlowLog({
          flow_type: 'seed_source→seedling',
          crop_name: crop_name,
          source_type: 'seed_source', source_id: source_id, source_code: sourceCodeForFlow,
          // 2026-10-17：source_unit 原硬编码 '粒'，与种源真实单位（千克/克/袋/株）不符；
          //   改为实际单位 + 实际扣减量（异口径时=用户填写的种源消耗量）
          source_quantity: sourceDeductQuantity, source_unit: sourceUnit || seedlingUnit, source_category: sourceCategory,
          target_type: 'seedling', target_id: newId, target_code: seedling_code,
          target_quantity: seedling_quantity || 0, target_unit: seedlingUnit,
          business_code: seedling_code, created_by: create_by || '',
        });
      } catch (e) { console.error('[seedling] writeFlowLog 失败:', (e as any)?.message || e); }
    }

    saveDatabase();
    // 2026-07-22：追溯修复 - seedling 创建补 audit_log
    writeAuditLog({
      businessType: 'seedling.create',
      businessId: newId,
      action: 'create',
      operatorName: create_by || (req as any).user?.name,
      opinion: `创建育苗 ${seedling_code}`,
    });
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

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
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
    // 2026-07-21 修复：补全 10 个缺失字段（之前编辑无法保存）
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
      'charge_person', 'seedling_form', 'unit',
      // 2026-07-21 新增：数量体系字段（编辑弹窗可保存）
      'mother_plant_count', 'expanded_plant_count', 'mother_loss_count',
      'seedling_loss_count', 'harvest_stocked_count', 'replant_count',
      'propagation_mode', 'calculate_mode', 'propagation_multiple',
      'custom_multiple', 'theoretical_yield', 'available_transplant_count',
      // 2026-07-25: 区域外键（zones.oid），area_name 仍冗余保留
      'area_oid',
    ]);
    // 2026-07-21 修复：前端传 camelCase，后端白名单是 snake_case，需要转换
    const CAMEL_TO_SNAKE: Record<string, string> = {
      motherPlantCount: 'mother_plant_count',
      expandedPlantCount: 'expanded_plant_count',
      motherLossCount: 'mother_loss_count',
      seedlingLossCount: 'seedling_loss_count',
      harvestStockedCount: 'harvest_stocked_count',
      replantCount: 'replant_count',
      propagationMode: 'propagation_mode',
      calculateMode: 'calculate_mode',
      propagationMultiple: 'propagation_multiple',
      customMultiple: 'custom_multiple',
      theoreticalYield: 'theoretical_yield',
      availableTransplantCount: 'available_transplant_count',
      seedlingForm: 'seedling_form',
      seedlingType: 'seedling_type',
      greenhouseName: 'greenhouse_name',
      areaName: 'area_name',
      startDate: 'seedling_date',
      expectedEndDate: 'expected_finish_date',
      endDate: 'actual_finish_date',
      initialCount: 'seedling_quantity',
      survivalCount: 'survival_quantity',
      survivalRate: 'survival_rate',
      qualityGrade: 'quality_grade',
      workHours: 'work_hours',
      chargePerson: 'charge_person',
      productionPlanCode: 'production_plan_code',
      cropCode: 'crop_code',
      cropName: 'crop_name',
      cropVariety: 'crop_variety',
      unit: 'unit',
      sourceId: 'source_id',
      sourceCode: 'source_name',
      sourceName: 'source_name',
      remarks: 'remarks',
      endType: 'end_type',
      endTime: 'end_time',
      targetSurvivalRate: 'target_survival_rate',
      targetSurvivalCount: 'target_survival_count',
      lossCount: 'loss_count',
      lossRate: 'loss_rate',
      printCount: 'print_count',
      status: 'status',
      // 2026-07-25: 区域外键
      areaOid: 'area_oid',
    };
    // 转换 camelCase → snake_case，过滤不在白名单中的字段
    const snakeUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      const snakeKey = CAMEL_TO_SNAKE[key] || key;
      if (ALLOWED_FIELDS.has(snakeKey)) {
        snakeUpdates[snakeKey] = value;
      }
    }
    // 2026-10-17 固化不变量：母株池基数与初始数量恒等（mother_plant_count == seedling_quantity）
    // 历史三种口径（建档基数 / 含补苗 / 扣损耗）打架导致 9 行漂移、存活数补苗双计。
    // 补苗/损耗必须走独立列（replant_count / *_loss_count），禁止并入或偏离基数。
    // 双向强制：改任一字段，另一字段跟随（前端两个输入框也已互相同步）。
    if (snakeUpdates.seedling_quantity !== undefined) {
      snakeUpdates.mother_plant_count = snakeUpdates.seedling_quantity;
    } else if (snakeUpdates.mother_plant_count !== undefined) {
      snakeUpdates.seedling_quantity = snakeUpdates.mother_plant_count;
    }

    const safeKeys = Object.keys(snakeUpdates);
    if (safeKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    // ============================================================
    // 2026-10-17 种源扣减口径（PUT）
    //   ① 单位同口径：扣减量 = 育苗初始数量（改 initialCount 时按差额补/退）
    //   ② 单位不同口径（如种源千克、育苗株）：初始数量变化不自动换算，
    //      必须显式提交 sourceConsumedQuantity（单位=种源单位），按差额调整
    //   ③ 支持更换种源：旧种源退回原扣减，新种源按新口径重新扣减
    //   ④ 修复原代码两处静默失配（读原始 body 的 snake_case 键、读 camelCase 的 old 行字段）
    // ============================================================
    const newSourceId = snakeUpdates.source_id !== undefined ? snakeUpdates.source_id : old.source_id;
    const newSourceMode = snakeUpdates.source_mode !== undefined ? snakeUpdates.source_mode : old.source_mode;
    const newSeedlingUnit = String(snakeUpdates.unit ?? old.unit ?? '株');
    const oldDeducted = Number(old.source_deducted_quantity) || 0;
    const sourceChanged = String(newSourceId || '') !== String(old.source_id || '');

    let newSourceUnit = '';
    let newSourceRemaining = 0;
    let newSourceExists = false;
    let newSourceCode = '';
    if (newSourceId && newSourceMode === 'internal') {
      const srcRow = db.exec('SELECT unit, remaining_quantity, source_code FROM seed_sources WHERE id = ? AND deleted_at IS NULL', [newSourceId]);
      if (srcRow[0]?.values?.[0]) {
        newSourceExists = true;
        newSourceUnit = String(srcRow[0].values[0][0] || '');
        newSourceRemaining = Number(srcRow[0].values[0][1] || 0);
        newSourceCode = String(srcRow[0].values[0][2] || '');
      }
    }
    // 2026-10-17：旧种源信息（换种源退回 / 差额流水余额计算 需要）
    let oldSourceUnit = '';
    let oldSourceCode = '';
    let oldSourceRemaining = 0;
    if (old.source_id && old.source_mode === 'internal') {
      const oldSrcRow = db.exec('SELECT unit, remaining_quantity, source_code FROM seed_sources WHERE id = ?', [old.source_id]);
      if (oldSrcRow[0]?.values?.[0]) {
        oldSourceUnit = String(oldSrcRow[0].values[0][0] || '');
        oldSourceRemaining = Number(oldSrcRow[0].values[0][1] || 0);
        oldSourceCode = String(oldSrcRow[0].values[0][2] || '');
      }
    }
    // 关联种源已被删除：跳过种源库存调整（避免误改已删记录/误报可用不足）
    const skipSourceAdjustment = newSourceMode === 'internal' && !newSourceExists && !sourceChanged;

    const explicitConsumption = newSourceExists && newSourceMode === 'internal'
      && !isSameUnitDimension(newSourceUnit, newSeedlingUnit);
    const consumedRaw = updates.source_consumed_quantity ?? updates.sourceConsumedQuantity;

    // 计算更新后的种源扣减量
    let newDeducted: number | null = null;
    if (!newSourceId || newSourceMode !== 'internal') {
      newDeducted = 0;
    } else if (explicitConsumption) {
      if (consumedRaw !== undefined) {
        const consumed = Number(consumedRaw);
        if (!Number.isFinite(consumed) || consumed < 0) {
          return res.status(400).json({ success: false, error: `种源消耗量必须 ≥ 0（单位：${newSourceUnit}）` });
        }
        newDeducted = consumed;
      } else if (sourceChanged) {
        return res.status(400).json({
          success: false,
          error: `新种源单位为「${newSourceUnit}」，与育苗单位「${newSeedlingUnit}」不同，请填写种源消耗量（${newSourceUnit}）`,
        });
      } else {
        newDeducted = oldDeducted; // 未提交消耗量 → 保持不变
      }
    } else {
      // 同口径：按初始数量「变化量」调整（保留历史已扣数，不强行对齐初始数量，
      //   避免用户只是编辑其他字段就把差额补扣到种源上）
      const newQty = Number(snakeUpdates.seedling_quantity !== undefined ? snakeUpdates.seedling_quantity : old.seedling_quantity) || 0;
      const oldQty = Number(old.seedling_quantity) || 0;
      newDeducted = Math.max(0, oldDeducted + (newQty - oldQty));
    }

    // 可用量校验（同种源时把原扣减加回再比较；种源已删除时跳过）
    const availableForDeduct = newSourceRemaining + (sourceChanged ? 0 : oldDeducted);
    if (!skipSourceAdjustment && newSourceMode === 'internal' && newSourceExists && newDeducted > availableForDeduct + 0.0001) {
      return res.status(400).json({
        success: false,
        error: `种源可用数量不足：可用 ${availableForDeduct}${newSourceUnit ? ' ' + newSourceUnit : ''}，需扣减 ${newDeducted}${newSourceUnit ? ' ' + newSourceUnit : ''}`,
      });
    }

    const fields = safeKeys.map(k => `${k} = ?`).join(', ');
    const values = safeKeys.map(k => snakeUpdates[k]);
    values.push(now, id);

    db.run(`UPDATE seedlings SET ${fields}, update_time = ? WHERE id = ?`, values);

    // 应用种源库存调整：退回旧扣减 / 扣减新消耗量
    // 种源已删除且未更换种源时整体跳过（保留历史 source_deducted_quantity 原值）
    if (!skipSourceAdjustment) {
      try {
        const returnAmount = sourceChanged ? oldDeducted : Math.max(0, oldDeducted - (newDeducted ?? oldDeducted));
        const deductAmount = sourceChanged ? (newDeducted || 0) : Math.max(0, (newDeducted ?? oldDeducted) - oldDeducted);

        const operatorName = (req as any).user?.name || updates.create_by || updates.createBy || 'system';
        // 2026-10-17：编辑差额写库存流水（正=退回入库 / 负=补扣出库），
        //   让种源「时间线」「出入库记录」与余额同步，不再只有余额变动
        const writeAdjustTx = async (
          txSourceId: string,
          delta: number,
          balanceBefore: number,
          balanceAfter: number,
          unit: string,
          remark: string,
        ) => {
          if (Math.abs(delta) <= 0.0001) return;
          const ymd = now.slice(0, 10).replace(/-/g, '');
          const txId = await generateTransactionId(ymd);
          const transactionId = await generateTransactionId(ymd);
          db.run(
            `INSERT INTO inventory_transaction (
              id, transaction_id, instance_id, stock_type, transaction_type, quantity,
              balance_before, balance_after, business_id, business_type, business_code,
              operator_id, operator_name, operate_date, remarks, create_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seedling', ?, ?, ?, ?, ?, ?)`,
            [
              txId, transactionId, `seed_source:${txSourceId}`, 'seed',
              delta > 0 ? 'inbound' : 'outbound', delta, balanceBefore, balanceAfter,
              id, old.seedling_code || id,
              (req as any).user?.userId || '', operatorName, now.slice(0, 10), remark, now,
            ]
          );
        };

        if (returnAmount > 0.0001 && old.source_id && old.source_mode === 'internal') {
          db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity + ?, update_time = ? WHERE id = ?',
            [returnAmount, now, old.source_id]);
          await writeAdjustTx(
            old.source_id, returnAmount, oldSourceRemaining, oldSourceRemaining + returnAmount,
            oldSourceUnit || newSourceUnit,
            `编辑育苗消耗量 ${oldDeducted} → ${newDeducted ?? 0}${oldSourceUnit || ''}，退回 ${returnAmount}${oldSourceUnit || ''}（${old.seedling_code || id}）`,
          );
        }
        if (deductAmount > 0.0001 && newSourceId && newSourceMode === 'internal') {
          db.run('UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?',
            [deductAmount, now, newSourceId]);
          await writeAdjustTx(
            newSourceId, -deductAmount, newSourceRemaining, newSourceRemaining - deductAmount,
            newSourceUnit,
            `编辑育苗消耗量 ${oldDeducted} → ${newDeducted ?? 0}${newSourceUnit}，补扣 ${deductAmount}${newSourceUnit}（${old.seedling_code || id}）`,
          );
        }
        // source_deducted_quantity 记录当前实际扣减量（DELETE 时按它归还）
        db.run('UPDATE seedlings SET source_deducted_quantity = ? WHERE id = ?', [newDeducted ?? 0, id]);

        // 数量变更 correction 流转（带种源 ID/编码，种源时间线按 source_code 可查到）
        const createdBy = updates.create_by || updates.createBy || '';
        if (sourceChanged) {
          // 换种源：旧种源退回原扣减、新种源记录新扣减，各写一条
          if (oldDeducted > 0 && old.source_id) {
            writeCorrection({
              flow_type: 'seed_source→seedling',
              source_type: 'seed_source',
              source_id: old.source_id,
              source_code: oldSourceCode,
              target_type: 'seedling',
              target_id: id,
              target_code: old.seedling_code || id,
              source_quantity_delta: -oldDeducted,
              source_unit: oldSourceUnit || old.unit || '株',
              crop_name: old.crop_name || '',
              crop_variety: old.crop_variety || '',
              created_by: createdBy,
            });
          }
          if ((newDeducted ?? 0) > 0 && newSourceId) {
            writeCorrection({
              flow_type: 'seed_source→seedling',
              source_type: 'seed_source',
              source_id: newSourceId,
              source_code: newSourceCode,
              target_type: 'seedling',
              target_id: id,
              target_code: old.seedling_code || id,
              source_quantity_delta: newDeducted ?? 0,
              source_unit: newSourceUnit || newSeedlingUnit,
              crop_name: old.crop_name || '',
              crop_variety: old.crop_variety || '',
              created_by: createdBy,
            });
          }
        } else {
          // 同种源：一条净变化纠错流转
          const correctionDelta = (newDeducted ?? 0) - oldDeducted;
          if (Math.abs(correctionDelta) > 0.001) {
            writeCorrection({
              flow_type: 'seed_source→seedling',
              source_type: 'seed_source',
              source_id: newSourceId || old.source_id || undefined,
              source_code: newSourceCode || oldSourceCode,
              target_type: 'seedling',
              target_id: id,
              target_code: old.seedling_code || id,
              source_quantity_delta: correctionDelta,
              source_unit: newSourceUnit || old.unit || '株',
              crop_name: old.crop_name || '',
              crop_variety: old.crop_variety || '',
              created_by: createdBy,
            });
          }
        }
      } catch (e) {
        console.error('[seedling] PUT 种源剩余量修正失败:', e);
        // 不阻断主流程（育苗记录已成功更新），但写入日志便于排查
      }
    }
    saveDatabase();

    // 2026-07-22：追溯修复 - seedling 更新补 audit_log
    writeAuditLog({
      businessType: 'seedling.update',
      businessId: id,
      action: 'update',
      operatorName: (req as any).user?.name,
      opinion: `更新育苗 ${id}`,
    });
    res.json({ success: true, data: queryToObjects(db, "SELECT * FROM seedlings WHERE id = ?", [id])[0] });
  } catch (error) {
    console.error('更新育苗记录失败:', error);
    res.status(500).json({ success: false, error: '更新育苗记录失败' });
  }
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDatabase();
  const now = new Date().toISOString();
  const operator = { name: (req as any).user?.name, id: (req as any).user?.userId };

  const rows = queryToObjects<any>(db, 'SELECT * FROM seedlings WHERE id = ? AND deleted_at IS NULL', [id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ success: false, error: '育苗记录不存在或已删除' });

  let archiveId: string | null = null;
  db.exec('BEGIN');
  try {
    // 2026-10-17：删除前归档到回收站
    archiveId = archiveBeforeDelete('seedling', id, { operator, sourcePage: '/crop/seedling' });
    db.run('UPDATE seedlings SET deleted_at = ? WHERE id = ?', [now, id]);

    // 2026-07-18 P0-C4：软删育苗后置空防治记录关联（恢复时由回收站处理器写回）
    try {
      db.run(
        `UPDATE pesticide_records SET seedling_id = NULL, seedling_code = NULL WHERE seedling_id = ?`,
        [id],
      );
    } catch (e) {
      console.error('[seedling DELETE] 清理关联防治记录 ERROR:', e);
    }

    // 2026-10-17：退回种源扣减（余额 + 库存流水 + 纠错流转，单条/批量共用）
    await refundSeedlingSourceOnDelete(db, row, now, operator);

    db.exec('COMMIT');
  } catch (innerErr) {
    try { db.exec('ROLLBACK'); } catch { /* 保持原错误 */ }
    markArchiveFailed(archiveId, innerErr);
    throw innerErr;
  }

  saveDatabase();
  writeAuditLog({
    businessType: 'seedling.delete',
    businessId: id,
    action: 'delete',
    operatorName: (req as any).user?.name,
    opinion: `软删育苗 ${id}（已移入回收站）`,
  });
  res.json({ success: true, data: { id, deleted: true, recycleId: archiveId } });
}));

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

// 2026-07-21：每日记录 4 端点提取到 seedlingDailyRecords.route.ts
router.use("/:id/daily-records", seedlingDailyRecordsRouter);
// 2026-07-21：定植/标签子路由挂载（原 502 行提取到 seedlingTransplant.route.ts）
router.use("/:id", seedlingTransplantRouter);
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { queryEntityHistory } = require('../services/entityHistory.service');
  const items = queryEntityHistory('seedling', id, 200);
  res.json({ success: true, data: items });
}));

export default router;
