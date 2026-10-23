/**
 * 巡查记录写入服务（2026-10-21 P2c）
 *
 * 【设计约束：纯 SQL，不含 saveDatabase】
 * 记录提交必须与「任务状态流转 / 问题建单」在**同一个事务**里：
 *   记录插入 → 问题插入（可选）→ 任务状态流转 → COMMIT → 一次落盘
 * 若这里调用带 saveDatabase() 的既有 service，会在事务中间触发全库落盘，
 * 既拖慢又会让回滚失去意义（磁盘已写、内存回滚 = 数据分叉）。
 * 因此本文件只提供纯 SQL 的 insert / update，由调用方包事务并自行落盘。
 *
 * 列清单与 `/api/inspections` POST 保持一致（同一张表、同一批字段），
 * 刻意不新建第二套映射 —— 两份列清单必然漂移。
 */
import { generateId, maxNumericSuffix } from '../utils/id';

export interface InspectionRecordInput {
  /** 记录主键；不传则生成 */
  id?: string;
  recordCode?: string | null;
  inspectionType?: string | null;
  inspectorId?: string | null;
  inspectorName?: string | null;
  greenhouseId?: string | null;
  greenhouseName?: string | null;
  cropName?: string | null;
  batchId?: string | null;
  batchCode?: string | null;
  equipmentId?: string | null;
  equipmentName?: string | null;
  infrastructureId?: string | null;
  infrastructureName?: string | null;
  checkDate?: string | null;
  checkTime?: string | null;
  weather?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  cropStatus?: string | null;
  plantHeight?: number | null;
  leafCount?: number | null;
  duration?: number | null;
  /** 安全/其他巡查的检查区域 */
  area?: string | null;
  status?: string | null;
  issueCategories?: unknown;
  issuePresets?: unknown;
  issueText?: string | null;
  issueSeverity?: string | null;
  issuePhotos?: unknown;
  checklistResults?: unknown;
  remarks?: string | null;
  /** 来源计划（1:1 关联） */
  inspectionPlanId?: string | null;
  /** 来源任务（1:1 关联，受唯一索引约束） */
  inspectionTaskId?: string | null;
  /** 记录版本：新增固定 1；更新由调用方 +1 */
  recordVersion?: number;
}

const COLUMNS = [
  'id', 'record_code', 'inspection_type', 'inspector_id', 'inspector_name',
  'greenhouse_id', 'greenhouse_name', 'crop_name', 'batch_id', 'batch_code',
  'equipment_id', 'equipment_name', 'infrastructure_id', 'infrastructure_name',
  'check_date', 'check_time', 'weather', 'temperature', 'humidity', 'crop_status',
  'plant_height', 'leaf_count', 'duration', 'area', 'status',
  'issue_categories', 'issue_presets', 'issue_text', 'issue_severity', 'issue_photos',
  'checklist_results', 'remarks',
  'inspection_plan_id', 'inspection_task_id', 'record_version',
  'problem_id', 'create_time', 'update_time',
];

/** JSON 列：统一序列化，避免各调用点各写一套 */
function toJson(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * 插入巡查记录（纯 SQL，不落盘）。
 * @returns 新记录 id
 */
export function insertRecord(db: any, input: InspectionRecordInput, now: string = new Date().toISOString()): string {
  const id = input.id || generateId('INS');
  db.run(
    `INSERT INTO inspections (${COLUMNS.join(', ')})
     VALUES (${COLUMNS.map(() => '?').join(', ')})`,
    [
      id,
      input.recordCode ?? null,
      input.inspectionType ?? 'farm',
      input.inspectorId ?? '',
      input.inspectorName ?? '',
      input.greenhouseId ?? '',
      input.greenhouseName ?? '',
      input.cropName ?? '',
      input.batchId ?? '',
      input.batchCode ?? '',
      input.equipmentId ?? '',
      input.equipmentName ?? '',
      input.infrastructureId ?? '',
      input.infrastructureName ?? '',
      input.checkDate ?? '',
      input.checkTime ?? '',
      input.weather ?? '',
      Number(input.temperature ?? 0),
      Number(input.humidity ?? 0),
      input.cropStatus ?? '',
      Number(input.plantHeight ?? 0),
      Number(input.leafCount ?? 0),
      Number(input.duration ?? 0),
      input.area ?? '',
      input.status ?? 'critical',
      toJson(input.issueCategories, '[]'),
      toJson(input.issuePresets, '[]'),
      input.issueText ?? '',
      input.issueSeverity ?? '',
      toJson(input.issuePhotos, '[]'),
      toJson(input.checklistResults, '[]'),
      input.remarks ?? '',
      input.inspectionPlanId ?? null,
      input.inspectionTaskId ?? null,
      Number(input.recordVersion ?? 1),
      null,
      now,
      now,
    ]
  );
  return id;
}

/** 更新记录（驳回重提用）：version 由服务端 +1，不接受客户端赋值 */
export function updateRecordFields(
  db: any,
  recordId: string,
  fields: Record<string, unknown>,
  now: string = new Date().toISOString()
): number {
  const jsonKeys = new Set(['issue_categories', 'issue_presets', 'issue_photos', 'checklist_results']);
  const sets = ['record_version = COALESCE(record_version, 1) + 1', 'update_time = ?'];
  const values: unknown[] = [now];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.unshift(`${key} = ?`);
    values.unshift(jsonKeys.has(key) ? toJson(value, '[]') : value);
  }
  values.push(recordId);
  db.run(`UPDATE inspections SET ${sets.join(', ')} WHERE id = ?`, values);
  return 1;
}

/** 按任务取记录 */
export function getRecordByTaskId(db: any, taskId: string): Record<string, unknown> | null {
  const stmt = db.prepare('SELECT * FROM inspections WHERE inspection_task_id = ? LIMIT 1');
  stmt.bind([taskId]);
  let row: Record<string, unknown> | null = null;
  if (stmt.step()) row = stmt.getAsObject() as unknown as Record<string, unknown>;
  stmt.free();
  return row;
}

/** 生成巡查记录编号 XT{YYYYMMDD}-{3位日序}（服务端取号，方案 §4.5） */
export function nextRecordCode(db: any, ymd: string): string {
  const prefix = `XT${ymd}-`;
  // 2026-10-23：去掉 ORDER BY ... LIMIT 1。
  //   原实现先取「字符串最大」的一条，再对它求数值后缀 —— 当日序号过千时
  //   'XT…-999' 的字符串序大于 'XT…-1000'，取到 999 → 再生成 1000 → 撞已有编号。
  //   现在取当日全部编号交给 maxNumericSuffix 求真正的数值最大。
  //   （当日记录数有限，全量取回开销可忽略）
  const stmt = db.prepare('SELECT record_code FROM inspections WHERE record_code LIKE ?');
  stmt.bind([`${prefix}%`]);
  const codes: string[] = [];
  while (stmt.step()) {
    codes.push(String((stmt.getAsObject() as { record_code?: string }).record_code || ''));
  }
  stmt.free();
  const n = maxNumericSuffix(codes) + 1;
  return `${prefix}${String(n).padStart(n > 999 ? 4 : 3, '0')}`;
}