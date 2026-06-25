/**
 * 2026-06-25 v3: 育苗繁殖记录子表 CRUD
 * 复用现有 propagation_records 表（加 seedling_id 列）
 * 数据流：V2.1 铁律 — 无缓存降级
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase, saveDatabase } from '../db';
import { authenticate } from '../middleware/auth';

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
});

const UpdatePropagationRecordSchema = PropagationRecordSchema.partial();

// ============ Helpers ============

function generateRecordId(prefix: string, dateStr: string): string {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${dateStr}-${ts}${rand}`;
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
    const idx = db.prepare(`CREATE INDEX IF NOT EXISTS idx_propagation_seedling ON propagation_records(seedling_id)`);
    idx.run();
    idx.free();
    saveDatabase();
    schemaInitialized = true;
  } catch {
    // DB 尚未就绪，延迟初始化
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
      `SELECT id, seedling_id, record_date, temperature, humidity,
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
        id, seedling_id, record_date, temperature, humidity,
        mother_plant_count, seedling_output, seedling_status,
        transplant_position, operator, remarks, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`
    );
    ins.run([
      recordId, id, data.recordDate,
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
