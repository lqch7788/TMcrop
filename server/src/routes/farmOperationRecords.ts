/**
 * 农事操作综合记录 API 路由
 * 2026-06-04 新增：V2.1 铁律改造（useOperationRecords 从 localStorage 迁到后端）
 *
 * 重要：本表与老表 task_operation_records 并存，不取代。
 * 字段语义/聚合层级不匹配，老表保留作"任务状态变更事件流"。
 *
 * 数据流：客户端 useFarmOperationRecordStore → enhancedApiClient → /api/farm-operation-records → SQLite
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

// camelCase ↔ snake_case 字段映射
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  recordCode: 'record_code',
  sourceType: 'source_type',
  sourceId: 'source_id',
  sourceCode: 'source_code',
  operationType: 'operation_type',
  operationTypeName: 'operation_type_name',
  status: 'status',
  greenhouseId: 'greenhouse_id',
  greenhouseName: 'greenhouse_name',
  cropName: 'crop_name',
  variety: 'variety',
  batchId: 'batch_id',
  batchCode: 'batch_code',
  operatorId: 'operator_id',
  operatorName: 'operator_name',
  operationDate: 'operation_date',
  startTime: 'start_time',
  endTime: 'end_time',
  duration: 'duration',
  workload: 'workload',
  workloadDays: 'workload_days',
  workloadHours: 'workload_hours',
  workers: 'workers',
  unit: 'unit',
  materials: 'materials',
  gpsLocation: 'gps_location',
  photosBefore: 'photos_before',
  photosAfter: 'photos_after',
  voiceNote: 'voice_note',
  materialCode: 'material_code',
  remarks: 'remarks',
  progress: 'progress',
  progressIncrement: 'progress_increment',
  area: 'area',
  children: 'children',
  rejectReason: 'reject_reason',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/** 数据库行（snake_case）→ 前端格式（camelCase） */
function normalize(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (jsKey === dbKey) {
      result[jsKey] = row[dbKey];
    } else {
      result[jsKey] = row[dbKey] ?? null;
    }
  }
  return result;
}

/** 前端对象 → 数据库行（snake_case）；嵌套对象/数组字段用 JSON.stringify 序列化为字符串 */
function denormalize(data: Record<string, unknown>): Record<string, string | number | null> {
  // 这些字段类型是 object/array，需要 JSON 序列化
  const JSON_FIELDS = new Set(['materials', 'gps_location', 'photos_before', 'photos_after', 'children']);
  const result: Record<string, string | number | null> = {};
  for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (data[jsKey] === undefined) continue;
    const v = data[jsKey];
    if (JSON_FIELDS.has(dbKey) && v !== null && typeof v === 'object') {
      result[dbKey] = JSON.stringify(v);
    } else if (v === null) {
      result[dbKey] = null;
    } else {
      result[dbKey] = v as string | number;
    }
  }
  return result;
}

/** 列表查询（支持 sourceType/status 过滤） */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { sourceType, status, sourceId, limit = '200' } = req.query;
    let sql = 'SELECT * FROM farm_operation_records WHERE 1=1';
    const bindings: (string | number)[] = [];
    if (sourceType) { sql += ' AND source_type = ?'; bindings.push(sourceType as string); }
    if (status) { sql += ' AND status = ?'; bindings.push(status as string); }
    if (sourceId) { sql += ' AND source_id = ?'; bindings.push(sourceId as string); }
    sql += ' ORDER BY operation_date DESC, created_at DESC LIMIT ?';
    bindings.push(Number(limit) || 200);
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const rows: unknown[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ success: true, data: rows.map(r => normalize(r as Record<string, unknown>)) });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** 创建 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const data = denormalize(req.body);
    const id = data.id || `for_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO farm_operation_records (
        id, record_code, source_type, source_id, source_code,
        operation_type, operation_type_name, status,
        greenhouse_id, greenhouse_name, crop_name, variety, batch_id, batch_code,
        operator_id, operator_name, operation_date, start_time, end_time, duration,
        workload, workload_days, workload_hours, workers, unit,
        materials, gps_location, photos_before, photos_after, voice_note, material_code, remarks,
        progress, progress_increment, area, children, reject_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.record_code, data.source_type, data.source_id, data.source_code,
        data.operation_type, data.operation_type_name, data.status,
        data.greenhouse_id, data.greenhouse_name, data.crop_name, data.variety, data.batch_id, data.batch_code,
        data.operator_id, data.operator_name, data.operation_date, data.start_time, data.end_time, data.duration,
        data.workload, data.workload_days, data.workload_hours, data.workers, data.unit,
        data.materials, data.gps_location, data.photos_before, data.photos_after, data.voice_note, data.material_code, data.remarks,
        data.progress, data.progress_increment, data.area, data.children, data.reject_reason,
        now, now,
      ],
    );
    const stmt = db.prepare('SELECT * FROM farm_operation_records WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const created = normalize(stmt.getAsObject());
      stmt.free();
      return res.status(201).json({ success: true, data: created });
    }
    stmt.free();
    res.status(500).json({ success: false, error: '创建后查询失败' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** 更新 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const data = denormalize(req.body);
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
      if (data[jsKey] !== undefined && dbKey !== 'id') {
        fields.push(`${dbKey} = ?`);
        values.push(data[jsKey]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);
    db.run(`UPDATE farm_operation_records SET ${fields.join(', ')} WHERE id = ?`, values);
    const stmt = db.prepare('SELECT * FROM farm_operation_records WHERE id = ?');
    stmt.bind([req.params.id]);
    if (stmt.step()) {
      const updated = normalize(stmt.getAsObject());
      stmt.free();
      return res.json({ success: true, data: updated });
    }
    stmt.free();
    res.status(404).json({ success: false, error: '记录不存在' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** 删除 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM farm_operation_records WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
