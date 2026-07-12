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
    // 2026-07-12：项目契约是「前端 store 的 denormalize 已把 body 转 snake_case」，
    // 后端必须按 snake_case 读 body（不能读 camelCase，否则所有字段都是 undefined）。
    // curl 直测 / 本地调试时可手动传 camelCase 不经 denormalize，所以兼容两种命名。
    const sprayTime = body.spray_time ?? body.sprayTime;
    const cropName = body.crop_name ?? body.cropName;
    // 2026-07-10：取消 control_type 必填，仅校验防治日期 + 作物名称
    if (!sprayTime || !cropName) {
      res.status(400).json({ success: false, error: '防治日期、作物名称为必填项' });
      return;
    }
    // pesticide_type 支持数组/字符串/JSON
    let pesticideTypeValue: string | null = null;
    const pesticideTypeRaw = body.pesticide_type ?? body.pesticideType;
    if (Array.isArray(pesticideTypeRaw) && pesticideTypeRaw.length > 0) {
      pesticideTypeValue = JSON.stringify(pesticideTypeRaw);
    } else if (typeof pesticideTypeRaw === 'string' && pesticideTypeRaw.trim()) {
      pesticideTypeValue = pesticideTypeRaw.trim().startsWith('[') ? pesticideTypeRaw : JSON.stringify([pesticideTypeRaw]);
    }
    const code = generateRecordCode(db);
    const now = new Date().toISOString();
    const id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 2026-07-12：所有 body 字段按 snake_case 读，兼容 camelCase（curl 调试）
    const get = (snake: string, camel: string) => body[snake] ?? body[camel];

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
      [id, code, sprayTime,
       get('operator_id', 'operatorId') || null, get('operator_name', 'operatorName') || null,
       cropName, get('greenhouse_name', 'greenhouseName') || null,
       get('planting_id', 'plantingId') || null, get('planting_code', 'plantingCode') || null,
       get('seedling_id', 'seedlingId') || null, get('seedling_code', 'seedlingCode') || null,
       get('pesticide_id', 'pesticideId') || null, get('pesticide_name', 'pesticideName') || null,
       pesticideTypeValue,
       get('spec_id', 'specId') || null, get('spec_content', 'specContent') || null,
       get('dosage', 'dosage') || null, get('dosage_unit', 'dosageUnit') || null,
       get('dilution_ratio', 'dilutionRatio') || null,
       get('target_pest', 'targetPest') || null, get('application_method', 'applicationMethod') || null,
       get('bio_agent_id', 'bioAgentId') || null, get('bio_agent_name', 'bioAgentName') || null,
       get('bio_agent_type', 'bioAgentType') || null,
       get('equipment_name', 'equipmentName') || null, get('equipment_count', 'equipmentCount') || null,
       get('pesticide_list', 'pesticideList') || null,
       get('bio_agent_list', 'bioAgentList') || null,
       get('equipment_list', 'equipmentList') || null,
       get('use_leaf_fertilizer', 'useLeafFertilizer') || 'no',
       get('leaf_fertilizer_name', 'leafFertilizerName') || null,
       get('leaf_fertilizer_dosage', 'leafFertilizerDosage') || null,
       get('leaf_fertilizer_unit', 'leafFertilizerUnit') || null,
       get('leaf_fertilizer_list', 'leafFertilizerList') || null,
       get('description', 'description') || null, get('photos', 'photos') || null,
       get('status', 'status') || 'completed', now, now]
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
    // 2026-07-12：snake_case 优先，兼容 camelCase（curl 调试）
    const get = (snake: string, camel: string) => body[snake] ?? body[camel];
    // 2026-07-10：移除 control_type 列；pesticide_type 支持数组/字符串
    let pesticideTypeValue: string | null | undefined = undefined;
    const pesticideTypeRaw = body.pesticide_type ?? body.pesticideType;
    if (Array.isArray(pesticideTypeRaw)) {
      pesticideTypeValue = pesticideTypeRaw.length > 0 ? JSON.stringify(pesticideTypeRaw) : null;
    } else if (typeof pesticideTypeRaw === 'string') {
      pesticideTypeValue = pesticideTypeRaw.trim().startsWith('[') ? pesticideTypeRaw : JSON.stringify([pesticideTypeRaw]);
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
      [get('spray_time', 'sprayTime') ?? existing[0].spray_time,
       get('operator_name', 'operatorName') ?? existing[0].operator_name,
       get('crop_name', 'cropName') ?? existing[0].crop_name,
       get('greenhouse_name', 'greenhouseName') ?? existing[0].greenhouse_name,
       get('planting_id', 'plantingId') ?? existing[0].planting_id,
       get('planting_code', 'plantingCode') ?? existing[0].planting_code,
       get('seedling_id', 'seedlingId') ?? existing[0].seedling_id,
       get('seedling_code', 'seedlingCode') ?? existing[0].seedling_code,
       get('pesticide_id', 'pesticideId') ?? existing[0].pesticide_id,
       get('pesticide_name', 'pesticideName') ?? existing[0].pesticide_name,
       pesticideTypeValue !== undefined ? pesticideTypeValue : existing[0].pesticide_type,
       get('spec_id', 'specId') ?? existing[0].spec_id,
       get('spec_content', 'specContent') ?? existing[0].spec_content,
       get('dosage', 'dosage') ?? existing[0].dosage,
       get('dosage_unit', 'dosageUnit') ?? existing[0].dosage_unit,
       get('dilution_ratio', 'dilutionRatio') ?? existing[0].dilution_ratio,
       get('target_pest', 'targetPest') ?? existing[0].target_pest,
       get('application_method', 'applicationMethod') ?? existing[0].application_method,
       get('bio_agent_id', 'bioAgentId') ?? existing[0].bio_agent_id,
       get('bio_agent_name', 'bioAgentName') ?? existing[0].bio_agent_name,
       get('bio_agent_type', 'bioAgentType') ?? existing[0].bio_agent_type,
       get('equipment_name', 'equipmentName') ?? existing[0].equipment_name,
       get('equipment_count', 'equipmentCount') ?? existing[0].equipment_count,
       get('pesticide_list', 'pesticideList') ?? existing[0].pesticide_list,
       get('bio_agent_list', 'bioAgentList') ?? existing[0].bio_agent_list,
       get('equipment_list', 'equipmentList') ?? existing[0].equipment_list,
       get('use_leaf_fertilizer', 'useLeafFertilizer') ?? existing[0].use_leaf_fertilizer,
       get('leaf_fertilizer_name', 'leafFertilizerName') ?? existing[0].leaf_fertilizer_name,
       get('leaf_fertilizer_dosage', 'leafFertilizerDosage') ?? existing[0].leaf_fertilizer_dosage,
       get('leaf_fertilizer_unit', 'leafFertilizerUnit') ?? existing[0].leaf_fertilizer_unit,
       get('leaf_fertilizer_list', 'leafFertilizerList') ?? existing[0].leaf_fertilizer_list,
       get('description', 'description') ?? existing[0].description,
       get('photos', 'photos') ?? existing[0].photos,
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
