/**
 * 病虫害防治记录 API 路由
 * V12.0 新增
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/** 生成记录编号 BY+年月日-4位流水号 */
function generateRecordCode(db: any): string {
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `BY${datePrefix}`;
  const allCodes = queryToObjects<{ recordCode: string }>(db,
    `SELECT record_code FROM pesticide_records`,
  );
  let maxSeq = 0;
  for (const row of allCodes) {
    const code = row.recordCode || '';
    if (code.startsWith(prefix)) {
      const seq = parseInt(code.split('-').pop() || '0', 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** GET /api/pest-records/generate-code */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const code = generateRecordCode(db);
    res.json({ success: true, data: { code } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/pest-records — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // 2026-07-10：移除 control_type 过滤；新增 pesticide_type 过滤（JSON 数组）
    const { pesticide_type, crop_name, greenhouse_name, start_date, end_date, operator_name, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    if (pesticide_type) {
      conditions.push(`EXISTS (SELECT 1 FROM json_each(pesticide_records.pesticide_type) WHERE json_each.value = ?)`);
      params.push(pesticide_type);
    }
    if (crop_name) { conditions.push("crop_name LIKE '%' || ? || '%'"); params.push(crop_name); }
    if (greenhouse_name) { conditions.push("greenhouse_name LIKE '%' || ? || '%'"); params.push(greenhouse_name); }
    if (start_date) { conditions.push('spray_time >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('spray_time <= ?'); params.push(`${end_date} 23:59:59`); }
    if (operator_name) { conditions.push("operator_name LIKE '%' || ? || '%'"); params.push(operator_name); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM pesticide_records ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM pesticide_records ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/pest-records — 新增 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body;
    // 2026-07-10：取消 control_type 必填，仅校验防治日期 + 作物名称
    if (!body.sprayTime || !body.cropName) {
      res.status(400).json({ success: false, error: '防治日期、作物名称为必填项' });
      return;
    }
    // pesticideType 支持数组/字符串/JSON
    let pesticideTypeValue: string | null = null;
    if (Array.isArray(body.pesticideType) && body.pesticideType.length > 0) {
      pesticideTypeValue = JSON.stringify(body.pesticideType);
    } else if (typeof body.pesticideType === 'string' && body.pesticideType.trim()) {
      pesticideTypeValue = body.pesticideType.trim().startsWith('[') ? body.pesticideType : JSON.stringify([body.pesticideType]);
    }
    const code = generateRecordCode(db);
    const now = new Date().toISOString();
    const id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 2026-07-10：移除 control_type 列写入
    db.run(`INSERT INTO pesticide_records (
      id, record_code, spray_time, operator_id, operator_name, crop_name, greenhouse_name,
      planting_id, planting_code, seedling_id, seedling_code,
      pesticide_id, pesticide_name, pesticide_type, spec_id, spec_content,
      dosage, dosage_unit, dilution_ratio, target_pest, application_method,
      bio_agent_id, bio_agent_name, bio_agent_type,
      equipment_name, equipment_count,
      pesticide_list, bio_agent_list, equipment_list,
      use_leaf_fertilizer, leaf_fertilizer_name, leaf_fertilizer_dosage, leaf_fertilizer_unit,
      leaf_fertilizer_list,
      description, photos, status, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, code, body.sprayTime, body.operatorId || null, body.operatorName || null, body.cropName,
       body.greenhouseName || null,
       body.plantingId || null, body.plantingCode || null, body.seedlingId || null, body.seedlingCode || null,
       body.pesticideId || null, body.pesticideName || null,
       pesticideTypeValue, body.specId || null, body.specContent || null,
       body.dosage || null, body.dosageUnit || null, body.dilutionRatio || null,
       body.targetPest || null, body.applicationMethod || null,
       body.bioAgentId || null, body.bioAgentName || null, body.bioAgentType || null,
       body.equipmentName || null, body.equipmentCount || null,
       body.pesticideList || null, body.bioAgentList || null, body.equipmentList || null,
       body.useLeafFertilizer || 'no', body.leafFertilizerName || null,
       body.leafFertilizerDosage || null, body.leafFertilizerUnit || null,
       body.leafFertilizerList || null,
       body.description || null, body.photos || null, body.status || 'completed', now, now]
    );

    const items = queryToObjects(db, `SELECT * FROM pesticide_records WHERE record_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/pest-records/stats — 统计分析 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { start_date, end_date, crop_name } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];
    if (start_date) { conditions.push('spray_time >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('spray_time <= ?'); params.push(`${end_date} 23:59:59`); }
    if (crop_name) { conditions.push('crop_name = ?'); params.push(crop_name); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2026-07-10：移除 control_type 字段；按 pesticide_type（JSON 数组）展开后分组统计
    const items = queryToObjects(db,
      `SELECT json_each.value as label, COUNT(DISTINCT pesticide_records.id) as record_count
       FROM pesticide_records, json_each(pesticide_records.pesticide_type)
       ${whereClause} GROUP BY json_each.value ORDER BY record_count DESC`, params
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/pest-records/:id — 单条记录 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const items = queryToObjects(db, `SELECT * FROM pesticide_records WHERE id = ?`, [id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }
    res.json({ success: true, data: items[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/pest-records/:id — 更新 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pesticide_records WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }

    const now = new Date().toISOString();
    // 2026-07-10：移除 control_type 列；pesticideType 支持数组/字符串
    let pesticideTypeValue: string | null | undefined = undefined;
    if (Array.isArray(body.pesticideType)) {
      pesticideTypeValue = body.pesticideType.length > 0 ? JSON.stringify(body.pesticideType) : null;
    } else if (typeof body.pesticideType === 'string') {
      pesticideTypeValue = body.pesticideType.trim().startsWith('[') ? body.pesticideType : JSON.stringify([body.pesticideType]);
    }
    db.run(`UPDATE pesticide_records SET
      spray_time=?, operator_name=?, crop_name=?, greenhouse_name=?,
      planting_id=?, planting_code=?, seedling_id=?, seedling_code=?,
      pesticide_id=?, pesticide_name=?, pesticide_type=?, spec_id=?, spec_content=?,
      dosage=?, dosage_unit=?, dilution_ratio=?, target_pest=?, application_method=?,
      bio_agent_id=?, bio_agent_name=?, bio_agent_type=?,
      equipment_name=?, equipment_count=?,
      pesticide_list=?, bio_agent_list=?, equipment_list=?,
      use_leaf_fertilizer=?, leaf_fertilizer_name=?, leaf_fertilizer_dosage=?, leaf_fertilizer_unit=?,
      leaf_fertilizer_list=?,
      description=?, photos=?, update_time=? WHERE id=?`,
      [body.sprayTime ?? existing[0].spray_time, body.operatorName ?? existing[0].operator_name,
       body.cropName ?? existing[0].crop_name, body.greenhouseName ?? existing[0].greenhouse_name,
       body.plantingId ?? existing[0].planting_id, body.plantingCode ?? existing[0].planting_code,
       body.seedlingId ?? existing[0].seedling_id, body.seedlingCode ?? existing[0].seedling_code,
       body.pesticideId ?? existing[0].pesticide_id, body.pesticideName ?? existing[0].pesticide_name,
       pesticideTypeValue !== undefined ? pesticideTypeValue : existing[0].pesticide_type,
       body.specId ?? existing[0].spec_id,
       body.specContent ?? existing[0].spec_content,
       body.dosage ?? existing[0].dosage, body.dosageUnit ?? existing[0].dosage_unit,
       body.dilutionRatio ?? existing[0].dilution_ratio, body.targetPest ?? existing[0].target_pest,
       body.applicationMethod ?? existing[0].application_method,
       body.bioAgentId ?? existing[0].bio_agent_id, body.bioAgentName ?? existing[0].bio_agent_name,
       body.bioAgentType ?? existing[0].bio_agent_type,
       body.equipmentName ?? existing[0].equipment_name, body.equipmentCount ?? existing[0].equipment_count,
       body.pesticideList ?? existing[0].pesticide_list, body.bioAgentList ?? existing[0].bio_agent_list,
       body.equipmentList ?? existing[0].equipment_list,
       body.useLeafFertilizer ?? existing[0].use_leaf_fertilizer,
       body.leafFertilizerName ?? existing[0].leaf_fertilizer_name,
       body.leafFertilizerDosage ?? existing[0].leaf_fertilizer_dosage,
       body.leafFertilizerUnit ?? existing[0].leaf_fertilizer_unit,
       body.leafFertilizerList ?? existing[0].leaf_fertilizer_list,
       body.description ?? existing[0].description, body.photos ?? existing[0].photos,
       now, id]
    );
    const updated = queryToObjects(db, `SELECT * FROM pesticide_records WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/pest-records/:id — 删除 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pesticide_records WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }
    db.run(`DELETE FROM pesticide_records WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/pest-records/batch-delete — 批量删除 */
router.post('/batch-delete', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: '请提供要删除的记录ID数组' });
      return;
    }
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM pesticide_records WHERE id IN (${placeholders})`, ids);
    saveDatabase();
    res.json({ success: true, data: { deleted: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
