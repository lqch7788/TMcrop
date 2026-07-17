/**
 * 病虫害防治记录 API 路由
 * V12.0 新增
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/** 2026-07-17：错误脱敏 — 防止 SQL 错误（表结构/列名/约束名）泄露给前端
 *  - 开发环境返回原 message（NODE_ENV !== 'production'）
 *  - 生产环境返回脱敏文本 + 写入 server 日志供运维定位
 */
function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (process.env.NODE_ENV !== 'production') return raw;
  // 生产环境：保留错误类型前缀（让前端能区分类型），移除 SQL 细节
  const cleaned = raw
    .replace(/UNIQUE constraint failed: [^"]+/g, 'UNIQUE constraint failed')
    .replace(/no such column: [^ ]+/g, 'no such column')
    .replace(/no such table: [^ ]+/g, 'no such table')
    .replace(/constraint failed: [^)]+/g, 'constraint failed');
  console.error('[pesticideRecords]', raw);
  return cleaned;
}

/** 2026-07-17：6 个 JSON 字段读取时反序列化（前端 service 无需 JSON.parse）*/
const JSON_COLUMNS = ['pesticideType', 'pesticideList', 'bioAgentList', 'equipmentList', 'leafFertilizerList', 'photos'];
function parseJsonFieldsOnRead(row: any): any {
  if (!row) return row;
  const out = { ...row };
  for (const col of JSON_COLUMNS) {
    const v = out[col];
    if (typeof v === 'string' && v.trim()) {
      try {
        const parsed = JSON.parse(v);
        out[col] = Array.isArray(parsed) ? parsed : [];
      } catch {
        out[col] = [];
      }
    } else if (v == null) {
      out[col] = [];
    }
  }
  return out;
}

/** 生成记录编号 BY+年月日-4位流水号 */
function generateRecordCode(db: any): string {
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `BY${datePrefix}`;
  // 2026-07-17：MAX + LIKE prefix 走索引扫描（替代全表拉到 JS 端过滤，N=1万时性能显著）
  const maxRow = queryToObjects<{ record_code: string | null }>(db,
    `SELECT MAX(record_code) AS record_code FROM pesticide_records WHERE record_code LIKE ?`,
    [`${prefix}-%`]
  );
  let maxSeq = 0;
  const currentMax = maxRow[0]?.record_code;
  if (currentMax && currentMax.startsWith(prefix)) {
    const seq = parseInt(currentMax.split('-').pop() || '0', 10);
    if (!isNaN(seq)) maxSeq = seq;
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
    res.status(500).json({ success: false, error: sanitizeError(error) });
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
    // 2026-07-17：6 个 JSON 字段反序列化（前端无需 JSON.parse）
    const parsed = items.map((it: any) => parseJsonFieldsOnRead(it));
    res.json({ success: true, data: parsed, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: sanitizeError(error) });
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
    let code = generateRecordCode(db);
    // 提取日期前缀（BY20260717）用于 UNIQUE 重试时拼接新流水号
    const prefix = code.replace(/-\d{4,}$/, '');
    // 2026-07-17：本地时间戳（与表 DEFAULT datetime('now','localtime') 一致，避免 UTC 跨天错位）
    const now = (() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    })();
    const id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 2026-07-12：所有 body 字段按 snake_case 读，兼容 camelCase（curl 调试）
    const get = (snake: string, camel: string) => body[snake] ?? body[camel];

    // 2026-07-17：5 个 JSON 池字段 — 数组/对象转 JSON 字符串（防 sql.js 把数组当 BLOB 绑定丢失数据）
    const stringifyJsonField = (val: unknown): string | null => {
      if (val == null) return null;
      if (typeof val === 'string') return val.trim() || null;
      try { return JSON.stringify(val); } catch { return null; }
    };
    const pesticideListJson = stringifyJsonField(get('pesticide_list', 'pesticideList'));
    const bioAgentListJson = stringifyJsonField(get('bio_agent_list', 'bioAgentList'));
    const equipmentListJson = stringifyJsonField(get('equipment_list', 'equipmentList'));
    const leafFertilizerListJson = stringifyJsonField(get('leaf_fertilizer_list', 'leafFertilizerList'));
    const photosJson = stringifyJsonField(get('photos', 'photos'));

    // 2026-07-10：移除 control_type 列写入
    // 2026-07-17：移除 status 列写入（DB 列已 DROP，业务上防治记录无中间态）
    // 2026-07-17：UNIQUE 重试 — 并发 POST 同一 record_code 时第二个 INSERT 报 UNIQUE，自动递增 +1 重试（最多 5 次）
    const insertValues = [id, code, sprayTime,
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
       get('pesticide_list', 'pesticideList') !== undefined ? pesticideListJson : null,
       bioAgentListJson,
       equipmentListJson,
       get('use_leaf_fertilizer', 'useLeafFertilizer') || 'no',
       get('leaf_fertilizer_name', 'leafFertilizerName') || null,
       get('leaf_fertilizer_dosage', 'leafFertilizerDosage') || null,
       get('leaf_fertilizer_unit', 'leafFertilizerUnit') || null,
       leafFertilizerListJson,
       get('description', 'description') || null, photosJson,
       now, now];
    const insertSql = `INSERT INTO pesticide_records (
      id, record_code, spray_time, operator_id, operator_name, crop_name, greenhouse_name,
      planting_id, planting_code, seedling_id, seedling_code,
      pesticide_id, pesticide_name, pesticide_type, spec_id, spec_content,
      dosage, dosage_unit, dilution_ratio, target_pest, application_method,
      bio_agent_id, bio_agent_name, bio_agent_type,
      equipment_name, equipment_count,
      pesticide_list, bio_agent_list, equipment_list,
      use_leaf_fertilizer, leaf_fertilizer_name, leaf_fertilizer_dosage, leaf_fertilizer_unit,
      leaf_fertilizer_list,
      description, photos, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      try {
        db.run(insertSql, insertValues);
        inserted = true;
      } catch (e: any) {
        if (String(e?.message || '').includes('UNIQUE constraint failed') && attempt < 4) {
          // 并发写同 code — 自动递增 +1 重试
          const nextSeq = parseInt((code.split('-').pop() || '1'), 10) + 1;
          code = `${prefix}-${String(nextSeq).padStart(4, '0')}`;
          insertValues[1] = code;
          continue;
        }
        throw e;
      }
    }
    if (!inserted) throw new Error('记录编号生成冲突，已重试 5 次仍失败');

    const items = queryToObjects(db, `SELECT * FROM pesticide_records WHERE record_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] ? parseJsonFieldsOnRead(items[0]) : null });
  } catch (error) {
    res.status(500).json({ success: false, error: sanitizeError(error) });
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
    res.status(500).json({ success: false, error: sanitizeError(error) });
  }
});

/** GET /api/pest-records/:id — 单条记录 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const items = queryToObjects(db, `SELECT * FROM pesticide_records WHERE id = ?`, [id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }
    res.json({ success: true, data: parseJsonFieldsOnRead(items[0]) });
  } catch (error) {
    res.status(500).json({ success: false, error: sanitizeError(error) });
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

    // 2026-07-17：PUT 必填校验 — 防治日期/作物名称允许为空（保留原值）但显式校验字符串非空
    const getForValidate = (snake: string, camel: string) => body[snake] ?? body[camel];
    if ('spray_time' in body || 'sprayTime' in body) {
      const v = getForValidate('spray_time', 'sprayTime');
      if (v != null && typeof v !== 'string') {
        res.status(400).json({ success: false, error: 'spray_time/sprayTime 必须是字符串' });
        return;
      }
    }
    if ('crop_name' in body || 'cropName' in body) {
      const v = getForValidate('crop_name', 'cropName');
      if (v != null && typeof v !== 'string') {
        res.status(400).json({ success: false, error: 'crop_name/cropName 必须是字符串' });
        return;
      }
    }

    // 2026-07-17：本地时间戳（与表 DEFAULT datetime('now','localtime') 一致，避免 UTC 跨天错位）
    const now = (() => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    })();
    // 2026-07-12：snake_case 优先，兼容 camelCase（curl 调试）
    const get = (snake: string, camel: string) => body[snake] ?? body[camel];
    // 2026-07-17：5 个 JSON 池字段 — 数组/对象转 JSON 字符串（防 sql.js 把数组当 BLOB 绑定丢失数据）
    const stringifyJsonField = (val: unknown): string | null => {
      if (val == null) return null;
      if (typeof val === 'string') return val.trim() || null;
      try { return JSON.stringify(val); } catch { return null; }
    };
    const stringifyOrFallback = (val: unknown, fallback: unknown): string | null => {
      if (val === undefined) return fallback == null ? null : (typeof fallback === 'string' ? fallback : JSON.stringify(fallback));
      return stringifyJsonField(val);
    };
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
      [get('spray_time', 'sprayTime') ?? existing[0].sprayTime,
       get('operator_name', 'operatorName') ?? existing[0].operatorName,
       get('crop_name', 'cropName') ?? existing[0].cropName,
       get('greenhouse_name', 'greenhouseName') ?? existing[0].greenhouseName,
       get('planting_id', 'plantingId') ?? existing[0].plantingId,
       get('planting_code', 'plantingCode') ?? existing[0].plantingCode,
       get('seedling_id', 'seedlingId') ?? existing[0].seedlingId,
       get('seedling_code', 'seedlingCode') ?? existing[0].seedlingCode,
       get('pesticide_id', 'pesticideId') ?? existing[0].pesticideId,
       get('pesticide_name', 'pesticideName') ?? existing[0].pesticideName,
       pesticideTypeValue !== undefined ? pesticideTypeValue : existing[0].pesticideType,
       get('spec_id', 'specId') ?? existing[0].specId,
       get('spec_content', 'specContent') ?? existing[0].specContent,
       get('dosage', 'dosage') ?? existing[0].dosage,
       get('dosage_unit', 'dosageUnit') ?? existing[0].dosageUnit,
       get('dilution_ratio', 'dilutionRatio') ?? existing[0].dilutionRatio,
       get('target_pest', 'targetPest') ?? existing[0].targetPest,
       get('application_method', 'applicationMethod') ?? existing[0].applicationMethod,
       get('bio_agent_id', 'bioAgentId') ?? existing[0].bioAgentId,
       get('bio_agent_name', 'bioAgentName') ?? existing[0].bioAgentName,
       get('bio_agent_type', 'bioAgentType') ?? existing[0].bioAgentType,
       get('equipment_name', 'equipmentName') ?? existing[0].equipmentName,
       get('equipment_count', 'equipmentCount') ?? existing[0].equipmentCount,
       stringifyOrFallback(get('pesticide_list', 'pesticideList'), existing[0].pesticideList),
       stringifyOrFallback(get('bio_agent_list', 'bioAgentList'), existing[0].bioAgentList),
       stringifyOrFallback(get('equipment_list', 'equipmentList'), existing[0].equipmentList),
       get('use_leaf_fertilizer', 'useLeafFertilizer') ?? existing[0].useLeafFertilizer,
       get('leaf_fertilizer_name', 'leafFertilizerName') ?? existing[0].leafFertilizerName,
       get('leaf_fertilizer_dosage', 'leafFertilizerDosage') ?? existing[0].leafFertilizerDosage,
       get('leaf_fertilizer_unit', 'leafFertilizerUnit') ?? existing[0].leafFertilizerUnit,
       stringifyOrFallback(get('leaf_fertilizer_list', 'leafFertilizerList'), existing[0].leafFertilizerList),
       get('description', 'description') ?? existing[0].description,
       stringifyOrFallback(get('photos', 'photos'), existing[0].photos),
       now, id]
    );
    const updated = queryToObjects(db, `SELECT * FROM pesticide_records WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] ? parseJsonFieldsOnRead(updated[0]) : null });
  } catch (error) {
    res.status(500).json({ success: false, error: sanitizeError(error) });
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
    res.status(500).json({ success: false, error: sanitizeError(error) });
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
    // 2026-07-17：防 DoS — 单次最多 500 条（攻击者可传 10 万元素触发 SQLite IN 列表参数膨胀 OOM）
    const MAX_BATCH_DELETE = 500;
    if (ids.length > MAX_BATCH_DELETE) {
      res.status(400).json({ success: false, error: `批量删除最多 ${MAX_BATCH_DELETE} 条/次，当前 ${ids.length} 条` });
      return;
    }
    // 全部 ID 必须是非空字符串，防 SQL 注入
    if (!ids.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length < 200)) {
      res.status(400).json({ success: false, error: 'ids 必须全部为非空字符串' });
      return;
    }
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM pesticide_records WHERE id IN (${placeholders})`, ids);
    saveDatabase();
    res.json({ success: true, data: { deleted: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: sanitizeError(error) });
  }
});

export default router;
