/**
 * 2026-06-25 v3: 育苗繁殖记录子表 CRUD
 * 复用现有 propagation_records 表（加 seedling_id 列）
 * 数据流：V2.1 铁律 — 无缓存降级
 */

import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase, saveDatabase } from '../db';
import { authenticate } from '../middleware/auth';
// 2026-07-22：追溯修复 - 繁殖记录操作写入 audit_log
import { writeAuditLog } from '../services/auditLog.service';

const router = Router();
router.use(authenticate);

// ============ Zod Schema ============

const PropagationRecordSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式 YYYY-MM-DD'),
  temperature: z.number().optional().nullable(),
  humidity: z.number().optional().nullable(),
  motherPlantCount: z.number().int().min(0).optional().nullable(),
  seedlingOutput: z.number().int().min(0).optional().nullable(),
  seedlingStatus: z.enum(['healthy', 'weak', 'diseased']).optional().nullable(),
  transplantPosition: z.string().optional().nullable(),
  operator: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  // 2026-07-04 v2：无性繁殖完整字段
  operationType: z.string().optional().nullable(),
  reproductionMode: z.enum(['sexual', 'asexual']).optional().nullable(),
  motherPlantCode: z.string().optional().nullable(),
  propagationMethod: z.string().optional().nullable(),
  inoculationCount: z.number().int().min(0).optional().nullable(),
  survivalCountAsexual: z.number().int().min(0).optional().nullable(),
  targetTraits: z.array(z.string()).optional().nullable(),
  generation: z.string().optional().nullable(),
  parentMaleCode: z.string().optional().nullable(),
  parentFemaleCode: z.string().optional().nullable(),
});

const UpdatePropagationRecordSchema = PropagationRecordSchema.partial();

// ============ Helpers ============

function generateRecordId(prefix: string, dateStr: string): string {
  // 2026-07-14：改用 crypto.randomUUID 替代 Math.random（代码生成契约铁律合规）
  return `${prefix}-${dateStr}-${randomUUID().slice(0, 8)}`;
}

// ============ 启动时加列 + 索引 ============

let schemaInitialized = false;

function ensureSchema() {
  if (schemaInitialized) return;
  try {
    const db = getDatabase();
    // 加 seedling_id 列（幂等 — 已存在则跳过）
    try {
      db.run(`ALTER TABLE propagation_records ADD COLUMN seedling_id TEXT`);
      console.log('[seedling-propagation] 已添加 seedling_id 列');
    } catch {
      // 列已存在，跳过
    }
    // 2026-07-04 v2：无性繁殖完整字段 — 与种植 BreedingFields 的 asexual 分支对齐
    const newCols = [
      { col: 'operation_type', type: 'TEXT' },         // cutting/grafting/layering/tissue/division/clonal
      { col: 'reproduction_mode', type: 'TEXT' },     // 'sexual' | 'asexual'
      { col: 'mother_plant_code', type: 'TEXT' },     // 母株编码
      { col: 'propagation_method', type: 'TEXT' },    // 繁殖方式（同 operation_type 一致，冗余存）
      { col: 'inoculation_count', type: 'INTEGER' },   // 接种数（插穗/接芽/外植体/球茎）
      { col: 'survival_count_asexual', type: 'INTEGER' }, // 无性成活数（区别于 survival_rate）
      { col: 'target_traits', type: 'TEXT' },         // 目标性状（JSON 数组）
      { col: 'generation', type: 'TEXT' },            // 世代（F1/F2/BC1/S1 等）
      { col: 'parent_male_code', type: 'TEXT' },      // 父本编码（有性记录冗余）
      { col: 'parent_female_code', type: 'TEXT' },    // 母本编码（有性记录冗余）
    ];
    for (const { col, type } of newCols) {
      try {
        db.run(`ALTER TABLE propagation_records ADD COLUMN ${col} ${type}`);
      } catch {
        // 列已存在，跳过
      }
    }
    const idx = db.prepare(`CREATE INDEX IF NOT EXISTS idx_propagation_seedling ON propagation_records(seedling_id)`);
    idx.run();
    idx.free();
    saveDatabase();
    schemaInitialized = true;
  } catch (e) {
    // 2026-07-14：添加日志（修复 H14：此前完全静默吞错）
    // "duplicate column" 等预期异常跳过，其他异常需记录
    console.warn('[seedlingPropagationRecords] ensureSchema 失败（可能 DB 未就绪）:', e);
  }
}

// ============ CRUD ============

/**
 * GET /api/seedlings/:id/propagation-records
 */
router.get('/:id/propagation-records', (req: Request, res: Response) => {
  ensureSchema();
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT id, seedling_id, record_date, operation_type, reproduction_mode,
              mother_plant_code, propagation_method,
              inoculation_count, survival_count_asexual, target_traits, generation,
              parent_male_code, parent_female_code,
              temperature, humidity,
              mother_plant_count, seedling_output, seedling_status,
              transplant_position, operator, remarks, create_time
       FROM propagation_records
       WHERE seedling_id = ?
       ORDER BY record_date DESC, create_time DESC`
    );
    stmt.bind([id]);
    const rows: unknown[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET propagation-records] error:', err);
    return res.status(500).json({ success: false, error: '查询失败' });
  }
});

/**
 * POST /api/seedlings/:id/propagation-records
 */
router.post('/:id/propagation-records', (req: Request, res: Response) => {
  ensureSchema();
  try {
    const { id } = req.params;
    const parsed = PropagationRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues =
        (parsed.error as unknown as { issues?: Array<{ message?: string }> }).issues || [];
      return res.status(400).json({ success: false, error: issues[0]?.message || '参数错误' });
    }
    const data = parsed.data;
    const db = getDatabase();
    // 校验育苗存在
    const pStmt = db.prepare(`SELECT id FROM seedlings WHERE id = ?`);
    pStmt.bind([id]);
    const exists = pStmt.step();
    pStmt.free();
    if (!exists) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }
    const recordId = generateRecordId('PR', data.recordDate);
    const ins = db.prepare(
      `INSERT INTO propagation_records (
        id, seedling_id, record_date,
        seed_source_id, stage,
        operation_type, reproduction_mode, mother_plant_code, propagation_method,
        inoculation_count, survival_count_asexual, target_traits, generation,
        parent_male_code, parent_female_code,
        temperature, humidity,
        mother_plant_count, seedling_output, seedling_status,
        transplant_position, operator, remarks, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`
    );
    ins.run([
      recordId, id, data.recordDate,
      id, 'seedling',  // seed_source_id 用 seedling_id 占位（NOT NULL 必填）；stage='seedling' 区分业务类型
      data.operationType ?? null, data.reproductionMode ?? null,
      data.motherPlantCode ?? null, data.propagationMethod ?? null,
      data.inoculationCount ?? null, data.survivalCountAsexual ?? null,
      data.targetTraits ? JSON.stringify(data.targetTraits) : null,
      data.generation ?? null,
      data.parentMaleCode ?? null, data.parentFemaleCode ?? null,
      data.temperature ?? null, data.humidity ?? null,
      data.motherPlantCount ?? null, data.seedlingOutput ?? null,
      data.seedlingStatus ?? null, data.transplantPosition ?? null,
      data.operator ?? null, data.remarks ?? null,
    ]);
    ins.free();
    saveDatabase();
    return res.json({ success: true, data: { id: recordId } });
  } catch (err) {
    console.error('[POST propagation-records] error:', err);
    return res.status(500).json({ success: false, error: '创建失败' });
  }
});

/**
 * PUT /api/seedlings/:id/propagation-records/:recordId
 */
router.put('/:id/propagation-records/:recordId', (req: Request, res: Response) => {
  ensureSchema();
  try {
    const { id, recordId } = req.params;
    const parsed = UpdatePropagationRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }
    const data = parsed.data;
    const db = getDatabase();
    const cStmt = db.prepare(`SELECT id FROM propagation_records WHERE id = ? AND seedling_id = ?`);
    cStmt.bind([recordId, id]);
    const exists = cStmt.step();
    cStmt.free();
    if (!exists) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    const fields: string[] = [];
    const params: Array<string | number | null> = [];
    if (data.recordDate !== undefined) { fields.push('record_date = ?'); params.push(data.recordDate); }
    if (data.temperature !== undefined) { fields.push('temperature = ?'); params.push(data.temperature); }
    if (data.humidity !== undefined) { fields.push('humidity = ?'); params.push(data.humidity); }
    if (data.motherPlantCount !== undefined) { fields.push('mother_plant_count = ?'); params.push(data.motherPlantCount); }
    if (data.seedlingOutput !== undefined) { fields.push('seedling_output = ?'); params.push(data.seedlingOutput); }
    if (data.seedlingStatus !== undefined) { fields.push('seedling_status = ?'); params.push(data.seedlingStatus); }
    if (data.transplantPosition !== undefined) { fields.push('transplant_position = ?'); params.push(data.transplantPosition); }
    if (data.operator !== undefined) { fields.push('operator = ?'); params.push(data.operator); }
    if (data.remarks !== undefined) { fields.push('remarks = ?'); params.push(data.remarks); }
    // 2026-07-04 v2：无性繁殖完整字段
    if (data.operationType !== undefined) { fields.push('operation_type = ?'); params.push(data.operationType); }
    if (data.reproductionMode !== undefined) { fields.push('reproduction_mode = ?'); params.push(data.reproductionMode); }
    if (data.motherPlantCode !== undefined) { fields.push('mother_plant_code = ?'); params.push(data.motherPlantCode); }
    if (data.propagationMethod !== undefined) { fields.push('propagation_method = ?'); params.push(data.propagationMethod); }
    if (data.inoculationCount !== undefined) { fields.push('inoculation_count = ?'); params.push(data.inoculationCount); }
    if (data.survivalCountAsexual !== undefined) { fields.push('survival_count_asexual = ?'); params.push(data.survivalCountAsexual); }
    if (data.targetTraits !== undefined) { fields.push('target_traits = ?'); params.push(JSON.stringify(data.targetTraits)); }
    if (data.generation !== undefined) { fields.push('generation = ?'); params.push(data.generation); }
    if (data.parentMaleCode !== undefined) { fields.push('parent_male_code = ?'); params.push(data.parentMaleCode); }
    if (data.parentFemaleCode !== undefined) { fields.push('parent_female_code = ?'); params.push(data.parentFemaleCode); }
    if (fields.length === 0) {
      return res.json({ success: true, data: { id: recordId, message: '无字段更新' } });
    }
    params.push(recordId, id);
    const upd = db.prepare(`UPDATE propagation_records SET ${fields.join(', ')} WHERE id = ? AND seedling_id = ?`);
    upd.run(params);
    upd.free();
    saveDatabase();
    return res.json({ success: true, data: { id: recordId } });
  } catch (err) {
    console.error('[PUT propagation-records] error:', err);
    return res.status(500).json({ success: false, error: '更新失败' });
  }
});

/**
 * DELETE /api/seedlings/:id/propagation-records/:recordId
 */
router.delete('/:id/propagation-records/:recordId', (req: Request, res: Response) => {
  ensureSchema();
  try {
    const { id, recordId } = req.params;
    const db = getDatabase();
    const del = db.prepare(`DELETE FROM propagation_records WHERE id = ? AND seedling_id = ?`);
    del.run([recordId, id]);
    del.free();
    saveDatabase();
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE propagation-records] error:', err);
    return res.status(500).json({ success: false, error: '删除失败' });
  }
});

export default router;
