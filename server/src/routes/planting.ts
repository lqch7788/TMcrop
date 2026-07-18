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
import { executeCirculation, deriveSeedFormSubType, SEED_FORM_OPTIONS } from '../services/circulation.service';
import { formatLocalDateISO, formatLocalDateYYYYMMDD } from '../utils/dateUtil';
import { generateInstanceId } from '../services/inventory.service';
import {
  validateDailyChange,
  normalizeChangeData,
  applyDailyChangeToPlanting,
} from '../services/plantingDailyChange';
import { checkHarvestRecordDeletable, checkInventoryStockDeletable } from '../services/inventoryDeleteGuard.service';
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
// 2026-06-28：支持 camelCase 别名匹配 — 前端走 enhancedApiClient 习惯发 camelCase，
//            白名单是 snake_case，需要把 camelCase 转 snake_case 再匹配
function toSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}
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
    // 优先匹配原 key（snake_case），fallback camelCase 转 snake_case
    const matchedKey = allowed.has(k) ? k : (allowed.has(toSnake(k)) ? toSnake(k) : null);
    if (!matchedKey) {
      rejected.push(k);
      continue;
    }
    cols.push(`${matchedKey} = ?`);
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
      -- 2026-06-25: 关联种源的 source_type（badge 显示用，外部来源/历史 seedling 取不到为 NULL）
      ss.source_type AS sourceSeedSourceType,
      p.crop_code AS cropCode,
      p.crop_name AS cropName,
      p.crop_variety AS cropVariety,
      -- 2026-06-20: 兜底品种路径 — 当 crop_code 在前端 varietyCache 查不到时回填
      cv.category_name AS categoryName,
      cv.type_name AS typeName,
      cv.variety_name AS varietyName,
      cv.sub_variety1_name AS subVariety1Name,
      p.root_name AS rootName,
      -- 2026-06-24: 修复 list 列表显示 0 问题
      -- 2026-06-30 Bug 修复：列表"种植数量"列直接用 p.planting_quantity
      -- 原因：调入时 handler 已累加到主表（plantingMoveHandler.ts:196），area_stocks 是追溯数据不参与显示
      -- 修复前：列表用 area_stocks SUM → 调入后只显示"本次调入数量"，用户感觉"覆盖"
      -- 修复后：列表直接用主表累加值 → 调入前后都显示累计总量，与用户预期一致
      COALESCE(
        (SELECT s.area_id FROM planting_area_stocks s WHERE s.planting_id = p.id ORDER BY s.quantity DESC LIMIT 1),
        p.area_id
      ) AS areaId,
      COALESCE(
        (SELECT s.area_name FROM planting_area_stocks s WHERE s.planting_id = p.id ORDER BY s.quantity DESC LIMIT 1),
        p.area_name
      ) AS areaName,
      p.planting_quantity AS plantingCount,
      p.planting_date AS plantingDate,
      p.soil_ph AS soilPH,
      p.soil_ec AS soilEC,
      p.transplant_count AS transplantCount,
      p.transplant_date AS transplantDate,
      -- 2026-06-28: 每日记录累加字段（损耗/补栽/剩余 = planting_quantity + supplement_count - loss_count）
      p.loss_count AS lossCount,
      p.supplement_count AS supplementCount,
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
      -- 2026-06-24: 育种实验 + 种植留种字段（种源管理吸收功能）
      p.is_breeding AS isBreeding,
      p.parent_male_code AS parentMaleCode,
      p.parent_female_code AS parentFemaleCode,
      p.generation AS generation,
      p.breeding_method AS breedingMethod,
      p.breeding_location AS breedingLocation,
      p.target_traits AS targetTraits,
      p.is_seed_saving AS isSeedSaving,
      p.seed_plant_marker AS seedPlantMarker,
      -- 2026-06-17: 4 列聚合（LEFT JOIN + SUM(CASE WHEN destination=...) GROUP BY p.id）
      COALESCE(SUM(CASE WHEN phr.destination = 'harvest' THEN phr.quantity END), 0) AS harvestToInventoryQty,
      -- 2026-06-29: 合并残株回种源(circulate)+自交种子入种源(self_seed)+种植自留种(planting_self_kept) 为一个 selfKeptToSourceQty
      -- 老数据和老端点的历史值都被合并展示在「种植自留种」列
      COALESCE(SUM(CASE WHEN phr.destination IN ('circulate', 'self_seed', 'planting_self_kept') THEN phr.quantity END), 0) AS selfKeptToSourceQty,
      -- 保留旧字段名供后端老代码兼容（前端不再使用）
      COALESCE(SUM(CASE WHEN phr.destination = 'circulate' THEN phr.quantity END), 0) AS residualToSourceQty,
      COALESCE(SUM(CASE WHEN phr.destination = 'self_seed' THEN phr.quantity END), 0) AS selfSeedToSourceQty,
      -- 2026-07-09: dispose 聚合移除（dispose 功能已下线，与每日记录"损耗"语义重叠）
      -- 历史数据保留在 planting_harvest_records 表，列表不再聚合展示 disposeQty
      -- 2026-06-19: 最近一次"采收入库"记录的单位（用户实际入库时选择的单位）
      -- 解决"列表显示单位与入库单位不一致"的 bug（如入库 kg 但显示 株）
      (SELECT unit FROM planting_harvest_records
        WHERE planting_id = p.id AND destination = 'harvest'
        ORDER BY record_date DESC, create_time DESC LIMIT 1) AS harvestToInventoryUnit,
      -- 2026-06-29: 合并 3 个 destination 的最近单位（保留老字段名 residualToSourceUnit/selfSeedToSourceUnit 兼容）
      (SELECT unit FROM planting_harvest_records
        WHERE planting_id = p.id AND destination IN ('circulate', 'self_seed', 'planting_self_kept')
        ORDER BY record_date DESC, create_time DESC LIMIT 1) AS selfKeptToSourceUnit,
      -- 2026-06-29: 形态分布明细（GROUP BY seed_form）— 返回 JSON 字符串，前端解析成 chip 列表
      -- 格式：[{seedForm, quantity, unit}, ...]，前端展示：「枝条 200根 · 种子 100粒」
      (
        SELECT '[' || GROUP_CONCAT('{"seedForm":"' || COALESCE(source_form, '未知') || '","quantity":' || quantity || ',"unit":"' || COALESCE(unit, '') || '"}', ',') || ']'
        FROM (
          SELECT source_form, unit, SUM(quantity) AS quantity
          FROM planting_harvest_records
          WHERE planting_id = p.id
            AND destination IN ('circulate', 'self_seed', 'planting_self_kept')
            AND source_form IS NOT NULL
          GROUP BY source_form, unit
        )
      ) AS selfKeptByForm,
      (SELECT unit FROM planting_harvest_records
        WHERE planting_id = p.id AND destination = 'circulate'
        ORDER BY record_date DESC, create_time DESC LIMIT 1) AS residualToSourceUnit,
      (SELECT unit FROM planting_harvest_records
        WHERE planting_id = p.id AND destination = 'self_seed'
        ORDER BY record_date DESC, create_time DESC LIMIT 1) AS selfSeedToSourceUnit
      -- 2026-07-09: disposeUnit 子查询移除（dispose 功能已下线）
      -- 2026-06-29: 4 个去向减为 3 个（合并 circulate + self_seed 为 planting_self_kept）— 旧值保留作历史数据
    FROM plantings p
    LEFT JOIN planting_harvest_records phr ON phr.planting_id = p.id
    LEFT JOIN crop_varieties cv ON cv.crop_code = p.crop_code
    -- 2026-06-25: 取关联种源的 source_type（内部来源时取到种源真实类型，外部来源/历史 seedling 取不到）
    LEFT JOIN seed_sources ss ON ss.id = p.source_id
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
 * 2026-06-30: 种植调入弹窗"目标区域"下拉用
 * GET /api/plantings/:id/area-stocks
 * 注意：必须放在 GET /:id 之前，否则 :id 会吞掉 "area-stocks" 路径段
 */
router.get('/:id/area-stocks', (req: Request, res: Response) => {
  try {
    const plantingId = String(req.params.id)
    const rows = queryToObjects<any>(
      getDatabase(),
      `SELECT id, area_id AS areaId, area_name AS areaName, quantity,
              source_type AS sourceType, source_id AS sourceId, source_code AS sourceCode
       FROM planting_area_stocks
       WHERE planting_id = ?
       ORDER BY quantity DESC`,
      [plantingId]
    )
    res.json({ success: true, data: rows })
  } catch (e: any) {
    console.error('获取种植区域库存失败:', e)
    res.status(500).json({ success: false, error: e?.message || '查询失败' })
  }
})

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
/**
 * 2026-06-30: 调出模式用 — 按 cropName 查找同作物候选目标订单（排除自己）
 * GET /api/plantings/lookup
 * 必须在 /:id 路由之前注册（否则被 :id 吞掉）
 */
router.get('/lookup', (req: Request, res: Response) => {
  try {
    const cropName = String(req.query.cropName || '').trim()
    const excludeId = String(req.query.excludeId || '').trim()
    const limit = Math.min(Number(req.query.limit) || 50, 200)

    const conditions: string[] = [
      "deleted_at IS NULL",
      "status NOT IN ('ended', 'harvested', 'cancelled')",
    ]
    const params: any[] = []

    if (cropName) {
      conditions.push('crop_name LIKE ?')
      params.push(`%${cropName}%`)
    }
    if (excludeId) {
      conditions.push('id != ?')
      params.push(excludeId)
    }

    const sql = `
      SELECT id,
             planting_code AS plantCode,
             crop_name AS cropName,
             crop_variety AS cropVariety,
             crop_code AS cropCode,
             area_name AS areaName
      FROM plantings
      WHERE ${conditions.join(' AND ')}
      ORDER BY create_time DESC
      LIMIT ?
    `
    const rows = queryToObjects<any>(getDatabase(), sql, [...params, limit])
    res.json({ success: true, data: rows })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || '查询失败' })
  }
})

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
    // 2026-06-29: 加 seedForm 字段（种植自留种采收形态）
    const { recordDate, destination, subType, seedForm, warehouseId, warehouseName, quantity, unit, notes } = req.body || {};
    const db = getDatabase();
    const now = formatLocalDateISO();

    // 校验 planting 未锁定
    const pStmt = db.prepare('SELECT is_harvest_locked, source_id FROM plantings WHERE id = ?');
    pStmt.bind([id]);
    const planting = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!planting) return res.status(404).json({ success: false, error: '种植记录不存在' });
    // 2026-07-09 v5 阶段一：删 is_harvest_locked 拦截 — 已结束行允许编辑采收记录（保持补录模式可改）

    // 校验记录存在
    const oldStmt = db.prepare('SELECT * FROM planting_harvest_records WHERE id = ? AND planting_id = ?');
    oldStmt.bind([recordId, id]);
    const old = oldStmt.step() ? oldStmt.getAsObject() : null;
    oldStmt.free();
    if (!old) return res.status(404).json({ success: false, error: '采收记录不存在' });

    // 字段校验
    if (!destination) return res.status(400).json({ success: false, error: '缺少 destination' });
    // 2026-06-29: 4 个去向减为 3 个（合并 circulate + self_seed 为 planting_self_kept）
    // circulate / self_seed 保留作为历史数据值，不允许新建
    // 2026-07-09: dispose 已下线（与每日记录"损耗"语义重叠），从白名单移除
    const PUT_ALLOWED_DESTINATIONS = ['harvest', 'planting_self_kept'];
    if (!PUT_ALLOWED_DESTINATIONS.includes(destination)) {
      return res.status(400).json({ success: false, error: `destination 必须是 2 个之一: ${PUT_ALLOWED_DESTINATIONS.join(' / ')}` });
    }
    // 2026-06-29: planting_self_kept 必须传 seedForm（采收形态）
    if (destination === 'planting_self_kept') {
      if (!seedForm) {
        return res.status(400).json({
          success: false,
          error: '种植自留种必须填写采收形态（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他）'
        });
      }
      if (!SEED_FORM_OPTIONS.includes(seedForm)) {
        return res.status(400).json({
          success: false,
          error: `采收形态必须是 12 个之一: ${SEED_FORM_OPTIONS.join(' / ')}`
        });
      }
    }
    if (destination === 'harvest' && !warehouseId) {
      return res.status(400).json({ success: false, error: '必须选择仓库' });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: '数量必须大于 0' });
    }
    // 2026-07-09: dispose 上限校验移除（dispose 功能已下线）
    // 2026-07-01 修复：放宽 unit 校验，与 POST 路由一致（朵等单位可入库）
    if (unit && typeof unit !== 'string') {
      return res.status(400).json({ success: false, error: '单位类型错误' });
    }

    // === 反向补偿：删除旧的下游副作用（2026-07-03 v3：兼容老数据兜底查找） ===
    let effHarvestId: string | null = (old.harvest_record_id as string | null) || null;
    let effStockId: string | null = (old.inventory_stock_id as string | null) || null;
    if (!effHarvestId) {
      const fs = db.prepare(`
        SELECT hr.id AS hid, ist.id AS sid
        FROM harvest_records hr
        LEFT JOIN inventory_stock ist ON ist.business_id = hr.id AND ist.business_type = 'harvest'
        WHERE hr.source_module = 'planting' AND hr.source_id = ? AND hr.deleted_at IS NULL
        ORDER BY hr.create_time DESC LIMIT 1
      `);
      fs.bind([id]);
      const frow = fs.step() ? fs.getAsObject() as any : null;
      fs.free();
      if (frow) { effHarvestId = (frow.hid as string) || null; effStockId = effStockId || (frow.sid as string) || null; }
    }
    if (effHarvestId) {
      const check = checkHarvestRecordDeletable(effHarvestId);
      if (!check.ok) {
        return res.status(400).json({ success: false, error: check.error, blockingRecords: check.blockingRecords || [] });
      }
      db.run(`DELETE FROM inventory_transaction WHERE business_id = ? AND business_type = 'harvest'`, [effHarvestId]);
      db.run(`DELETE FROM inventory_stock WHERE business_id = ? AND business_type = 'harvest'`, [effHarvestId]);
      db.run(`DELETE FROM inventory_inbound_records WHERE business_id = ?`, [effHarvestId]);
      db.run('DELETE FROM harvest_records WHERE id = ?', [effHarvestId]);
    } else if (effStockId) {
      const check = checkInventoryStockDeletable(effStockId);
      if (!check.ok) {
        return res.status(400).json({ success: false, error: check.error, blockingTransactions: check.blockingTransactions || [] });
      }
      const st = db.prepare('SELECT instance_id FROM inventory_stock WHERE id = ?');
      st.bind([effStockId]);
      if (st.step()) {
        const stk = st.getAsObject() as any;
        db.run(`DELETE FROM inventory_transaction WHERE instance_id = ?`, [stk.instance_id]);
        db.run('DELETE FROM inventory_stock WHERE id = ?', [effStockId]);
      }
      st.free();
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
    } else if (destination === 'planting_self_kept') {
      // 2026-06-29: 合并 plant_self_kept 替代旧 circulate / self_seed
      if (!planting.source_id) {
        return res.status(400).json({ success: false, error: '该种植记录无种源，无法回流' });
      }
      // 派生 subType 由 seedForm 自动推导（前端不再传 subType/quantity_refill）
      const finalSubType = deriveSeedFormSubType(seedForm || '');
      const circType = 'PROPAGATION';

      const result = executeCirculation({
        circulationType: circType,
        sourceModule: 'planting',
        sourceId: id,
        parentSourceId: planting.source_id,
        subType: finalSubType,
        destination: 'seed_source',
        quantity, unit, notes,
        seedForm: seedForm || undefined,  // 2026-06-29: 新增，写到 seed_sources.seed_form
      });
      if (result?.circulationId) generatedCircId = result.circulationId;
      if (result?.newSourceId) generatedHarvestId = result.newSourceId;
    }

    // UPDATE planting_harvest_records
    // 2026-07-01 修复：planting_self_kept 自动写"内部种源库"（与 POST 路由一致）
    const putFinalWarehouseId = (() => {
      if (destination === 'planting_self_kept' && !warehouseId) return 'SEED_SOURCE_VIRTUAL'
      return warehouseId || null
    })()
    const putFinalWarehouseName = (() => {
      if (destination === 'planting_self_kept') return warehouseName || '内部种源库'
      return warehouseName || null
    })()
    db.run(
      `UPDATE planting_harvest_records SET
        record_date = ?, destination = ?, sub_type = ?, warehouse_id = ?, warehouse_name = ?,
        quantity = ?, unit = ?, notes = ?, update_time = ?,
        harvest_record_id = ?, inventory_stock_id = ?, circulation_record_id = ?
       WHERE id = ? AND planting_id = ?`,
      [
        recordDate || now.split('T')[0], destination, subType || null, putFinalWarehouseId, putFinalWarehouseName,
        quantity, unit || 'g', notes || null, now,
        generatedHarvestId, generatedStockId, generatedCircId,
        recordId, id,
      ]
    );

    saveDatabase();

    // 写入 material_flow_log（P0 修复 — 编辑采收记录时补链）
    if (destination === 'harvest' && generatedHarvestId && generatedStockId) {
      try {
        // 2026-07-14：dateStr / harvestUnit 在上面 if (destination === 'harvest') 块内声明，
        // 在此独立 if 块中不可见；按相同逻辑重新声明以满足 TS 块作用域
        const dateStr = recordDate || now.split('T')[0];
        const harvestUnit = unit || old.unit || 'g';
        const plantCode = String(old.planting_code || id);
        const harvestCode = `HV${dateStr}-${String(Date.now()).slice(-4)}`;
        const instanceId = `IPR${dateStr}-${String(Date.now()).slice(-4)}`;
        writeFlowLog({
          flow_type: 'planting→harvest',
          crop_name: String(old.crop_name || ''),
          crop_variety: String(old.crop_variety || ''),
          source_type: 'planting', source_id: id, source_code: plantCode,
          source_quantity: Number(quantity), source_unit: String(unit || harvestUnit),
          source_category: 'planting',
          target_type: 'harvest', target_id: generatedHarvestId, target_code: harvestCode,
          target_quantity: Number(quantity), target_unit: String(unit || harvestUnit),
          business_code: harvestCode, created_by: String(old.create_by || 'system'),
        });
        writeFlowLog({
          flow_type: 'harvest→inventory',
          crop_name: String(old.crop_name || ''),
          crop_variety: String(old.crop_variety || ''),
          source_type: 'harvest', source_id: generatedHarvestId, source_code: harvestCode,
          source_quantity: Number(quantity), source_unit: String(unit || harvestUnit),
          source_category: 'self_produced',
          target_type: 'inventory_stock', target_id: generatedStockId, target_code: instanceId,
          target_quantity: Number(quantity), target_unit: String(unit || harvestUnit),
          business_code: harvestCode, created_by: String(old.create_by || 'system'),
        });
      } catch (e) { console.error('[planting] writeFlowLog 失败:', (e as any)?.message || e); }
    }

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

    // 校验 planting 存在
    // 2026-07-09 v5 阶段一：删 is_harvest_locked 拦截 — 已结束行允许删除采收记录
    const pStmt = db.prepare('SELECT id FROM plantings WHERE id = ?');
    pStmt.bind([id]);
    const p = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!p) return res.status(404).json({ success: false, error: '种植记录不存在' });

    // 读旧记录以反向补偿
    const oldStmt = db.prepare('SELECT harvest_record_id, inventory_stock_id, circulation_record_id FROM planting_harvest_records WHERE id = ? AND planting_id = ?');
    oldStmt.bind([recordId, id]);
    const old = oldStmt.step() ? oldStmt.getAsObject() : null;
    oldStmt.free();
    if (!old) return res.status(404).json({ success: false, error: '采收记录不存在' });

    // 反向补偿：删除下游副作用（2026-07-03：补齐 transaction 级联清理）
    // 2026-07-03 v3：兼容老数据（harvest_record_id 为 null 时，通过 planting_id 反向查找）
    let effectiveHarvestId: string | null = (old.harvest_record_id as string | null) || null;
    let effectiveStockId: string | null = (old.inventory_stock_id as string | null) || null;

    // 如果 harvest_record_id 为 null（老数据未关联），通过 planting_id 反向查找
    if (!effectiveHarvestId) {
      const findStmt = db.prepare(`
        SELECT hr.id AS hid, ist.id AS sid
        FROM harvest_records hr
        LEFT JOIN inventory_stock ist ON ist.business_id = hr.id AND ist.business_type = 'harvest'
        WHERE hr.source_module = 'planting' AND hr.source_id = ?
        AND hr.deleted_at IS NULL
        ORDER BY hr.create_time DESC LIMIT 1
      `);
      findStmt.bind([id]);
      const found = findStmt.step() ? findStmt.getAsObject() as any : null;
      findStmt.free();
      if (found) {
        effectiveHarvestId = (found.hid as string) || null;
        effectiveStockId = effectiveStockId || (found.sid as string) || null;
      }
    }

    if (effectiveHarvestId) {
      const checkHarvest = checkHarvestRecordDeletable(effectiveHarvestId);
      if (!checkHarvest.ok) {
        return res.status(400).json({
          success: false,
          error: checkHarvest.error,
          blockingRecords: checkHarvest.blockingRecords || [],
        });
      }
      // 级联清理 4 张表
      db.run(`DELETE FROM inventory_transaction WHERE business_id = ? AND business_type = 'harvest'`, [effectiveHarvestId]);
      db.run(`DELETE FROM inventory_stock WHERE business_id = ? AND business_type = 'harvest'`, [effectiveHarvestId]);
      db.run(`DELETE FROM inventory_inbound_records WHERE business_id = ?`, [effectiveHarvestId]);
      db.run('DELETE FROM harvest_records WHERE id = ?', [effectiveHarvestId]);
    } else if (effectiveStockId) {
      const checkStock = checkInventoryStockDeletable(effectiveStockId);
      if (!checkStock.ok) {
        return res.status(400).json({
          success: false,
          error: checkStock.error,
          blockingTransactions: checkStock.blockingTransactions || [],
        });
      }
      const stkt = db.prepare('SELECT instance_id FROM inventory_stock WHERE id = ?');
      stkt.bind([effectiveStockId]);
      if (stkt.step()) {
        const stk = stkt.getAsObject() as any;
        db.run(`DELETE FROM inventory_transaction WHERE instance_id = ?`, [stk.instance_id]);
        db.run('DELETE FROM inventory_stock WHERE id = ?', [effectiveStockId]);
      }
      stkt.free();
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
      // 2026-06-29: 合并 planting_self_kept → selfKeptToSourceUnit（保留 circulate/self_seed 兼容）
      if (dest === 'harvest') item.harvestToInventoryUnit = row.unit || '';
      else if (dest === 'circulate') item.residualToSourceUnit = row.unit || '';
      else if (dest === 'self_seed') item.selfSeedToSourceUnit = row.unit || '';
      else if (dest === 'planting_self_kept') item.selfKeptToSourceUnit = row.unit || '';
      // 2026-07-09: disposeUnit 提取移除（dispose 功能已下线）
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

    // 2026-06-24: 育种实验字段（种源管理「育种计划产出」吸收到种植管理）
    const finalIsBreeding = body.is_breeding === true || body.isBreeding === true ? 1 : 0;
    const finalParentMaleCode = body.parent_male_code || body.parentMaleCode || null;
    const finalParentFemaleCode = body.parent_female_code || body.parentFemaleCode || null;
    const finalGeneration = body.generation || null;
    const finalBreedingMethod = body.breeding_method || body.breedingMethod || null;
    const finalBreedingLocation = body.breeding_location || body.breedingLocation || null;
    const finalTargetTraits = body.target_traits || body.targetTraits || null;
    // 2026-06-24: 种植留种字段（种源管理「种植留种」吸收到种植管理）
    const finalIsSeedSaving = body.is_seed_saving === true || body.isSeedSaving === true ? 1 : 0;
    const finalSeedPlantMarker = body.seed_plant_marker || body.seedPlantMarker || null;

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
        // 2026-06-28：业务规则变更 — 种植管理不再从育苗管理页面获取种苗（统一从内部种源）。
        // 此分支保留兼容，但写入 auto_planted_count 的逻辑已停用，避免脏数据。
        if (finalSourceId) {
          const chk = db.exec(
            "SELECT 1 FROM seedlings WHERE id = ? AND deleted_at IS NULL",
            [finalSourceId]
          );
          if (!chk[0]?.values?.[0]) {
            try { db.exec('ROLLBACK'); } catch {}
            return res.status(404).json({ success: false, error: '育苗记录不存在' });
          }
          // 不再做可用量校验和累加（业务上已停用）
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
          harvest_quantity, print_count, traceability_code, pictures, production_plan_id, production_plan_code,
          is_breeding, parent_male_code, parent_female_code, generation, breeding_method, breeding_location, target_traits,
          is_seed_saving, seed_plant_marker,
          loss_count, supplement_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId, finalPlantCode, finalSourceType, finalSourceId, finalSourceName,
        finalCropName, finalCropVariety, finalCropCode,
        finalAreaId, finalAreaName, finalRootName, finalGreenhouseName, finalPlantingDate,
        finalPlantingQuantity, finalPlantedQuantity,
        finalSurvivalQuantity, finalSurvivalRate, finalGrowthStatus, finalExpectedHarvestDate,
        finalStatus, finalRemarks, finalCreateBy, now, now,
        finalSoilPh, finalSoilEc, finalAttritionRate, finalTargetYield, finalTargetYieldUnit, finalTransplantCount, finalTransplantDate,
        finalIsHarvest, finalHarvestDate, finalHarvestQuantity, finalPrintCount, finalTraceabilityCode,
        finalPictures, finalProductionPlanId, finalProductionPlanCode,
        finalIsBreeding, finalParentMaleCode, finalParentFemaleCode, finalGeneration, finalBreedingMethod, finalBreedingLocation, finalTargetTraits,
        finalIsSeedSaving, finalSeedPlantMarker,
        // 2026-06-28: 新建时 loss_count/supplement_count 默认 0（每日记录累加写入）
        0, 0,
      ]);

      // 2026-06-24: 同步建 crop_instance 行，让行级采收入库 findSourceInstanceId() 能溯源
      // business_id=planting.id, business_type='planting'，source_instance_id=来源种源/育苗
      // 在同一 BEGIN/COMMIT 块内，planting 失败时自动回滚 crop_instance
      const plantingCiId = `CI${Date.now()}-pl`;
      db.run(
        `INSERT INTO crop_instances (
          id, instance_code, crop_name, crop_variety, business_id, business_type,
          source_instance_id, initial_quantity, current_quantity,
          planted_quantity, harvested_quantity, status, planting_date,
          create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plantingCiId,
          finalPlantCode,
          finalCropName,
          finalCropVariety,
          newId,
          'planting',
          finalSourceId || null,
          finalPlantingQuantity,
          finalPlantingQuantity,
          finalPlantedQuantity || 0,
          0,
          finalStatus || 'growing',
          finalPlantingDate,
          finalCreateBy,
          now,
          now,
        ]
      );

      // 写入 material_flow_log 流转流水
      // 查询种源来源类别（从 seed_sources.propagation_type 映射）
      let flowSourceCategory: string | null = null;
      if (finalSourceId && (finalSourceType === 'seed_source' || finalSourceType === 'seed')) {
        try {
          const { mapPropagationToCategory } = require('../lib/sourceCategoryMapper');
          const srcInfo = db.exec('SELECT propagation_type FROM seed_sources WHERE id = ?', [finalSourceId]);
          const propType = srcInfo[0]?.values?.[0]?.[0] as string | undefined;
          flowSourceCategory = propType ? mapPropagationToCategory(propType) : null;
        } catch { /* 查不到就算了 */ }
      }
      writeFlowLog({
        flow_type: flowType,
        crop_name: finalCropName,
        crop_variety: finalCropVariety,
        source_type: finalSourceType || null,
        source_id: finalSourceId || null,
        source_code: finalSourceName || null,
        source_quantity: finalPlantingQuantity,
        source_unit: '株',
        source_category: flowSourceCategory,
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
      const _newItems = queryToObjects<any>(db, 'SELECT * FROM plantings WHERE id = ?', [newId]);
      res.status(201).json({ success: true, data: _newItems[0] || { id: newId } });
    } catch (txErr) {
      try { db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }
  } catch (error) {
    console.error('创建种植记录失败:', error);
    res.status(500).json({ success: false, error: `创建种植记录失败: ${error instanceof Error ? error.message : String(error)}` });
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
          }
          // 2026-06-28：移除 oldSourceType === 'seedling' 的 auto_planted_count -= delta（业务已停用）
        }
      } catch {}
    }

    saveDatabase();
    const _updItems = queryToObjects<any>(db, "SELECT * FROM plantings WHERE id = ?", [id]);
    res.json({ success: true, data: _updItems[0] || { id } });
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
    // 2026-06-26: cascade 标记回流记录为撤销，避免软删种植后产生孤儿引用阻断种源删除
    const circPlaceholders = idArray.map(() => '?').join(',');
    db.run(
      `UPDATE crop_circulation_records
       SET is_revoked = 1, revoked_at = ?, revoked_by = ?, notes = COALESCE(notes, '') || ?
       WHERE source_module = 'planting' AND source_id IN (${circPlaceholders}) AND is_revoked = 0`,
      [now, 'planting_soft_delete', ' [cascade: 种植已软删]', ...idArray]
    );
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

    // 2026-06-26: cascade 标记回流记录为撤销，避免软删种植后产生孤儿引用阻断种源删除
    // sql.js 是内存数据库，必须 saveDatabase() 才能持久化到磁盘（saveDatabase 在下方调用）
    try {
      db.run(
        `UPDATE crop_circulation_records
         SET is_revoked = 1, revoked_at = ?, revoked_by = ?, notes = COALESCE(notes, '') || ?
         WHERE source_module = 'planting' AND source_id = ? AND is_revoked = 0`,
        [now, 'planting_soft_delete', ' [cascade: 种植已软删]', id]
      );
    } catch (e) {
      console.error('[DELETE /:id] cascade ERROR:', e);
    }

    // 2026-07-18 P0-C4 修复：软删种植后，置空关联的防治记录的 planting_id/planting_code
    // - 保留防治历史，但断关联（避免跳转 404 / 孤儿数据）
    try {
      db.run(
        `UPDATE pesticide_records
         SET planting_id = NULL, planting_code = NULL
         WHERE planting_id = ?`,
        [id]
      );
    } catch (e) {
      console.error('[planting DELETE] 清理关联防治记录 ERROR:', e);
    }

    // 2026-06-14: 反向累加到上游
    if (row) {
      try {
        const qty = Number(row.planting_quantity) || 0;
        const stype = String(row.source_type || '').toLowerCase();
        const sid = row.source_id;
        if (qty > 0 && sid) {
          if (stype === 'seedling') {
            // 2026-06-28：移除 seedlings.auto_planted_count 回滚（业务已停用）
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
// 2026-06-25: 接收前端算好的 attrition_rate（产出后实际损耗率），写回 plantings.attrition_rate
router.post('/:id/harvest', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { harvest_quantity, harvest_date, attrition_rate } = req.body;
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

    // 更新采收状态、采收数量、损耗率（2026-06-25 新增损耗率写回）
    db.run(
      `UPDATE plantings SET is_harvest = 1, harvest_date = ?, harvest_quantity = ?, attrition_rate = ?, status = 'harvested', update_time = ? WHERE id = ?`,
      [harvest_date || now, harvest_quantity || 0, attrition_rate ?? 0, now, id]
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

// ========== 种植管理每日记录 API（2026-06-28） ==========
// 与育苗管理一致：写到 daily_records 通用表，record_type='planting'
// 4 个路由：GET 列表 / POST 新增 / PUT 编辑 / DELETE 删除
// 数量统计：损耗/补栽 delta 自动累加到 plantings 主表
// 业务校验：损耗 ≤ 当前活体剩余（planting_quantity + supplement_count - loss_count）

/**
 * 获取某种植批次的每日记录列表
 * GET /api/plantings/:id/daily-records
 */
router.get('/:id/daily-records', (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    const countSql = 'SELECT COUNT(*) FROM daily_records WHERE related_id = ? AND related_type = ?';
    const countParams = [id, 'planting'];
    const total = execCount(db, countSql, countParams);

    let sql = 'SELECT * FROM daily_records WHERE related_id = ? AND related_type = ? ORDER BY record_date DESC, create_time DESC';
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const items = queryToObjects(db, sql, [id, 'planting']);
    // 展开 data JSON 字段（与育苗一致）
    const expandedItems = items.map((it: any) => {
      if (it.data) {
        try {
          const parsed = JSON.parse(it.data);
          return { ...parsed, ...it };
        } catch {
          /* ignore parse error */
        }
      }
      return it;
    });

    res.json({
      success: true,
      data: expandedItems,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('获取种植每日记录失败:', error);
    res.status(500).json({ success: false, error: '获取种植每日记录失败' });
  }
});

/**
 * 添加种植管理每日记录
 * POST /api/plantings/:id/daily-records
 */
router.post('/:id/daily-records', (req: Request, res: Response) => {
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
    // 已结束的种植不能新增每日记录
    if (planting.end_time) {
      return res.status(400).json({ success: false, error: '种植已结束，无法新增每日记录' });
    }

    // 业务上限预校验（先校验后写入）
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const normalized = normalizeChangeData(parsed);
        const validateErr = validateDailyChange(id, normalized);
        if (validateErr) {
          return res.status(400).json({ success: false, error: validateErr });
        }
      } catch (e) {
        /* JSON 解析失败时跳过 */
      }
    }

    // 生成 ID（与育苗保持一致格式：DR + 时间戳）
    const newId = `DR${Date.now()}`;
    const newOid = `DR${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    // 2026-07-15：用完整时间戳（含时分秒毫秒），保证同日多次添加的记录 create_time 唯一
    // → 列表 ORDER BY record_date DESC, create_time DESC 时新记录正确排在最前
    const now = new Date().toISOString();

    // 写入 daily_records 通用表
    db.run(
      `INSERT INTO daily_records (
        id, oid, record_type, record_date, related_id, related_code, related_type,
        crop_name, crop_variety, greenhouse_name, quantity, unit, data, remarks,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        newOid,
        'planting',
        recordDate || now,
        id,
        planting.planting_code,
        'planting',
        planting.crop_name || '',
        planting.crop_variety || '',
        planting.greenhouse_name || '',
        0,
        planting.unit || '株',
        data ? JSON.stringify(data) : null,
        remarks || '',
        createBy || '',
        now,
        now,
      ]
    );

    // 应用 delta 到 plantings 主表（+1 = 新增正向）
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        const normalized = normalizeChangeData(parsed);
        applyDailyChangeToPlanting(id, normalized, 1);
      } catch (e) {
        /* JSON 解析失败不影响 daily_records 插入 */
      }
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
          const jwtUser2 = (req as any).user;
          const operatorId2 = (req as any).body?.operatorId || jwtUser2?.aid || jwtUser2?.userId || '';
          // 2026-07-15：兼容多种字段名（operatorName / createBy / create_by）+ JWT
          const operatorName2 = (req as any).body?.operatorName
            || (req as any).body?.createBy
            || (req as any).body?.create_by
            || jwtUser2?.name
            || '';
          const primaryFertMethod = fertItems.find((it: any) => it.applicationMethod)?.applicationMethod || '';
          const primaryPestMethod = pestItems.find((it: any) => it.applicationMethod)?.applicationMethod || '';
          const primaryTargetPest = pestItems.find((it: any) => it.targetPest)?.targetPest || '';
          // 同步调用（fire-and-forget，内部已 catch）
          if (fertItems.length > 0) {
            syncFertilizerRecords(db, newId, fertItems, {
              relatedId: id, relatedCode: (planting as any).planting_code || '', relatedType: 'planting',
              recordDate: recordDate || formatLocalDateISO(),
              cropName: (planting as any).crop_name || '',
              cropVariety: (planting as any).crop_variety || '',
              // 2026-07-15：area_name 优先（用户实际用的"区域"），greenhouse_name 回退
              greenhouseName: (planting as any).area_name || (planting as any).greenhouse_name || '',
              areaId: (planting as any).area_id || '',
              areaName: (planting as any).area_name || (planting as any).greenhouse_name || '',
              operatorId: operatorId2, operatorName: operatorName2,
              primaryMethod: primaryFertMethod,
            });
          }
          if (pestItems.length > 0) {
            syncPesticideRecords(db, newId, pestItems, {
              relatedId: id, relatedCode: (planting as any).planting_code || '', relatedType: 'planting',
              recordDate: recordDate || formatLocalDateISO(),
              cropName: (planting as any).crop_name || '',
              cropVariety: (planting as any).crop_variety || '',
              greenhouseName: (planting as any).area_name || (planting as any).greenhouse_name || '',
              areaId: (planting as any).area_id || '',
              areaName: (planting as any).area_name || (planting as any).greenhouse_name || '',
              operatorId: operatorId2, operatorName: operatorName2,
              primaryMethod: primaryPestMethod,
              primaryTargetPest,
            });
          }
        }
      } catch (syncErr) {
        console.error('[planting daily-records] 施肥/用药同步失败（不影响主记录）:', (syncErr as Error)?.message || syncErr);
      }
    }

    saveDatabase();
    const inserted = queryToObjects<any>(db, 'SELECT * FROM daily_records WHERE id = ?', [newId]);
    res.status(201).json({ success: true, data: inserted[0] || { id: newId } });
  } catch (error) {
    console.error('添加种植每日记录失败:', error);
    res.status(500).json({ success: false, error: '添加种植每日记录失败' });
  }
});

/**
 * 更新种植管理每日记录（事务原子：反向补偿 + 正向重放）
 * PUT /api/plantings/:id/daily-records/:recordId
 */
router.put('/:id/daily-records/:recordId', (req: Request, res: Response) => {
  try {
    const { id, recordId } = req.params;
    const { recordDate, remarks, data } = req.body || {};
    const db = getDatabase();
    const now = formatLocalDateISO();

    // 校验 planting 存在
    const pStmt = db.prepare('SELECT id, end_time FROM plantings WHERE id = ?');
    pStmt.bind([id]);
    const planting = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!planting) return res.status(404).json({ success: false, error: '种植记录不存在' });
    if (planting.end_time) return res.status(400).json({ success: false, error: '种植已结束，无法编辑' });

    // 读旧记录用于反向补偿
    const oldStmt = db.prepare('SELECT data FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?');
    oldStmt.bind([recordId, id, 'planting']);
    let oldData: any = {};
    if (oldStmt.step()) {
      const row = oldStmt.getAsObject() as any;
      try {
        oldData = row.data ? JSON.parse(row.data) : {};
      } catch {
        oldData = {};
      }
    }
    oldStmt.free();

    // 编辑场景事务：先反向抵消旧值，校验新值，通过则正向应用
    if (data !== undefined) {
      try {
        const newParsed = typeof data === 'string' ? JSON.parse(data) : data;
        const oldNormalized = normalizeChangeData(oldData);
        const newNormalized = normalizeChangeData(newParsed);

        const hasLossChange = oldNormalized.lossChange !== newNormalized.lossChange;
        const hasSupplementChange = oldNormalized.supplementChange !== newNormalized.supplementChange;
        if (hasLossChange || hasSupplementChange) {
          // 1) 反向抵消旧值
          if (oldData && Object.keys(oldData).length > 0) {
            applyDailyChangeToPlanting(id, oldNormalized, -1);
          }
          // 2) 校验新值
          const validateErr = validateDailyChange(id, newNormalized);
          if (validateErr) {
            // 3) 校验失败：还原旧值
            if (oldData && Object.keys(oldData).length > 0) {
              applyDailyChangeToPlanting(id, oldNormalized, 1);
            }
            return res.status(400).json({ success: false, error: validateErr });
          }
          // 4) 校验通过：应用新值
          applyDailyChangeToPlanting(id, newNormalized, 1);
        }
      } catch (e) {
        /* JSON 解析失败时跳过 */
      }
    }

    // UPDATE daily_records
    const dataJson = data !== undefined ? JSON.stringify(data) : null;
    const fields = ['update_time = ?'];
    const values: any[] = [now];
    if (recordDate) {
      fields.push('record_date = ?');
      values.push(recordDate);
    }
    if (dataJson !== null) {
      fields.push('data = ?');
      values.push(dataJson);
    }
    if (remarks !== undefined) {
      fields.push('remarks = ?');
      values.push(remarks || '');
    }
    values.push(recordId, id, 'planting');

    db.run(
      `UPDATE daily_records SET ${fields.join(', ')} WHERE id = ? AND related_id = ? AND related_type = ?`,
      values
    );

    saveDatabase();
    const updated = queryToObjects<any>(db, 'SELECT * FROM daily_records WHERE id = ?', [recordId]);
    res.json({ success: true, data: updated[0] || { id: recordId } });
  } catch (error) {
    console.error('编辑种植每日记录失败:', error);
    res.status(500).json({ success: false, error: '编辑种植每日记录失败' });
  }
});

/**
 * 删除种植管理每日记录（事务原子：反向累加）
 * DELETE /api/plantings/:id/daily-records/:recordId
 */
router.delete('/:id/daily-records/:recordId', (req, res) => {
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();

    // 校验 planting 存在
    const pStmt = db.prepare('SELECT end_time FROM plantings WHERE id = ?');
    pStmt.bind([id]);
    const planting = pStmt.step() ? pStmt.getAsObject() : null;
    pStmt.free();
    if (!planting) return res.status(404).json({ success: false, error: '种植记录不存在' });
    if (planting.end_time) return res.status(400).json({ success: false, error: '种植已结束，无法删除' });

    // 读旧记录用于反向累加
    const oldStmt = db.prepare('SELECT data FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?');
    oldStmt.bind([recordId, id, 'planting']);
    let oldData: any = {};
    if (oldStmt.step()) {
      const row = oldStmt.getAsObject() as any;
      try {
        oldData = row.data ? JSON.parse(row.data) : {};
      } catch {
        oldData = {};
      }
    }
    oldStmt.free();

    // DELETE daily_records
    db.run('DELETE FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?', [
      recordId,
      id,
      'planting',
    ]);

    // 2026-07-15：恢复同步扣减的库存（先查旧值 → 恢复 → 再删同步行）
    try {
      const { adjustFertilizerStock, adjustPesticideStock, getOldFertilizerSync, getOldPesticideSync } = require('../lib/syncDailyRecords');
      const oldFert = getOldFertilizerSync(db, recordId);
      const oldPest = getOldPesticideSync(db, recordId);
      // 恢复库存（delta > 0）
      for (const o of oldFert) adjustFertilizerStock(db, o.code, o.qty);
      for (const o of oldPest) adjustPesticideStock(db, o.code, o.qty);
      // 删除同步行
      db.run('DELETE FROM fertilizer_records WHERE source_daily_record_id = ?', [recordId]);
      db.run('DELETE FROM pesticide_records WHERE source_daily_record_id = ?', [recordId]);
    } catch (e) {
      console.error('[planting daily-records DELETE] 恢复库存失败（不影响主流程）:', (e as Error)?.message || e);
    }

    // 反向累加（-1 把之前 +1 的变更抵消）
    if (oldData && Object.keys(oldData).length > 0) {
      const normalized = normalizeChangeData(oldData);
      applyDailyChangeToPlanting(id, normalized, -1);
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('删除种植每日记录失败:', error);
    res.status(500).json({ success: false, error: '删除种植每日记录失败' });
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
    // 2026-06-29: 加 seedForm 字段（种植自留种采收形态）
    const {
      recordDate, destination, subType, seedForm, warehouseId, warehouseName,
      quantity, unit, notes, operatorName, createBy, createById,
      // 2026-07-03：采收入库弹窗 sync 写入时带进来的，不需要后端重新创建
      harvestRecordId: frontHarvestRecordId,
      inventoryStockId: frontInventoryStockId,
    } = req.body || {}

    if (!destination) return res.status(400).json({ success: false, error: '缺少 destination' })
    // 2026-06-29: 4 个去向减为 3 个（合并 circulate + self_seed 为 planting_self_kept）
    // 2026-07-09: dispose 已下线（与每日记录"损耗"语义重叠），从白名单移除
    const POST_ALLOWED_DESTINATIONS = ['harvest', 'planting_self_kept']
    if (!POST_ALLOWED_DESTINATIONS.includes(destination)) {
      return res.status(400).json({ success: false, error: `destination 必须是 2 个之一: ${POST_ALLOWED_DESTINATIONS.join(' / ')}` })
    }
    // 2026-06-29: planting_self_kept 必须传 seedForm（采收形态）
    if (destination === 'planting_self_kept') {
      if (!seedForm) {
        return res.status(400).json({
          success: false,
          error: '种植自留种必须填写采收形态（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他）'
        });
      }
      if (!SEED_FORM_OPTIONS.includes(seedForm)) {
        return res.status(400).json({
          success: false,
          error: `采收形态必须是 12 个之一: ${SEED_FORM_OPTIONS.join(' / ')}`
        });
      }
    }

    const db = getDatabase()
    // sql.js 标准模式：bind + step + getAsObject（与 /end 路由一致）
    const stmt = db.prepare('SELECT * FROM plantings WHERE id = ?')
    stmt.bind([id])
    const planting = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    if (!planting) return res.status(404).json({ success: false, error: '种植记录不存在' })
    // 2026-07-09 v5 阶段二（方案 E）：删 is_harvest_locked 拦截 — 已结束的种植/育苗允许补录
    // 补录判断改为 planting_harvest_records.is_supplementary（采收记录的属性）
    // 判断条件：planting.status === 'ended' 或 'cancelled' → 自动标记 is_supplementary=1
    // 补录原因（supplementaryReason）从 req.body 取，补录场景必填
    const isSupplementary = planting.status === 'ended' || planting.status === 'cancelled';
    const { supplementaryReason } = req.body || {};
    if (isSupplementary && (!supplementaryReason || !String(supplementaryReason).trim())) {
      return res.status(400).json({
        success: false,
        error: '补录模式必须填写补录原因（supplementaryReason 字段）',
      });
    }

    // destination 必填字段校验（与设计文档 §4.1 对齐）
    if (destination === 'harvest' && !warehouseId) {
      return res.status(400).json({ success: false, error: '必须选择仓库' })
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: '数量必须大于 0' })
    }
    // 2026-07-09: dispose 上限校验移除（dispose 功能已下线）
    // 2026-07-01 修复：放宽 unit 校验，与 inventory/inbound-from-source 一致
    // 原因：inventory 入库允许"朵"等单位（仅 z.string().min(1) 校验），
    //       但 planting_harvest_records 仍用 UNIT_ENUM 强白名单，导致行级采收入库后
    //       同步写 planting_harvest_records 被后端拒
    if (unit && typeof unit !== 'string') {
      return res.status(400).json({ success: false, error: '单位类型错误' })
    }

    const now = formatLocalDateISO()
    const harvestRecordId = `PHR${Date.now()}`
    const plantingId = id
    let generatedHarvestId: string | null = null
    let generatedStockId: string | null = null
    let generatedCircId: string | null = null
    // 2026-07-01 修复：planting_self_kept 自动写"内部种源库"虚拟仓库
    // 声明在 try 块外，让响应也能用
    let finalWarehouseId: string | null = warehouseId || null
    let finalWarehouseName: string | null = warehouseName || null
    if (destination === 'planting_self_kept') {
      if (!finalWarehouseName) finalWarehouseName = '内部种源库'
      if (!finalWarehouseId) finalWarehouseId = 'SEED_SOURCE_VIRTUAL'
    }

    // === 副作用前置：种植自留种回流 destination 必须先调 executeCirculation ===
    // (executeCirculation 内部调 saveDatabase()，与外层 BEGIN/COMMIT 冲突会破坏 sql.js 事务状态 — 与 /end 路由保持一致: 不在外层事务中)
    if (destination === 'planting_self_kept') {
      // 必须有种源才能回流
      if (!planting.source_id) {
        return res.status(400).json({ success: false, error: '该种植记录无种源，无法回流' })
      }
      // 2026-06-29: 派生 subType 由 seedForm 自动推导（取消 quantity_refill）
      const finalSubType = deriveSeedFormSubType(seedForm || '')
      const circType = 'PROPAGATION'

      const result = executeCirculation({
        circulationType: circType,
        sourceModule: 'planting',
        sourceId: plantingId,
        parentSourceId: planting.source_id,
        subType: finalSubType,
        destination: 'seed_source',
        quantity, unit, notes,
        seedForm: seedForm || undefined,  // 2026-06-29: 新增，写到 seed_sources.seed_form
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
      // 2026-07-09: dispose 分支移除（dispose 功能已下线）
      // 注: circulate / self_seed 已在 BEGIN 之前完成 executeCirculation (避免与外层事务冲突)

      // INSERT planting_harvest_records（副作用审计记录）
      // 2026-07-01 修复：planting_self_kept 自动写"内部种源库"虚拟仓库（finalWarehouseId/Name 在 try 块外声明）
      // 2026-07-09 v5 阶段二（方案 E）：补录字段写入（is_supplementary 等 4 字段）
      db.run(`
        INSERT INTO planting_harvest_records (
          id, record_type, record_date, planting_id, planting_code,
          destination, sub_type, warehouse_id, warehouse_name,
          quantity, unit, notes, operator_name, create_by, create_by_id,
          create_time, update_time,
          harvest_record_id, inventory_stock_id, circulation_record_id,
          source_form,
          is_supplementary, supplementary_reason, supplementary_at, supplementary_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        harvestRecordId, 'planting', recordDate || now.split('T')[0], plantingId, planting.planting_code,
        destination, subType || null, finalWarehouseId, finalWarehouseName,
        quantity, unit || 'g', notes || null, operatorName || null, createBy || null, createById || null,
        now, now,
        // 2026-07-03：harvest 分支用前端传入的已创建 ID（不重复创建 harvest_records）
        destination === 'harvest' ? (frontHarvestRecordId || null) : generatedHarvestId,
        destination === 'harvest' ? (frontInventoryStockId || null) : generatedStockId,
        generatedCircId,
        // 2026-07-02: harvest 分支也写 source_form — 修复历史记录"形态"列为空
        (destination === 'planting_self_kept' || destination === 'harvest') ? (seedForm || null) : null,
        // 2026-07-09 v5 阶段二：补录字段（is_supplementary 等）
        isSupplementary ? 1 : 0,
        isSupplementary ? String(supplementaryReason).trim() : null,
        isSupplementary ? now : null,
        isSupplementary ? (operatorName || createBy || 'system') : null,
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
        // 2026-07-01 修复：响应也用 finalWarehouseId / finalWarehouseName（与 INSERT 一致）
        warehouseId: finalWarehouseId,
        warehouseName: finalWarehouseName,
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
        // 2026-07-02: 返回形态字段，前端 normalizeHarvestRecord 读取 sourceForm → seedForm
        sourceForm: seedForm || null,
      }
    })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})



router.post('/:id/end', async (req, res) => {
  try {
    const { id } = req.params
    const { endType, subType, warehouseId, quantity, unit, notes, seedForm } = req.body || {}
    const db = getDatabase()
    // sql.js 标准模式：bind + step + getAsObject（.get() 在 sql.js 中不可靠，返回空对象）
    const stmt = db.prepare(`SELECT * FROM plantings WHERE id = ?`)
    stmt.bind([id])
    const planting = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    if (!planting || !planting.id) return res.status(404).json({ success: false, error: '种植记录不存在' })

    const now = formatLocalDateISO()

    // 2026-07-01 P0-1 修复：补录通道契约
    // - 'abnormal'（异常结束） → is_harvest_locked = 0（保留补录通道，让 PUT /:id/harvest-records/:id 继续可写）
    // - 'harvest' 等其它 → is_harvest_locked = 1（正常锁，不再允许新增采收记录）
    // 2026-07-09: dispose 已下线，endType 列表减为 3 个（harvest/circulate/self_seed）
    const finalIsHarvestLocked = (endType === 'abnormal') ? 0 : 1

    // ========== 1. 采收入库：写 harvest_records + inventory_stock（库存实例） ==========
    if (endType === 'harvest') {
      const harvestQty = Number(quantity) || Number(planting.harvest_quantity) || 0
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
        `UPDATE plantings SET is_harvest = 1, harvest_date = ?, harvest_quantity = ?, status = 'harvested', end_type = 'harvest', end_time = ?, is_harvest_locked = 0, update_time = ? WHERE id = ?`,
        // 2026-07-09 v5 阶段一：is_harvest_locked 强制 0 — 已结束仍允许补录（补录标志走 planting_harvest_records.is_supplementary）
        [now, harvestQty, now, now, id]
      )
      saveDatabase()

      // 写入 material_flow_log：种植→采收（P0 修复 — 补齐采收链路）
      try {
        // 链 1：种植 → 采收
        writeFlowLog({
          flow_type: 'planting→harvest',
          crop_name: String(planting.crop_name || ''),
          crop_variety: String(planting.crop_variety || ''),
          source_type: 'planting',
          source_id: id,
          source_code: String(planting.planting_code || id),
          source_quantity: harvestQty,
          source_unit: String(harvestUnit),
          source_category: 'planting',
          target_type: 'harvest',
          target_id: harvestId,
          target_code: harvestCode,
          target_quantity: harvestQty,
          target_unit: String(harvestUnit),
          business_code: harvestCode,
          created_by: operator,
        });
        // 链 2：采收 → 入库
        writeFlowLog({
          flow_type: 'harvest→inventory',
          crop_name: String(planting.crop_name || ''),
          crop_variety: String(planting.crop_variety || ''),
          source_type: 'harvest',
          source_id: harvestId,
          source_code: harvestCode,
          source_quantity: harvestQty,
          source_unit: String(harvestUnit),
          source_category: 'self_produced',
          target_type: 'inventory_stock',
          target_id: stockId,
          target_code: instanceId,
          target_quantity: harvestQty,
          target_unit: String(harvestUnit),
          business_code: harvestCode,
          created_by: operator,
        });
      } catch (e) { console.error('[planting] writeFlowLog 失败:', (e as any)?.message || e); }

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

    // 2026-07-09: 移除"直接废弃"分支（dispose 功能已下线，与每日记录"损耗"语义重叠）
    // 历史 plantings.end_type='disposal' 记录保留 DB 兼容，新值不再创建
    // 用户如需结束种植，请用「异常结束」(endType='abnormal')或走 harvest 通道

    // ========== 3-5. 回流类：必须有种源 ==========
    if (!planting.source_id) {
      return res.status(400).json({ success: false, error: '该种植记录无种源,无法回流' })
    }
    // 2026-06-29: /end 路由保留向后兼容 — 旧 self_seed / quantity_refill 入参仍生效
    // 新 planting_self_kept 入口则按 seedForm 派生（由调用方在请求体传 seedForm）
    let finalSubType: string | undefined
    let derivedSeedForm: string | undefined
    if (endType === 'self_seed') {
      finalSubType = 'seed_saving'
      derivedSeedForm = seedForm || '其他'
    } else if (subType === 'quantity_refill') {
      finalSubType = undefined  // QUANTITY 类型不需要 subType
    } else if (endType === 'planting_self_kept' && seedForm) {
      // 2026-06-29: 新合并 planting_self_kept — 按 seedForm 派生
      finalSubType = deriveSeedFormSubType(seedForm)
      derivedSeedForm = seedForm
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
      seedForm: derivedSeedForm,  // 2026-06-29: 新增
    })

    // 公共收尾：标记种植记录已结束
    db.run(
      `UPDATE plantings SET status = 'ended', end_type = ?, end_time = ?, is_harvest_locked = 0, update_time = ? WHERE id = ?`,
      // 2026-07-09 v5 阶段一：is_harvest_locked 强制 0 — 已结束仍允许补录
      [endType, now, now, id]
    )
    saveDatabase()
    return res.json({ success: true, data: { id, status: 'ended', endType, ...result } })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

/**
 * GET /api/plantings/:id/history
 * 2026-06-27: 种植实体历史（audit_logs + inbound + transaction UNION）
 */
router.get('/:id/history', (req, res) => {
  try {
    const { id } = req.params;
    const { queryEntityHistory } = require('../services/entityHistory.service');
    const items = queryEntityHistory('planting', id, 200);
    res.json({ success: true, data: items });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
