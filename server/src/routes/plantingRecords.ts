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

const router = Router();
router.use(authenticate);

// ============ Zod Schemas ============

const BreedingOperationType = z.enum(['cross', 'self', 'selection', 'backcross', 'marker', 'other']);
const SeedSavingPart = z.enum(['fruit', 'seed', 'whole_plant', 'root', 'stem', 'leaf', 'other']);

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
});

const SeedSavingRecordSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式 YYYY-MM-DD'),
  plantMarker: z.string().min(1, '留种株号必填'),
  harvestPart: SeedSavingPart.optional().nullable(),
  quantity: z.number().nonnegative().optional().nullable(),
  unit: z.string().optional().nullable(),
  operator: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
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
      create_time TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    )
  `);
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
      create_time TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE CASCADE
    )
  `);
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
    // 业务规则：杂交/回交 时父本必填
    if ((data.operationType === 'cross' || data.operationType === 'backcross') && !data.parentMaleCode) {
      return res.status(400).json({ success: false, error: '杂交/回交时父本编码必填' });
    }
    // 父本 ≠ 母本
    if (data.parentMaleCode && data.parentFemaleCode && data.parentMaleCode === data.parentFemaleCode) {
      return res.status(400).json({ success: false, error: '父本编码不能与母本编码相同' });
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
        operator, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    ins.run([
      recordId, id, data.recordDate, data.operationType, data.generation || null,
      data.parentMaleCode || null, data.parentMaleSource || null,
      data.parentFemaleCode || null, data.parentFemaleSource || null,
      data.operator || null, data.remarks || null,
    ]);
    ins.free();
    saveDatabase();
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
    if (fields.length === 0) {
      return res.json({ success: true, data: { id: recordId, message: '无字段更新' } });
    }
    params.push(recordId, id);
    const upd = db.prepare(`UPDATE planting_breeding_records SET ${fields.join(', ')} WHERE id = ? AND planting_id = ?`);
    upd.run(params as (string | number | null)[]);
    upd.free();
    saveDatabase();
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
        quantity, unit, operator, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    ins.run([
      recordId, id, data.recordDate, data.plantMarker, data.harvestPart || null,
      data.quantity ?? null, data.unit || null, data.operator || null, data.remarks || null,
    ]);
    ins.free();
    saveDatabase();
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
    if (fields.length === 0) {
      return res.json({ success: true, data: { id: recordId, message: '无字段更新' } });
    }
    params.push(recordId, id);
    const upd = db.prepare(`UPDATE planting_seed_saving_records SET ${fields.join(', ')} WHERE id = ? AND planting_id = ?`);
    upd.run(params as (string | number | null)[]);
    upd.free();
    saveDatabase();
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
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE seed-saving-records] error:', err);
    return res.status(500).json({ success: false, error: '删除失败' });
  }
});

export default router;
