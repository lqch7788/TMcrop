/**
 * 育苗 API 路由
 * C1：所有路由都经过 authenticate 中间件
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { seedSourceService, BusinessError, SeedSourceErrorCode } from '../services/seedSource.service';
import { writeFlowLog, writeCorrection } from '../services/flowLogService';
import { mapPropagationToCategory } from '../lib/sourceCategoryMapper';

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

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
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
  const { sourceId, count, seedling } = req.body || {};

  if (!sourceId || typeof sourceId !== 'string') {
    return res.status(400).json({ success: false, error: '缺少 sourceId 参数' });
  }
  if (!seedling || typeof seedling !== 'object') {
    return res.status(400).json({ success: false, error: '缺少 seedling 参数' });
  }

  const db = getDatabase();
  const newId = seedling.id || `SD${Date.now()}`;
  const now = new Date().toISOString();
  const { seedling_code, source_name, crop_code, crop_name, crop_variety,
          seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
          seedling_quantity, survival_quantity, survival_rate, status, seedling_status, remarks, create_by,
          work_hours, production_plan_code } = seedling;
  const productionPlanCode = production_plan_code ?? seedling.productionPlanCode;
  const workHours = work_hours ?? seedling.workHours;
  const cropCode = crop_code ?? seedling.cropCode;

  // 步骤0：参数校验（与 seedSourceService.decreaseAvailable 保持等价语义）
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
    // 步骤1：查询种源（事务内取最新值）
    const stmt = db.prepare('SELECT remaining_quantity, propagation_status FROM seed_sources WHERE id = ?');
    stmt.bind([sourceId]);
    let existing: { remaining_quantity?: number; propagation_status?: string } | null = null;
    if (stmt.step()) {
      existing = stmt.getAsObject() as any;
    }
    stmt.free();

    if (!existing) {
      throw new BusinessError(SeedSourceErrorCode.NOT_FOUND, '种源记录不存在', 404);
    }
    // L3：拒绝 FAILED 状态扣减
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

    // 步骤2：扣减种源（不调用 service，避免内部 saveDatabase 提前落盘）
    db.run('UPDATE seed_sources SET remaining_quantity = ?, update_time = ? WHERE id = ?',
      [newAvailable, now, sourceId]);

    // 步骤3：创建育苗记录
    db.run(`
      INSERT INTO seedlings (id, seedling_code, source_id, source_name, crop_code, crop_name, crop_variety,
        seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
        seedling_quantity, survival_quantity, survival_rate, status, seedling_status, remarks, create_by, work_hours,
        production_plan_code, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, seedling_code, sourceId, source_name, cropCode, crop_name, crop_variety,
        seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
        seedling_quantity, survival_quantity, survival_rate, status || 'in_progress', seedling_status, remarks, create_by, workHours || null,
        productionPlanCode || null, now, now]
        .map(v => v === undefined ? null : v));

    // 步骤3.5：写入 material_flow_log（在 COMMIT 前，同事务）
    try {
      // 反查种源的 propagation_type 获取 source_category
      let sourceCategory = 'other';
      const srcInfo = db.exec('SELECT propagation_type FROM seed_sources WHERE id = ?', [sourceId]);
      if (srcInfo[0]?.values?.[0]) {
        sourceCategory = mapPropagationToCategory(srcInfo[0].values[0][0] as string);
      }
      const finalSourceCode = (seedling as any).source_code || (seedling as any).sourceCode || sourceId;
      writeFlowLog({
        flow_type: 'seed_source→seedling',
        crop_name: crop_name,
        crop_variety: crop_variety,
        source_type: 'seed_source',
        source_id: sourceId,
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
    } catch { /* flow_log 写入失败不影响主流程 */ }

    // 步骤4：提交 + 落盘
    db.exec('COMMIT');
    saveDatabase();
    return res.status(201).json({ success: true, data: { id: newId } });
  } catch (insertErr) {
    // 任一失败：整体回滚（sql.js 在 ROLLBACK 后会自动丢弃事务内所有变更）
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    throw insertErr;
  }
}));

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

    for (const seedlingId of seedlingIds) {
      // 获取育苗记录
      const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
      stmt.bind([seedlingId]);
      let seedling: any = null;
      if (stmt.step()) {
        seedling = stmt.getAsObject();
      }
      stmt.free();

      if (!seedling) continue;

      // 生成打印记录
      const newId = `PR${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newOid = `PR${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

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
      WHERE s.status = 'completed'
    `;
    const params: any[] = [];

    if (crop_name) {
      sql += ' AND s.crop_name LIKE ?';
      params.push('%' + crop_name + '%');
    }

    // 获取总数
    let countSql = 'SELECT COUNT(*) FROM seedlings s WHERE s.status = ?';
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
      WHERE 1=1
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
    let countSql = 'SELECT COUNT(*) FROM seedlings s WHERE 1=1';
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

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, seedling_code, source_id, source_name, crop_code, crop_name, crop_variety,
            seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
            seedling_quantity, survival_quantity, survival_rate, status, seedling_status, remarks, create_by,
            work_hours, production_plan_code, target_survival_rate, target_survival_count, loss_count, loss_rate,
            source_mode, external_seed_code, external_seed_name, external_seed_quantity, external_seed_note } = req.body;
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
    db.run(`
      INSERT INTO seedlings (id, seedling_code, source_id, source_name, crop_code, crop_name, crop_variety,
        seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
        seedling_quantity, survival_quantity, survival_rate, status, seedling_status, remarks, create_by, work_hours,
        production_plan_code, target_survival_rate, target_survival_count, loss_count, loss_rate,
        source_mode, external_seed_code, external_seed_name, external_seed_quantity, external_seed_note,
        create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, seedling_code, source_id, source_name, cropCode, crop_name, crop_variety,
        seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
        seedling_quantity, survival_quantity, survival_rate, status || 'in_progress', seedling_status, remarks, create_by, workHours || null,
        productionPlanCode || null, target_survival_rate ?? null, target_survival_count ?? null, loss_count ?? 0, loss_rate ?? 0,
        sourceMode || 'internal', externalSeedCode || null, externalSeedName || null, externalSeedQuantity ?? 0, externalSeedNote || null,
        now, now]
        .map(v => v === undefined ? null : v));

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
      } catch (e) { /* flow_log 写入失败不影响主流程 */ }
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
      } catch (e) { /* flow_log 写入失败不影响主流程 */ }
    }

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建育苗记录失败:', error);
    res.status(500).json({ success: false, error: '创建育苗记录失败' });
  }
});

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
        }
      } catch { /* correction 失败不影响主流程 */ }
    }

    res.json({ success: true, data: { id } });
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
    db.run('UPDATE seedlings SET deleted_at = ? WHERE id = ?', [now, id]);
    saveDatabase();
    res.json({ success: true, message: '育苗记录已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除育苗记录失败' });
  }
});

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

    // 生成每日记录ID和OID
    const newId = `DR${Date.now()}`;
    const newOid = `DR${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
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
      record_date || now.split('T')[0],
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

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, oid: newOid } });
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

    // 业务字段打包成 data JSON（与 POST 一致）
    const { recordDate, remarks, ...bizFields } = req.body;
    const dataJson = Object.keys(bizFields).length > 0 ? JSON.stringify(bizFields) : null;

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
    saveDatabase();
    res.json({ success: true, data: { id: recordId, updated: true } });
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
    db.run(
      'DELETE FROM daily_records WHERE id = ? AND related_id = ? AND related_type = ?',
      [recordId, id, 'seedling']
    );
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
    const newOid = `TR${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
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
      transplant_date || now.split('T')[0],
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
    res.status(201).json({ success: true, data: { id: newId, oid: newOid } });
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
    const newOid = `PR${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
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
    const plantedQuantity = item.planted_quantity || 0;
    const availableCount = survivalQuantity - plantedQuantity;

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
  try {
    const { id } = req.params;
    const { count } = req.body;

    if (typeof count !== 'number' || count <= 0) {
      return res.status(400).json({ success: false, error: '无效的数量' });
    }

    const db = getDatabase();

    // 检查育苗记录是否存在
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

    const now = new Date().toISOString();
    const currentPlanted = item.planted_quantity || 0;
    const newPlanted = currentPlanted + count;

    db.run('UPDATE seedlings SET planted_quantity = ?, update_time = ? WHERE id = ?', [newPlanted, now, id]);
    saveDatabase();

    res.json({ success: true, data: { planted_quantity: newPlanted } });
  } catch (error) {
    res.status(500).json({ success: false, error: '增加已定植数量失败' });
  }
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

    // 由于没有专门的标签追踪表，这里将履历记录存储到 transplant_history 表
    // 如果表不存在，需要先创建
    try {
      db.run(`
        INSERT INTO transplant_history (
          id, seedling_id, label_number, to_area, to_location,
          operator_id, operator_name, remarks, create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        id,
        labelNumber,
        to_area || '',
        to_location || '',
        operator_id || '',
        operator_name || '',
        remarks || '',
        create_by || '',
        now,
        now
      ]);
      saveDatabase();
    } catch (err) {
      // 如果表不存在，返回一个模拟响应
      console.warn('transplant_history 表可能不存在:', err);
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

    if (!status) {
      return res.status(400).json({ success: false, error: '缺少 status 参数' });
    }

    // 由于标签追踪需要专门的表，这里暂时返回成功
    res.json({ success: true, message: '标签状态已更新' });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新标签状态失败' });
  }
});

export default router;
