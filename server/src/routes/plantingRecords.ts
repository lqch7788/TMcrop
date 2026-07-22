/**
 * 2026-06-25 v3: 种植记录子表 CRUD
 * - 育种记录: /api/plantings/:id/breeding-records
 * - 留种记录: /api/plantings/:id/seed-saving-records
 *
 * 数据流：V2.1 铁律 — 无缓存降级
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase, saveDatabase } from '../db';
import { authenticate } from '../middleware/auth';
// 2026-07-22：追溯修复 - 育种/留种操作写入 audit_log
import { writeAuditLog } from '../services/auditLog.service';

const router = Router();
router.use(authenticate);

// ============ Zod Schemas ============

// 2026-07-03 v2：扩 enum
// 有性：cross(杂交)/self(自交)/backcross(回交)/selection(选育-有种)/marker(标记)/other
// 无性：clonal(无性选育)/cutting(扦插)/grafting(嫁接)/layering(压条)/tissue(组培)/division(分株)
const BreedingOperationType = z.enum([
  'cross', 'self', 'backcross', 'selection', 'marker', 'other',
  'clonal', 'cutting', 'grafting', 'layering', 'tissue', 'division',
]);
// 2026-07-03 v4：留种模式
const SeedSavingPart = z.enum([
  'fruit', 'seed', 'whole_plant', 'root', 'stem', 'leaf', 'other',
  // 2026-07-03 v4：无性繁殖器官
  'tuber', 'bulb', 'corm', 'rhizome', 'cutting', 'stolon',
]);
const SeedSavingMode = z.enum(['seed', 'vegetative']);

// 2026-07-03 v2：繁殖方式（无性繁殖专用）
const PropagationMethod = z.enum([
  'cutting', 'grafting', 'layering', 'tissue_culture', 'division', 'bulb', 'tuber', 'runner',
]);

// 2026-07-03 v3：无性操作类型常量（业务校验共用）
const ASEXUAL_OPS: ReadonlyArray<string> = ['clonal', 'cutting', 'grafting', 'layering', 'tissue', 'division'];

/**
 * 2026-07-03 v3：育种记录业务校验（POST/PUT 共用）
 * @returns null = 通过；string = 错误信息
 */
function validateBreedingBusiness(data: {
  operationType: string
  parentMaleCode?: string | null
  parentFemaleCode?: string | null
  motherPlantCode?: string | null
  propagationMethod?: string | null
  inoculationCount?: number | null
  survivalCount?: number | null
}): string | null {
  // 杂交/回交父本必填
  if ((data.operationType === 'cross' || data.operationType === 'backcross') && !data.parentMaleCode) {
    return '杂交/回交时父本编码必填'
  }
  // 父本 ≠ 母本
  if (data.parentMaleCode && data.parentFemaleCode && data.parentMaleCode === data.parentFemaleCode) {
    return '父本编码不能与母本编码相同'
  }
  // 无性母株必填
  if (ASEXUAL_OPS.includes(data.operationType) && !data.motherPlantCode) {
    return '无性繁殖时母株编码必填'
  }
  // 有性不应填无性字段
  if (!ASEXUAL_OPS.includes(data.operationType)) {
    if (data.motherPlantCode || data.propagationMethod || (data.inoculationCount && data.inoculationCount > 0) || (data.survivalCount && data.survivalCount > 0)) {
      return '有性繁殖不应填写无性字段（母株/繁殖方式/接种数/成活数）'
    }
  }
  return null
}

// 2026-07-03：育种记录通用字段（适用所有 6 种操作类型）
// 目标性状：抗病/优质/早熟/丰产/抗逆/雄性不育 等
const TARGET_TRAIT_VALUES = ['抗病', '优质', '早熟', '丰产', '抗逆', '雄性不育', '其他'] as const
const BreedingRecordSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式 YYYY-MM-DD'),
  operationType: BreedingOperationType,
  generation: z.string().optional().nullable(),
  parentMaleCode: z.string().optional().nullable(),
  parentMaleSource: z.enum(['seed_source', 'planting', 'free']).optional().nullable(),
  parentFemaleCode: z.string().optional().nullable(),
  parentFemaleSource: z.enum(['seed_source', 'planting', 'free']).optional().nullable(),
  operator: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  // 新增 3 个通用字段
  // 2026-07-03：targetTraits 在 route 业务层校验（zod 4 array.refine 对中文 unicode 处理有 bug）
  targetTraits: z.array(z.string()).optional().nullable(),
  fruitCount: z.number().int().nonnegative().optional().nullable(),  // 结实数
  seedCount: z.number().int().nonnegative().optional().nullable(),  // 收获种子数
  pollinatedFlowerCount: z.number().int().nonnegative().optional().nullable(),  // 授粉花数（计算结实率用）
  // 2026-07-03 v3：无性繁殖专用字段
  motherPlantCode: z.string().optional().nullable(),                  // 母株编码
  propagationMethod: PropagationMethod.optional().nullable(),        // 繁殖方式
  inoculationCount: z.number().int().nonnegative().optional().nullable(),  // 接种数
  survivalCount: z.number().int().nonnegative().optional().nullable(),      // 成活数
  // 2026-07-03 v3：繁殖模式（'sexual' | 'asexual'，方便筛选/导出）
  reproductionMode: z.enum(['sexual', 'asexual']).optional().nullable(),
});

const SeedSavingRecordSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式 YYYY-MM-DD'),
  plantMarker: z.string().min(1, '留种株号必填'),
  harvestPart: SeedSavingPart.optional().nullable(),
  quantity: z.number().nonnegative().optional().nullable(),
  unit: z.string().optional().nullable(),
  operator: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  // 2026-07-03 v4：保存模式
  preservationMode: SeedSavingMode.optional().nullable(),
  // 共享新字段
  lotNumber: z.string().optional().nullable(),                   // 批次号
  purpose: z.string().optional().nullable(),                    // 用途/去向
  processingMethod: z.string().optional().nullable(),           // 处理方式
  storageLocation: z.string().optional().nullable(),            // 存储位置
  containerType: z.string().optional().nullable(),              // 容器类型
  // 种子保存专用（sexual seed preservation）
  germinationRate: z.number().min(0).max(100).optional().nullable(),  // 发芽率(%)
  thousandSeedWeight: z.number().nonnegative().optional().nullable(),  // 千粒重(g)
  purity: z.number().min(0).max(100).optional().nullable(),          // 纯度(%)
  moistureContent: z.number().min(0).max(100).optional().nullable(),  // 含水率(%)
  seedTreatment: z.string().optional().nullable(),                    // 种子处理
  maturityStage: z.string().optional().nullable(),                    // 成熟度
  // 营养体保存专用（vegetative preservation）
  sizeGrade: z.string().optional().nullable(),                 // 规格等级
  budNodeCount: z.number().int().nonnegative().optional().nullable(), // 芽眼/节数
  healthStatus: z.string().optional().nullable(),              // 检疫状态
  dormancyState: z.string().optional().nullable(),             // 休眠状态
});

const UpdateBreedingRecordSchema = BreedingRecordSchema.partial();
const UpdateSeedSavingRecordSchema = SeedSavingRecordSchema.partial();

// ============ Helpers ============

function generateRecordId(prefix: string, dateStr: string): string {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${dateStr}-${ts}${rand}`;
}

function ensureTable(db: any, table: string, createSql: string): void {
  const exists = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
  ).get(table);
  if (!exists) {
    db.run(createSql);
    saveDatabase();
  }
}

// ============ 启动时建表（idempotent）============

function initTables() {
  const db = getDatabase();
  ensureTable(db, 'planting_breeding_records', `
    CREATE TABLE IF NOT EXISTS planting_breeding_records (
      id TEXT PRIMARY KEY,
      planting_id TEXT NOT NULL,
      record_date TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      generation TEXT,
      parent_male_code TEXT,
      parent_male_source TEXT,
      parent_female_code TEXT,
      parent_female_source TEXT,
      operator TEXT,
      remarks TEXT,
      -- 2026-07-03：通用专业字段
      target_traits TEXT,   -- JSON 数组：["抗病","优质","早熟",...]
      fruit_count INTEGER,  -- 结实数（整株或单果）
      seed_count INTEGER,   -- 收获种子数
      -- 2026-07-03 v2：授粉花数（计算结实率用）
      pollinated_flower_count INTEGER,  -- 授粉花数
      -- 2026-07-03 v3：无性繁殖专用字段
      mother_plant_code TEXT,        -- 母株编码
      propagation_method TEXT,       -- 繁殖方式（cutting/grafting/...）
      inoculation_count INTEGER,     -- 接种数
      survival_count INTEGER,        -- 成活数
      reproduction_mode TEXT,        -- 繁殖模式（sexual/asexual）
      create_time TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    )
  `);
  // 2026-07-03：已存在表加 3 个新列（idempotent）
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN target_traits TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN fruit_count INTEGER`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN seed_count INTEGER`); } catch (_) {}
  // 2026-07-03 v2：授粉花数列
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN pollinated_flower_count INTEGER`); } catch (_) {}
  // 2026-07-03 v3：无性繁殖专用 4 列 + 模式列
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN mother_plant_code TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN propagation_method TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN inoculation_count INTEGER`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN survival_count INTEGER`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_breeding_records ADD COLUMN reproduction_mode TEXT`); } catch (_) {}
  ensureTable(db, 'planting_seed_saving_records', `
    CREATE TABLE IF NOT EXISTS planting_seed_saving_records (
      id TEXT PRIMARY KEY,
      planting_id TEXT NOT NULL,
      record_date TEXT NOT NULL,
      plant_marker TEXT NOT NULL,
      harvest_part TEXT,
      quantity REAL,
      unit TEXT,
      operator TEXT,
      remarks TEXT,
      -- 2026-07-03 v4：保存模式 + 共享字段
      preservation_mode TEXT,          -- 保存模式(seed/vegetative)
      lot_number TEXT,                 -- 批次号
      purpose TEXT,                    -- 用途/去向
      processing_method TEXT,          -- 处理方式
      storage_location TEXT,           -- 存储位置
      container_type TEXT,             -- 容器类型
      -- 种子保存专用
      germination_rate REAL,           -- 发芽率(%)
      thousand_seed_weight REAL,       -- 千粒重(g)
      purity REAL,                     -- 纯度(%)
      moisture_content REAL,           -- 含水率(%)
      seed_treatment TEXT,             -- 种子处理
      maturity_stage TEXT,             -- 成熟度
      -- 营养体保存专用
      size_grade TEXT,                 -- 规格等级
      bud_node_count INTEGER,          -- 芽眼/节数
      health_status TEXT,              -- 检疫状态
      dormancy_state TEXT,             -- 休眠状态
      create_time TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    )
  `);
  // 2026-07-03 v4：留种表加 16 个新列（idempotent）
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN preservation_mode TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN lot_number TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN purpose TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN processing_method TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN storage_location TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN container_type TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN germination_rate REAL`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN thousand_seed_weight REAL`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN purity REAL`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN moisture_content REAL`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN seed_treatment TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN maturity_stage TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN size_grade TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN bud_node_count INTEGER`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN health_status TEXT`); } catch (_) {}
  try { db.run(`ALTER TABLE planting_seed_saving_records ADD COLUMN dormancy_state TEXT`); } catch (_) {}
  // 索引（按 planting_id 加速列表查询）
  const idxBr = db.prepare(`CREATE INDEX IF NOT EXISTS idx_breeding_planting ON planting_breeding_records(planting_id)`);
  idxBr.run();
  idxBr.free();
  const idxSr = db.prepare(`CREATE INDEX IF NOT EXISTS idx_seed_saving_planting ON planting_seed_saving_records(planting_id)`);
  idxSr.run();
  idxSr.free();
}

let tablesInitialized = false;

function ensureTables() {
  if (tablesInitialized) return;
  try {
    initTables();
    tablesInitialized = true;
  } catch {
    // DB 尚未就绪，延迟初始化
  }
}

// ============ 育种记录 CRUD ============

/**
 * GET /api/plantings/:id/breeding-records
 */
router.get('/:id/breeding-records', (req: Request, res: Response) => {
  ensureTables();
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT * FROM planting_breeding_records WHERE planting_id = ? ORDER BY record_date DESC, create_time DESC`
    );
    stmt.bind([id]);
    const rows: unknown[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET breeding-records] error:', err);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
});

/**
 * POST /api/plantings/:id/breeding-records
 */
router.post('/:id/breeding-records', (req: Request, res: Response) => {
  ensureTables();
  try {
    const { id } = req.params;
    const parsed = BreedingRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = (parsed.error as unknown as { issues?: Array<{ message?: string }> }).issues || [];
      return res.status(400).json({ success: false, error: issues[0]?.message || '参数错误' });
    }
    const data = parsed.data;
    // 2026-07-03 v3：判断繁殖模式（显式 reproductionMode 优先，否则按 operationType 推断）
    const reproductionMode = data.reproductionMode || (ASEXUAL_OPS.includes(data.operationType) ? 'asexual' : 'sexual')
    // 业务规则（POST/PUT 共用）
    const bizErr = validateBreedingBusiness(data)
    if (bizErr) {
      return res.status(400).json({ success: false, error: bizErr })
    }
    // 2026-07-03：目标性状枚举校验（业务层）
    if (data.targetTraits && Array.isArray(data.targetTraits)) {
      const validTraits = (TARGET_TRAIT_VALUES as readonly string[]).filter((t) => data.targetTraits!.includes(t))
      if (validTraits.length !== data.targetTraits.length) {
        return res.status(400).json({
          success: false,
          error: `目标性状必须是 ${TARGET_TRAIT_VALUES.join('/')} 之一`,
        })
      }
    }
    const db = getDatabase();
    // 校验种植存在
    const pStmt = db.prepare(`SELECT id FROM plantings WHERE id = ?`);
    pStmt.bind([id]);
    const plantingExists = pStmt.step();
    pStmt.free();
    if (!plantingExists) {
      return res.status(404).json({ success: false, error: '种植记录不存在' });
    }
    const recordId = generateRecordId('BR', data.recordDate);
    const ins = db.prepare(
      `INSERT INTO planting_breeding_records (
        id, planting_id, record_date, operation_type, generation,
        parent_male_code, parent_male_source, parent_female_code, parent_female_source,
        operator, remarks, target_traits, fruit_count, seed_count, pollinated_flower_count,
        mother_plant_code, propagation_method, inoculation_count, survival_count, reproduction_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    ins.run([
      recordId, id, data.recordDate, data.operationType, data.generation || null,
      data.parentMaleCode || null, data.parentMaleSource || null,
      data.parentFemaleCode || null, data.parentFemaleSource || null,
      data.operator || null, data.remarks || null,
      // 2026-07-03：3 个新通用字段
      data.targetTraits ? JSON.stringify(data.targetTraits) : null,
      data.fruitCount ?? null,
      data.seedCount ?? null,
      // 2026-07-03 v2：授粉花数
      data.pollinatedFlowerCount ?? null,
      // 2026-07-03 v3：无性繁殖 4 字段 + 模式
      data.motherPlantCode || null,
      data.propagationMethod || null,
      data.inoculationCount ?? null,
      data.survivalCount ?? null,
      reproductionMode,
    ]);
    ins.free();
    saveDatabase();
    // 2026-07-22：追溯修复 - 必须在 return 之前调用
    writeAuditLog({
      businessType: 'planting.breeding',
      businessId: req.params.id,
      action: 'breeding',
      operatorName: (req as any).user?.name,
      opinion: `添加育种记录 ${recordId}`,
    });
    return res.json({ success: true, data: { id: recordId } });
  } catch (err) {
    console.error('[POST breeding-records] error:', err);
    return res.status(500).json({ success: false, error: '创建失败' });
  }
});

/**
 * PUT /api/plantings/:id/breeding-records/:recordId
 */
router.put('/:id/breeding-records/:recordId', (req: Request, res: Response) => {
  ensureTables();
  try {
    const { id, recordId } = req.params;
    const parsed = UpdateBreedingRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }
    const data = parsed.data;
    const db = getDatabase();
    // 2026-07-03 v3：业务校验（PUT 也用）— 当 operationType/motherPlantCode 等关键字段被更新时校验
    if (data.operationType) {
      const bizErr = validateBreedingBusiness({
        operationType: data.operationType,
        parentMaleCode: data.parentMaleCode,
        parentFemaleCode: data.parentFemaleCode,
        motherPlantCode: data.motherPlantCode,
        propagationMethod: data.propagationMethod,
        inoculationCount: data.inoculationCount,
        survivalCount: data.survivalCount,
      })
      if (bizErr) {
        return res.status(400).json({ success: false, error: bizErr })
      }
    }
    // 检查记录存在
    const cStmt = db.prepare(`SELECT id FROM planting_breeding_records WHERE id = ? AND planting_id = ?`);
    cStmt.bind([recordId, id]);
    const exists = cStmt.step();
    cStmt.free();
    if (!exists) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    // 动态 UPDATE
    const fields: string[] = [];
    const params: unknown[] = [];
    if (data.recordDate !== undefined) { fields.push('record_date = ?'); params.push(data.recordDate); }
    if (data.operationType !== undefined) { fields.push('operation_type = ?'); params.push(data.operationType); }
    if (data.generation !== undefined) { fields.push('generation = ?'); params.push(data.generation); }
    if (data.parentMaleCode !== undefined) { fields.push('parent_male_code = ?'); params.push(data.parentMaleCode); }
    if (data.parentMaleSource !== undefined) { fields.push('parent_male_source = ?'); params.push(data.parentMaleSource); }
    if (data.parentFemaleCode !== undefined) { fields.push('parent_female_code = ?'); params.push(data.parentFemaleCode); }
    if (data.parentFemaleSource !== undefined) { fields.push('parent_female_source = ?'); params.push(data.parentFemaleSource); }
    if (data.operator !== undefined) { fields.push('operator = ?'); params.push(data.operator); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); params.push(data.remarks); }
    // 2026-07-03：3 个新通用字段
    if (data.targetTraits !== undefined) { fields.push('target_traits = ?'); params.push(data.targetTraits ? JSON.stringify(data.targetTraits) : null); }
    if (data.fruitCount !== undefined) { fields.push('fruit_count = ?'); params.push(data.fruitCount); }
    if (data.seedCount !== undefined) { fields.push('seed_count = ?'); params.push(data.seedCount); }
    if (data.pollinatedFlowerCount !== undefined) { fields.push('pollinated_flower_count = ?'); params.push(data.pollinatedFlowerCount); }
    // 2026-07-03 v3：无性繁殖字段
    if (data.motherPlantCode !== undefined) { fields.push('mother_plant_code = ?'); params.push(data.motherPlantCode); }
    if (data.propagationMethod !== undefined) { fields.push('propagation_method = ?'); params.push(data.propagationMethod); }
    if (data.inoculationCount !== undefined) { fields.push('inoculation_count = ?'); params.push(data.inoculationCount); }
    if (data.survivalCount !== undefined) { fields.push('survival_count = ?'); params.push(data.survivalCount); }
    if (data.reproductionMode !== undefined) { fields.push('reproduction_mode = ?'); params.push(data.reproductionMode); }
    if (fields.length === 0) {
      return res.json({ success: true, data: { id: recordId, message: '无字段更新' } });
    }
    params.push(recordId, id);
    const upd = db.prepare(`UPDATE planting_breeding_records SET ${fields.join(', ')} WHERE id = ? AND planting_id = ?`);
    upd.run(params as (string | number | null)[]);
    upd.free();
    saveDatabase();
    // 2026-07-22：追溯修复 - 必须在 return 之前调用
    writeAuditLog({
      businessType: 'planting.breeding',
      businessId: req.params.id,
      action: 'breeding',
      operatorName: (req as any).user?.name,
      opinion: `更新育种记录 ${recordId}`,
    });
    return res.json({ success: true, data: { id: recordId } });
  } catch (err) {
    console.error('[PUT breeding-records] error:', err);
    return res.status(500).json({ success: false, error: '更新失败' });
  }
});

/**
 * DELETE /api/plantings/:id/breeding-records/:recordId
 */
router.delete('/:id/breeding-records/:recordId', (req: Request, res: Response) => {
  ensureTables();
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();
    const del = db.prepare(`DELETE FROM planting_breeding_records WHERE id = ? AND planting_id = ?`);
    del.run([recordId, id]);
    del.free();
    saveDatabase();
    // 2026-07-22：追溯修复 - 必须在 return 之前调用
    writeAuditLog({
      businessType: 'planting.breeding',
      businessId: req.params.id,
      action: 'breeding',
      operatorName: (req as any).user?.name,
      opinion: `删除育种记录 ${req.params.recordId}`,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE breeding-records] error:', err);
    return res.status(500).json({ success: false, error: '删除失败' });
  }
});

// ============ 留种记录 CRUD ============

/**
 * GET /api/plantings/:id/seed-saving-records
 */
router.get('/:id/seed-saving-records', (req: Request, res: Response) => {
  ensureTables();
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT * FROM planting_seed_saving_records WHERE planting_id = ? ORDER BY record_date DESC, create_time DESC`
    );
    stmt.bind([id]);
    const rows: unknown[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET seed-saving-records] error:', err);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
});

/**
 * POST /api/plantings/:id/seed-saving-records
 */
router.post('/:id/seed-saving-records', (req: Request, res: Response) => {
  ensureTables();
  try {
    const { id } = req.params;
    const parsed = SeedSavingRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = (parsed.error as unknown as { issues?: Array<{ message?: string }> }).issues || [];
      return res.status(400).json({ success: false, error: issues[0]?.message || '参数错误' });
    }
    const data = parsed.data;
    // 2026-07-03 v4：判断保存模式
    const VEGETATIVE_PARTS = ['tuber', 'bulb', 'corm', 'rhizome', 'cutting', 'stolon', 'root', 'stem', 'leaf']
    const preservationMode = data.preservationMode || (VEGETATIVE_PARTS.includes(data.harvestPart || '') ? 'vegetative' : 'seed')
    // 业务校验
    if (preservationMode === 'seed' && data.germinationRate === undefined && data.thousandSeedWeight === undefined) {
      // 种子模式建议填发芽率或千粒重（软校验，不拒绝）
    }
    if (preservationMode === 'vegetative' && !data.sizeGrade && !data.healthStatus) {
      // 营养体模式建议填规格或检疫（软校验）
    }
    const db = getDatabase();
    // 校验种植存在
    const pStmt = db.prepare(`SELECT id FROM plantings WHERE id = ?`);
    pStmt.bind([id]);
    const exists = pStmt.step();
    pStmt.free();
    if (!exists) {
      return res.status(404).json({ success: false, error: '种植记录不存在' });
    }
    const recordId = generateRecordId('SR', data.recordDate);
    const ins = db.prepare(
      `INSERT INTO planting_seed_saving_records (
        id, planting_id, record_date, plant_marker, harvest_part,
        quantity, unit, operator, remarks,
        preservation_mode, lot_number, purpose, processing_method, storage_location, container_type,
        germination_rate, thousand_seed_weight, purity, moisture_content, seed_treatment, maturity_stage,
        size_grade, bud_node_count, health_status, dormancy_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    ins.run([
      recordId, id, data.recordDate, data.plantMarker, data.harvestPart || null,
      data.quantity ?? null, data.unit || null, data.operator || null, data.remarks || null,
      // v4：保存模式 + 共享字段
      preservationMode || null, data.lotNumber || null, data.purpose || null,
      data.processingMethod || null, data.storageLocation || null, data.containerType || null,
      // v4：种子字段
      data.germinationRate ?? null, data.thousandSeedWeight ?? null,
      data.purity ?? null, data.moistureContent ?? null,
      data.seedTreatment || null, data.maturityStage || null,
      // v4：营养体字段
      data.sizeGrade || null, data.budNodeCount ?? null,
      data.healthStatus || null, data.dormancyState || null,
    ]);
    ins.free();
    saveDatabase();
    // 2026-07-22：追溯修复 - 必须在 return 之前调用
    writeAuditLog({
      businessType: 'planting.seed_saving',
      businessId: req.params.id,
      action: 'seed_saving',
      operatorName: (req as any).user?.name,
      opinion: `添加留种记录 ${recordId}`,
    });
    return res.json({ success: true, data: { id: recordId } });
  } catch (err) {
    console.error('[POST seed-saving-records] error:', err);
    return res.status(500).json({ success: false, error: '创建失败' });
  }
});

/**
 * PUT /api/plantings/:id/seed-saving-records/:recordId
 */
router.put('/:id/seed-saving-records/:recordId', (req: Request, res: Response) => {
  ensureTables();
  try {
    const { id, recordId } = req.params;
    const parsed = UpdateSeedSavingRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }
    const data = parsed.data;
    const db = getDatabase();
    const cStmt = db.prepare(`SELECT id FROM planting_seed_saving_records WHERE id = ? AND planting_id = ?`);
    cStmt.bind([recordId, id]);
    const exists = cStmt.step();
    cStmt.free();
    if (!exists) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    const fields: string[] = [];
    const params: unknown[] = [];
    if (data.recordDate !== undefined) { fields.push('record_date = ?'); params.push(data.recordDate); }
    if (data.plantMarker !== undefined) { fields.push('plant_marker = ?'); params.push(data.plantMarker); }
    if (data.harvestPart !== undefined) { fields.push('harvest_part = ?'); params.push(data.harvestPart); }
    if (data.quantity !== undefined) { fields.push('quantity = ?'); params.push(data.quantity); }
    if (data.unit !== undefined) { fields.push('unit = ?'); params.push(data.unit); }
    if (data.operator !== undefined) { fields.push('operator = ?'); params.push(data.operator); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); params.push(data.remarks); }
    // 2026-07-03 v4：保存模式 + 共享字段
    if (data.preservationMode !== undefined) { fields.push('preservation_mode = ?'); params.push(data.preservationMode); }
    if (data.lotNumber !== undefined) { fields.push('lot_number = ?'); params.push(data.lotNumber); }
    if (data.purpose !== undefined) { fields.push('purpose = ?'); params.push(data.purpose); }
    if (data.processingMethod !== undefined) { fields.push('processing_method = ?'); params.push(data.processingMethod); }
    if (data.storageLocation !== undefined) { fields.push('storage_location = ?'); params.push(data.storageLocation); }
    if (data.containerType !== undefined) { fields.push('container_type = ?'); params.push(data.containerType); }
    // v4：种子字段
    if (data.germinationRate !== undefined) { fields.push('germination_rate = ?'); params.push(data.germinationRate); }
    if (data.thousandSeedWeight !== undefined) { fields.push('thousand_seed_weight = ?'); params.push(data.thousandSeedWeight); }
    if (data.purity !== undefined) { fields.push('purity = ?'); params.push(data.purity); }
    if (data.moistureContent !== undefined) { fields.push('moisture_content = ?'); params.push(data.moistureContent); }
    if (data.seedTreatment !== undefined) { fields.push('seed_treatment = ?'); params.push(data.seedTreatment); }
    if (data.maturityStage !== undefined) { fields.push('maturity_stage = ?'); params.push(data.maturityStage); }
    // v4：营养体字段
    if (data.sizeGrade !== undefined) { fields.push('size_grade = ?'); params.push(data.sizeGrade); }
    if (data.budNodeCount !== undefined) { fields.push('bud_node_count = ?'); params.push(data.budNodeCount); }
    if (data.healthStatus !== undefined) { fields.push('health_status = ?'); params.push(data.healthStatus); }
    if (data.dormancyState !== undefined) { fields.push('dormancy_state = ?'); params.push(data.dormancyState); }
    if (fields.length === 0) {
      return res.json({ success: true, data: { id: recordId, message: '无字段更新' } });
    }
    params.push(recordId, id);
    const upd = db.prepare(`UPDATE planting_seed_saving_records SET ${fields.join(', ')} WHERE id = ? AND planting_id = ?`);
    upd.run(params as (string | number | null)[]);
    upd.free();
    saveDatabase();
    // 2026-07-22：追溯修复 - 必须在 return 之前调用
    writeAuditLog({
      businessType: 'planting.seed_saving',
      businessId: req.params.id,
      action: 'seed_saving',
      operatorName: (req as any).user?.name,
      opinion: `更新留种记录 ${recordId}`,
    });
    return res.json({ success: true, data: { id: recordId } });
  } catch (err) {
    console.error('[PUT seed-saving-records] error:', err);
    return res.status(500).json({ success: false, error: '更新失败' });
  }
});

/**
 * DELETE /api/plantings/:id/seed-saving-records/:recordId
 */
router.delete('/:id/seed-saving-records/:recordId', (req: Request, res: Response) => {
  ensureTables();
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();
    const del = db.prepare(`DELETE FROM planting_seed_saving_records WHERE id = ? AND planting_id = ?`);
    del.run([recordId, id]);
    del.free();
    saveDatabase();
    // 2026-07-22：追溯修复 - 必须在 return 之前调用
    writeAuditLog({
      businessType: 'planting.seed_saving',
      businessId: req.params.id,
      action: 'seed_saving',
      operatorName: (req as any).user?.name,
      opinion: `删除留种记录 ${req.params.recordId}`,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE seed-saving-records] error:', err);
    return res.status(500).json({ success: false, error: '删除失败' });
  }
});

export default router;
