/**
 * 病虫害防治记录 API 路由
 * V12.0 新增
 * 2026-07-17：POST/PUT/DELETE/batch-delete 改为调 pesticideService
 *   - 事务包裹 + 肥料库存扣减/恢复
 *   - 业务校验（INSUFFICIENT_STOCK 等）通过 PestideBusinessError 上抛
 *   - SQL/Service 层职责分离：路由只负责参数校验 + 业务错误转 HTTP
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
// 2026-07-18 P2-M8：统一 LIMIT 常量
import { PEST_RECORDS } from '../lib/constants';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { pesticideService, PesticideBusinessError } from '../services/pesticide.service';

const router = Router();

/**
 * 2026-07-17：将 service 业务错误转换为 HTTP 响应
 * - 用 error.code 比对字符串避免脆弱匹配
 */
function handleServiceError(res: Response, error: unknown): void {
  if (error instanceof PesticideBusinessError) {
    res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
    return;
  }
  res.status(500).json({ success: false, error: sanitizeError(error) });
}

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

/** 生成记录编号（2026-07-18 P3-L8：路由改用 service 层的 generateRecordCodeWithRetry，删除本地实现） */
// （本地 generateRecordCode 已删除，统一用 service.generateRecordCodeWithRetry）

/** GET /api/pest-records/generate-code */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    // 2026-07-18 P3-L8：改用 service 层（带 UNIQUE 重试，与 apply() 路径一致）
    const { generateRecordCodeWithRetry } = require('../services/pesticide.service');
    const code = generateRecordCodeWithRetry();
    res.json({ success: true, data: { code } });
  } catch (error) {
    res.status(500).json({ success: false, error: sanitizeError(error) });
  }
});

/** GET /api/pest-records — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { pesticide_type, crop_name, greenhouse_name, start_date, end_date, operator_name, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(PEST_RECORDS.MAX_LIMIT, Math.max(1, parseInt(limit, 10) || 20));
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
    const parsed = items.map((it: any) => parseJsonFieldsOnRead(it));
    res.json({ success: true, data: parsed, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: sanitizeError(error) });
  }
});

/** POST /api/pest-records — 新增（2026-07-17：调 service 走事务 + 肥料库存扣减） */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    // 必填校验（service 层 zod 也有兜底）
    const sprayTime = body.spray_time ?? body.sprayTime;
    const cropName = body.crop_name ?? body.cropName;
    if (!sprayTime || !cropName) {
      res.status(400).json({ success: false, error: '防治日期、作物名称为必填项' });
      return;
    }
    const record = await pesticideService.apply(body);
    res.status(201).json({ success: true, data: parseJsonFieldsOnRead(record) });
  } catch (error) {
    handleServiceError(res, error);
  }
});

/** GET /api/pest-records/stats — 统计分析（按药剂类型） */
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

/**
 * GET /api/pest-records/fertilizer-stats — 防治记录肥料池聚合统计
 * 2026-07-17 新增：仿 fertilizer.repository.findStats 的肥料维度统计
 *
 * Query:
 *   group_by: month | crop_name | greenhouse_name | fertilizer_type | fertilizer_name (必填)
 *   start_date, end_date, crop_name, greenhouse_name (可选)
 *
 * Response: [{ label, record_count, total_dosage, total_cost }]
 */
router.get('/fertilizer-stats', (req: Request, res: Response) => {
  try {
    const { group_by, start_date, end_date, crop_name, greenhouse_name } = req.query as Record<string, string>;
    if (!group_by) {
      res.status(400).json({ success: false, error: 'group_by 参数必填（month/crop_name/greenhouse_name/fertilizer_type/fertilizer_name）' });
      return;
    }
    const data = pesticideService.findFertilizerStats(group_by, {
      startDate: start_date,
      endDate: end_date,
      cropName: crop_name,
      greenhouseName: greenhouse_name,
    });
    res.json({ success: true, data });
  } catch (error) {
    handleServiceError(res, error);
  }
});

/**
 * GET /api/pest-records/by-spec/:specId — 单条肥料反向追溯
 * 2026-07-17 新增：找用过某 spec 肥料的所有防治记录（聚合每条记录的总用量/费用）
 */
router.get('/by-spec/:specId', (req: Request, res: Response) => {
  try {
    const { specId } = req.params;
    const { start_date, end_date } = req.query as Record<string, string>;
    const data = pesticideService.findUsageByFertilizerSpec(specId, {
      startDate: start_date,
      endDate: end_date,
    });
    res.json({ success: true, data, meta: { total: data.length } });
  } catch (error) {
    handleServiceError(res, error);
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

/** PUT /api/pest-records/:id — 更新（2026-07-17：调 service 走事务 + diff 库存调整） */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // 类型校验（保留原行为：spray_time/crop_name 必须是字符串）
    if ('spray_time' in body || 'sprayTime' in body) {
      const v = body.spray_time ?? body.sprayTime;
      if (v != null && typeof v !== 'string') {
        res.status(400).json({ success: false, error: 'spray_time/sprayTime 必须是字符串' });
        return;
      }
    }
    if ('crop_name' in body || 'cropName' in body) {
      const v = body.crop_name ?? body.cropName;
      if (v != null && typeof v !== 'string') {
        res.status(400).json({ success: false, error: 'crop_name/cropName 必须是字符串' });
        return;
      }
    }

    const updated = await pesticideService.update(id, body);
    if (!updated) {
      res.status(404).json({ success: false, error: '记录不存在' });
      return;
    }
    res.json({ success: true, data: parseJsonFieldsOnRead(updated) });
  } catch (error) {
    handleServiceError(res, error);
  }
});

/** DELETE /api/pest-records/:id — 删除（2026-07-17：调 service 恢复库存后删除） */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pesticideService.remove(id);
    res.json({ success: true, data: { id } });
  } catch (error) {
    handleServiceError(res, error);
  }
});

/** POST /api/pest-records/batch-delete — 批量删除（2026-07-17：每条独立事务恢复库存） */
router.post('/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: '请提供要删除的记录ID数组' });
      return;
    }
    // 防 DoS：单次最多 500 条
    const MAX_BATCH_DELETE = PEST_RECORDS.BATCH_DELETE_LIMIT;
    if (ids.length > MAX_BATCH_DELETE) {
      res.status(400).json({ success: false, error: `批量删除最多 ${MAX_BATCH_DELETE} 条/次，当前 ${ids.length} 条` });
      return;
    }
    if (!ids.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length < 200)) {
      res.status(400).json({ success: false, error: 'ids 必须全部为非空字符串' });
      return;
    }
    const result = await pesticideService.removeBatch(ids);
    res.json({ success: true, data: result });
  } catch (error) {
    handleServiceError(res, error);
  }
});

export default router;