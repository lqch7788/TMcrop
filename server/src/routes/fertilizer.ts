/**
 * 施肥管理 API 路由
 * 施肥记录 CRUD + 统计分析 + IoT数据接入
 * V10.0 新增
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { iotAuth } from '../middleware/iotAuth';
import { iotIngestSchema } from '../validation/iotIngest';

const router = Router();

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

/** POST /api/fertilizer/batch-delete — 批量删除(先于:id注册) */
router.post('/batch-delete', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: '请提供要删除的记录ID数组' });
      return;
    }
    const placeholders = ids.map(() => '?').join(',');
    const iotRows = queryToObjects<{ id: string }>(db,
      `SELECT id FROM fertilizer_records WHERE id IN (${placeholders}) AND data_source = 'auto_iot'`, ids
    );
    const iotIds = new Set(iotRows.map(r => r.id));
    const deletableIds = ids.filter((id: string) => !iotIds.has(id));
    if (deletableIds.length === 0) {
      res.status(403).json({ success: false, error: '所选记录均为IoT自动记录，不可删除' });
      return;
    }
    const delPlaceholders = deletableIds.map(() => '?').join(',');
    db.run(`DELETE FROM fertilizer_records WHERE id IN (${delPlaceholders})`, deletableIds);
    saveDatabase(); // 持久化到磁盘
    res.json({ success: true, data: { deleted: deletableIds.length, skipped: ids.length - deletableIds.length } });
  } catch (error) {
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
      `SELECT * FROM fertilizer_records ${whereClause} ORDER BY fertilize_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/fertilizer — 新增 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body;
    if (!body.fertilizer_name || !body.fertilizer_type || !body.dilution_ratio || !body.greenhouse_name || !body.crop_name || !body.fertilize_time) {
      res.status(400).json({ success: false, error: '肥料名称、肥料类型、稀释比例、温室位置、作物名称、施肥时间为必填项' });
      return;
    }
    const code = generateFertilizerCode(db);
    const now = new Date().toISOString();
    const id = `fer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const qty = body.quantity || 0;
    const price = body.unit_price || 0;

    db.run(`INSERT INTO fertilizer_records (
      id, fertilizer_code, farm_task_id, production_plan_id, production_plan_code,
      planting_id, planting_code, greenhouse_id, greenhouse_name, area_name,
      crop_name, crop_variety, fertilizer_name, fertilizer_type, dilution_ratio,
      quantity, unit, unit_price, total_cost, fertilize_time, operator_id, operator_name,
      data_source, iot_device_id, iot_record_id, description, status, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, code, body.farm_task_id || null, body.production_plan_id || null, body.production_plan_code || null,
       body.planting_id || null, body.planting_code || null, body.greenhouse_id || null, body.greenhouse_name,
       body.area_name || null, body.crop_name, body.crop_variety || null, body.fertilizer_name, body.fertilizer_type,
       body.dilution_ratio, qty, body.unit || '千克', price, qty * price, body.fertilize_time,
       body.operator_id || null, body.operator_name || null, body.data_source || 'manual',
       body.iot_device_id || null, body.iot_record_id || null, body.description || null,
       body.status || 'completed', now, now]
    );

    const items = queryToObjects(db, `SELECT * FROM fertilizer_records WHERE fertilizer_code = ?`, [code]);
    saveDatabase(); // 持久化到磁盘，防止重启数据丢失
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
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

/** POST /api/fertilizer/iot-ingest — IoT数据接入 (IoT设备认证 + Zod校验) */
router.post('/iot-ingest', iotAuth, (req: Request, res: Response) => {
  try {
    // Zod 请求校验
    const parsed = iotIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: '请求格式错误', details: parsed.error.issues });
      return;
    }
    const { device_id, device_name, records } = parsed.data;

    const db = getDatabase();
    let inserted = 0, skipped = 0;
    const now = new Date().toISOString();

    for (const record of records) {
      const dups = queryToObjects<{ id: string }>(db,
        `SELECT id FROM fertilizer_records WHERE iot_record_id = ? AND iot_device_id = ?`,
        [record.iot_record_id, device_id]
      );
      if (dups.length > 0) { skipped++; continue; }

      const code = generateFertilizerCode(db);
      const id = `fer-iot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${inserted}`;
      const qty = record.quantity || 0;
      const price = record.unit_price || 0;

      db.run(`INSERT INTO fertilizer_records (
        id, fertilizer_code, greenhouse_name, area_name, crop_name,
        fertilizer_name, fertilizer_type, dilution_ratio, quantity, unit_price,
        total_cost, fertilize_time, operator_name, data_source,
        iot_device_id, iot_record_id, status, create_time, update_time
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, code, record.greenhouse_name || '', record.area_name || null, record.crop_name || '',
         record.fertilizer_name, record.fertilizer_type || '', record.dilution_ratio || '',
         qty, price, qty * price, record.fertilize_time || now,
         device_name || `设备${device_id}`, 'auto_iot', device_id, record.iot_record_id,
         'completed', now, now]
      );
      inserted++;
    }
    saveDatabase(); // 持久化到磁盘
    res.status(201).json({ success: true, data: { inserted, skipped, total: records.length, device_id } });
  } catch (error) {
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

/** PUT /api/fertilizer/:id — 更新(IoT记录不可更新) */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM fertilizer_records WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }
    if (existing[0].data_source === 'auto_iot') { res.status(403).json({ success: false, error: 'IoT自动记录不可编辑' }); return; }

    const now = new Date().toISOString();
    const qty = body.quantity ?? existing[0].quantity;
    const price = body.unit_price ?? existing[0].unit_price;
    db.run(`UPDATE fertilizer_records SET fertilizer_name=?, fertilizer_type=?, dilution_ratio=?,
      quantity=?, unit=?, unit_price=?, total_cost=?, greenhouse_name=?, area_name=?, crop_name=?, crop_variety=?,
      fertilize_time=?, operator_name=?, description=?, production_plan_id=?, production_plan_code=?,
      planting_id=?, planting_code=?, update_time=? WHERE id=?`,
      [body.fertilizer_name ?? existing[0].fertilizer_name, body.fertilizer_type ?? existing[0].fertilizer_type,
       body.dilution_ratio ?? existing[0].dilution_ratio, qty, body.unit ?? existing[0].unit ?? '千克', price, qty * price,
       body.greenhouse_name ?? existing[0].greenhouse_name, body.area_name ?? existing[0].area_name,
       body.crop_name ?? existing[0].crop_name, body.crop_variety ?? existing[0].crop_variety,
       body.fertilize_time ?? existing[0].fertilize_time, body.operator_name ?? existing[0].operator_name,
       body.description ?? existing[0].description, body.production_plan_id ?? existing[0].production_plan_id,
       body.production_plan_code ?? existing[0].production_plan_code, body.planting_id ?? existing[0].planting_id,
       body.planting_code ?? existing[0].planting_code, now, id]
    );
    const updated = queryToObjects(db, `SELECT * FROM fertilizer_records WHERE id = ?`, [id]);
    saveDatabase(); // 持久化到磁盘
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/fertilizer/:id — 删除(IoT记录不可删除) */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM fertilizer_records WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }
    if (existing[0].data_source === 'auto_iot') { res.status(403).json({ success: false, error: 'IoT自动记录不可删除' }); return; }
    db.run(`DELETE FROM fertilizer_records WHERE id = ?`, [id]);
    saveDatabase(); // 持久化到磁盘
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
