/**
 * 施肥管理 API 路由
 * 施肥记录 CRUD + 统计分析 + IoT数据接入
 * V10.0 新增
 * G11 V1.1：路由层改调 fertilizerService（含事务 + 库存扣减）
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { iotAuth } from '../middleware/iotAuth';
import { iotIngestSchema } from '../validation/iotIngest';
import { fertilizerService, BusinessError } from '../services/fertilizer.service';
import { FertilizerRecord } from '../repositories/fertilizer.repository';

const router = Router();

/**
 * 将 service 返回的 snake_case 记录转为 camelCase 响应（G11：让前端 store FIELD_MAP 正确解析）
 */
function toCamelResponse<T = any>(record: FertilizerRecord | null): T | null {
  if (!record) return null;
  return {
    ...record,
    fertilizerId: record.fertilizer_id,
    // 2026-07-05: 加 seedling 关联字段的 camelCase 映射
    seedlingId: record.seedling_id ?? null,
    seedlingCode: record.seedling_code ?? null,
    // 让响应字段同时保留 snake 和 camel 兼容老 store
    fertilizer_id: record.fertilizer_id,
    seedling_id: record.seedling_id ?? null,
    seedling_code: record.seedling_code ?? null,
  } as T;
}

/** 生成施肥编号 SF+年月日-4位流水号 */
function generateFertilizerCode(db: any): string {
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `SF${datePrefix}`;
  // 获取所有当天编号，在 JS 中计算最大流水号（避免 sql.js LIKE 参数绑定问题）
  const allCodes = queryToObjects<{ fertilizerCode: string }>(db,
    `SELECT fertilizer_code FROM fertilizer_records`,
  );
  let maxSeq = 0;
  for (const row of allCodes) {
    const code = row.fertilizerCode || '';
    if (code.startsWith(prefix)) {
      const seq = parseInt(code.split('-').pop() || '0', 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** GET /api/fertilizer/generate-code — 生成编号(先于:id注册) */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const code = generateFertilizerCode(db);
    res.json({ success: true, data: { code } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/fertilizer/batch-delete — 批量删除（G11：调 service.removeBatch() 含事务 + 库存恢复） */
router.post('/batch-delete', async (req: Request, res: Response) => {
  try {
    const result = await fertilizerService.removeBatch(req.body?.ids);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof BusinessError) {
      res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/fertilizer — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { fertilizer_name, fertilizer_type, crop_name, greenhouse_name,
      data_source, start_date, end_date, operator_name, planting_code,
      page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    if (fertilizer_name) { conditions.push("fertilizer_name LIKE '%' || ? || '%'"); params.push(fertilizer_name); }
    if (fertilizer_type) { conditions.push('fertilizer_type = ?'); params.push(fertilizer_type); }
    if (crop_name) { conditions.push("crop_name LIKE '%' || ? || '%'"); params.push(crop_name); }
    if (greenhouse_name) { conditions.push("greenhouse_name LIKE '%' || ? || '%'"); params.push(greenhouse_name); }
    if (data_source) { conditions.push('data_source = ?'); params.push(data_source); }
    if (start_date) { conditions.push('fertilize_time >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('fertilize_time <= ?'); params.push(`${end_date} 23:59:59`); }
    if (operator_name) { conditions.push("operator_name LIKE '%' || ? || '%'"); params.push(operator_name); }
    if (planting_code) { conditions.push("planting_code LIKE '%' || ? || '%'"); params.push(planting_code); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM fertilizer_records ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM fertilizer_records ${whereClause} ORDER BY create_time DESC, fertilize_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/fertilizer — 新增（G11：调 service.apply() 含事务 + 库存扣减） */
router.post('/', async (req: Request, res: Response) => {
  try {
    const record = await fertilizerService.apply(req.body);
    res.status(201).json({ success: true, data: toCamelResponse(record) });
  } catch (error) {
    if (error instanceof BusinessError) {
      res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/fertilizer/stats — 统计分析(先于:id注册) */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { start_date, end_date, group_by = 'month', crop_name, greenhouse_name } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];
    if (start_date) { conditions.push('fertilize_time >= ?'); params.push(start_date); }
    if (end_date) { conditions.push('fertilize_time <= ?'); params.push(`${end_date} 23:59:59`); }
    if (crop_name) { conditions.push('crop_name = ?'); params.push(crop_name); }
    if (greenhouse_name) { conditions.push('greenhouse_name = ?'); params.push(greenhouse_name); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let groupField: string;
    switch (group_by) {
      case 'crop': groupField = 'crop_name'; break;
      case 'fertilizer_type': groupField = 'fertilizer_type'; break;
      case 'greenhouse': groupField = 'greenhouse_name'; break;
      default: groupField = "strftime('%Y-%m', fertilize_time)"; break;
    }
    const items = queryToObjects(db,
      `SELECT ${groupField} as label, COUNT(*) as record_count,
        SUM(quantity) as total_quantity, SUM(total_cost) as total_cost,
        AVG(quantity) as avg_quantity, AVG(total_cost) as avg_cost
      FROM fertilizer_records ${whereClause} GROUP BY ${groupField} ORDER BY total_quantity DESC`, params
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/fertilizer/iot-ingest — IoT数据接入 (G11：调 service.ingestIot() 含事务 + 库存扣减) */
router.post('/iot-ingest', iotAuth, async (req: Request, res: Response) => {
  try {
    const parsed = iotIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: '请求格式错误', details: parsed.error.issues });
      return;
    }
    const { device_id, device_name, records } = parsed.data;
    const result = await fertilizerService.ingestIot(device_id!, device_name ?? '', records);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof BusinessError) {
      res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/fertilizer/:id — 单条记录(最后注册，避免匹配其他路由) */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const items = queryToObjects(db, `SELECT * FROM fertilizer_records WHERE id = ?`, [id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }
    res.json({ success: true, data: items[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/fertilizer/:id — 更新（G11：调 service.update() 含事务 + delta 库存调整） */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await fertilizerService.update(req.params.id, req.body);
    res.json({ success: true, data: toCamelResponse(updated) });
  } catch (error) {
    if (error instanceof BusinessError) {
      res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/fertilizer/:id — 删除（G11：调 service.remove() 含事务 + 库存恢复） */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await fertilizerService.remove(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof BusinessError) {
      res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
