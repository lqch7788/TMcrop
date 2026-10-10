/**
 * 巡查记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/** 问题状态 → 巡查「问题处理状态」(issueStatus) 映射 */
function mapProblemStatusToIssueStatus(problemStatus: string): string {
  if (problemStatus === 'completed') return 'resolved';
  if (problemStatus === 'pending') return 'pending';
  // in_progress / waiting_acceptance / rejected 等均处于处理流程中
  return 'processing';
}

/**
 * 推导巡查记录的 issueStatus（问题处理状态）—— 2026-10-10 新增。
 *
 * 优先取「关联问题」的真实状态（inspections.problem_id / source_problem_id → problems.status）；
 * 无关联问题时按巡查自身性质兜底：attention / critical / pending 均为「未处理」。
 *
 * 背景：原推导「非 attention 一律 resolved」把 critical 等未处理巡查误标为"已解决"，
 *   前端 useTasks 映射为 completed → "我的任务·巡查反馈处理"显示假完成（审核缺陷 H2）。
 */
function resolveIssueStatus(item: any, problemStatusById: Map<string, string>): string {
  if (item.issueStatus) return item.issueStatus;
  const linkedId = item.problemId || item.problem_id || item.sourceProblemId || item.source_problem_id;
  if (linkedId) {
    const linked = problemStatusById.get(String(linkedId));
    if (linked) return mapProblemStatusToIssueStatus(linked);
  }
  const selfStatus = item.status || '';
  return ['attention', 'critical', 'pending'].includes(selfStatus) ? 'pending' : 'resolved';
}

/**
 * 将数据库记录转换为前端 InspectionRecord 格式
 * 数据库仅存储核心字段，其余字段填充默认值确保前端不丢数据
 */
function transformInspectionRecord(db: any) {
  if (!db) return db;
  const issueText = db.issueText || db.issue_text || '';
  const images = db.images || [];
  // 解析 feedback_users（数据库存储为 JSON 字符串，sql.js 转为 camelCase）
  let feedbackUsers = db.feedbackUsers || db.feedback_users || [];
  if (typeof feedbackUsers === 'string') {
    try { feedbackUsers = JSON.parse(feedbackUsers); } catch { feedbackUsers = []; }
  }
  if (!Array.isArray(feedbackUsers)) feedbackUsers = [];
  return {
    ...db,
    // 确保必要字段存在
    cropName: db.cropName || db.crop_name || '',
    cropStatus: db.cropStatus || db.crop_status || '',
    issues: Array.isArray(db.issues) ? db.issues : (issueText ? [issueText] : []),
    images: Array.isArray(images) ? images : [],
    weather: db.weather || '',
    temperature: db.temperature || 0,
    humidity: db.humidity || 0,
    remarks: db.remarks || '',
    plantHeight: db.plantHeight || db.plant_height || 0,
    leafCount: db.leafCount || db.leaf_count || 0,
    duration: db.duration || 0,
    // 问题相关字段
    issueCategories: Array.isArray(db.issueCategories) ? db.issueCategories : [],
    issuePresets: Array.isArray(db.issuePresets) ? db.issuePresets : [],
    issuePhotos: Array.isArray(db.issuePhotos) ? db.issuePhotos : [],
    feedbackUsers: feedbackUsers,
    // 2026-10-10：只透传显式字段，兜底推导移交 resolveIssueStatus()（路由层，可访问 problems 表）。
    //   原兜底「非 attention 一律 resolved」会把 critical 等未处理巡查误标为"已解决"，
    //   前端映射为 completed → "我的任务"假完成（审核缺陷 H2）
    issueStatus: db.issueStatus || db.issue_status || undefined,
    expectedCompletion: db.expectedCompletion || db.expected_completion || '',
    // 环境参数
    airTemperature: db.airTemperature || db.air_temperature || 0,
    airHumidity: db.airHumidity || db.air_humidity || 0,
    lightIntensity: db.lightIntensity || db.light_intensity || 0,
    co2Concentration: db.co2Concentration || db.co2_concentration || 0,
    soilTemperature: db.soilTemperature || db.soil_temperature || 0,
    soilMoisture: db.soilMoisture || db.soil_moisture || 0,
    soilEc: db.soilEc || db.soil_ec || 0,
    soilPh: db.soilPh || db.soil_ph || 0,
    // 关联信息
    batchId: db.batchId || db.batch_id || '',
    batchCode: db.batchCode || db.batch_code || '',
    problemId: db.problemId || db.problem_id || undefined,
    equipmentId: db.equipmentId || db.equipment_id || '',
    equipmentName: db.equipmentName || db.equipment_name || '',
    infrastructureId: db.infrastructureId || db.infrastructure_id || '',
    infrastructureName: db.infrastructureName || db.infrastructure_name || '',
  };
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { inspection_type, status, greenhouse_name, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM inspections WHERE 1=1';
    const params: any[] = [];

    if (inspection_type) {
      sql += ' AND inspection_type LIKE ?';
      params.push(`%${inspection_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // 保存原始SQL用于count查询
    const countSql = sql;

    sql += ' ORDER BY create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    // 2026-10-10：issueStatus 由关联问题的真实状态推导（见 resolveIssueStatus）
    const problemStatusById = new Map<string, string>();
    for (const p of queryToObjects(db, 'SELECT id, status FROM problems', [])) {
      problemStatusById.set(String(p.id), String(p.status || ''));
    }

    // 转换字段，补充缺失字段默认值
    const transformed = items.map(transformInspectionRecord).map(it => {
      const linkedId = it.problemId || it.problem_id || it.sourceProblemId || it.source_problem_id;
      const linkedStatus = linkedId ? (problemStatusById.get(String(linkedId)) || '') : '';
      return {
        ...it,
        issueStatus: resolveIssueStatus(it, problemStatusById),
        // 2026-10-10：关联问题原始状态（completed/waiting_acceptance/in_progress/...）——
        //   前端据此精确驱动"巡查反馈处理"的任务态展示与操作按钮（比 issueStatus 三态精细）
        linkedProblemStatus: linkedStatus,
      };
    });

    res.json({ success: true, data: transformed, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取巡查记录失败:', error);
    res.status(500).json({ success: false, error: '获取巡查记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inspections WHERE id = ?');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '巡查记录不存在' });
    }

    // 2026-10-10：issueStatus / linkedProblemStatus 由关联问题的真实状态推导
    const transformed = transformInspectionRecord(item);
    const linkedId = transformed.problemId || transformed.problem_id
      || transformed.sourceProblemId || transformed.source_problem_id;
    const problemStatusById = new Map<string, string>();
    if (linkedId) {
      const rows = queryToObjects(db, 'SELECT id, status FROM problems WHERE id = ?', [String(linkedId)]);
      for (const p of rows) problemStatusById.set(String(p.id), String(p.status || ''));
    }
    const linkedStatus = linkedId ? (problemStatusById.get(String(linkedId)) || '') : '';

    res.json({
      success: true,
      data: {
        ...transformed,
        issueStatus: resolveIssueStatus(transformed, problemStatusById),
        linkedProblemStatus: linkedStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取巡查详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body;

    // 统一字段名：支持 camelCase 和 snake_case 两种格式
    const id = body.id;
    const record_code = body.record_code || body.recordCode;
    const inspection_type = body.inspection_type || body.inspectionType;
    const inspector_id = body.inspector_id || body.inspectorId;
    const inspector_name = body.inspector_name || body.inspectorName;
    const greenhouse_name = body.greenhouse_name || body.greenhouseName;
    const check_date = body.check_date || body.checkDate;
    const check_time = body.check_time || body.checkTime;
    const check_result = body.check_result || body.checkResult;
    const issue_severity = body.issue_severity || body.issueSeverity;
    const issue_text = body.issue_text || body.issueText;
    const images = body.images;
    const status = body.status || 'pending';
    const feedbackUsers = body.feedbackUsers || body.feedback_users;
    const crop_name = body.crop_name || body.cropName || '';
    const batch_id = body.batch_id || body.batchId || '';
    const batch_code = body.batch_code || body.batchCode || '';
    const equipment_id = body.equipment_id || body.equipmentId || '';
    const equipment_name = body.equipment_name || body.equipmentName || '';
    const infrastructure_id = body.infrastructure_id || body.infrastructureId || '';
    const infrastructure_name = body.infrastructure_name || body.infrastructureName || '';
    const plant_height = body.plant_height ?? body.plantHeight ?? 0;
    const leaf_count = body.leaf_count ?? body.leafCount ?? 0;
    const duration = body.duration ?? 0;
    const weather = body.weather || '';
    const temperature = body.temperature ?? 0;
    const humidity = body.humidity ?? 0;
    const crop_status = body.crop_status || body.cropStatus || '';
    const issue_categories = body.issue_categories || body.issueCategories || [];
    const issue_presets = body.issue_presets || body.issuePresets || [];
    const issue_photos = body.issue_photos || body.issuePhotos || [];
    const problem_id = body.problem_id ?? body.problemId ?? null;
    const remarks = body.remarks || '';
    const air_temperature = body.air_temperature ?? body.airTemperature ?? 0;
    const air_humidity = body.air_humidity ?? body.airHumidity ?? 0;
    const light_intensity = body.light_intensity ?? body.lightIntensity ?? 0;
    const co2_concentration = body.co2_concentration ?? body.co2Concentration ?? 0;
    const soil_temperature = body.soil_temperature ?? body.soilTemperature ?? 0;
    const soil_moisture = body.soil_moisture ?? body.soilMoisture ?? 0;
    const soil_ec = body.soil_ec ?? body.soilEc ?? 0;
    const soil_ph = body.soil_ph ?? body.soilPh ?? 0;

    const newId = id || `INS${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO inspections (
        id, record_code, inspection_type, inspector_id, inspector_name, greenhouse_name,
        check_date, check_time, check_result, issue_severity, issue_text, images, status,
        feedback_users, crop_name, batch_id, batch_code,
        equipment_id, equipment_name, infrastructure_id, infrastructure_name,
        plant_height, leaf_count, duration,
        weather, temperature, humidity, crop_status,
        issue_categories, issue_presets, issue_photos,
        problem_id, remarks,
        air_temperature, air_humidity, light_intensity, co2_concentration,
        soil_temperature, soil_moisture, soil_ec, soil_ph,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, record_code, inspection_type, inspector_id, inspector_name, greenhouse_name,
      check_date, check_time, check_result, issue_severity, issue_text, images, status,
      feedbackUsers ? JSON.stringify(feedbackUsers) : null,
      crop_name,
      batch_id, batch_code,
      equipment_id, equipment_name,
      infrastructure_id, infrastructure_name,
      plant_height, leaf_count, duration,
      weather, temperature, humidity, crop_status,
      JSON.stringify(issue_categories),
      JSON.stringify(issue_presets),
      JSON.stringify(issue_photos),
      problem_id, remarks,
      air_temperature,
      air_humidity,
      light_intensity,
      co2_concentration,
      soil_temperature,
      soil_moisture,
      soil_ec,
      soil_ph,
      now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建巡查记录失败:', error);
    res.status(500).json({ success: false, error: '创建巡查记录失败' });
  }
});

/**
 * 巡查记录可写列白名单 + camelCase 字段映射（2026-10-10 新增，审核修复）
 *
 * 背景：此前 PUT 直接把请求体的键当列名拼 SQL —— 前端批量编辑发 camelCase 键
 * （inspectorId / checkDate / issueCategories …）会 `no such column` 500，
 * 且调用方（InspectionTab 批量编辑 forEach）不 await 不提示，整批静默失败。
 * 现对齐 problems PUT 的模式：camelCase→snake_case 映射 + 白名单校验（Fail Loud）。
 */
const INSPECTION_FIELD_MAP: Record<string, string> = {
  recordCode: 'record_code', inspectionType: 'inspection_type',
  inspectorId: 'inspector_id', inspectorName: 'inspector_name',
  greenhouseId: 'greenhouse_id', greenhouseName: 'greenhouse_name',
  checkDate: 'check_date', checkTime: 'check_time', checkResult: 'check_result',
  issueSeverity: 'issue_severity', issueText: 'issue_text',
  issueCategories: 'issue_categories', issuePresets: 'issue_presets', issuePhotos: 'issue_photos',
  cropName: 'crop_name', cropStatus: 'crop_status',
  batchId: 'batch_id', batchCode: 'batch_code',
  equipmentId: 'equipment_id', equipmentName: 'equipment_name',
  infrastructureId: 'infrastructure_id', infrastructureName: 'infrastructure_name',
  plantHeight: 'plant_height', leafCount: 'leaf_count',
  problemId: 'problem_id', sourceProblemId: 'source_problem_id',
  airTemperature: 'air_temperature', airHumidity: 'air_humidity',
  lightIntensity: 'light_intensity', co2Concentration: 'co2_concentration',
  soilTemperature: 'soil_temperature', soilMoisture: 'soil_moisture',
  soilEc: 'soil_ec', soilPh: 'soil_ph',
  createTime: 'create_time', updateTime: 'update_time',
};

/** inspections 表允许写入的列（按表实际结构） */
const INSPECTION_DB_COLUMNS = new Set<string>([
  'record_code', 'inspection_type', 'inspector_id', 'inspector_name',
  'greenhouse_name', 'greenhouse_id', 'check_date', 'check_time', 'check_result',
  'issue_severity', 'issue_text', 'images', 'status',
  'feedback_users', 'crop_name', 'crop_status', 'batch_id', 'batch_code',
  'equipment_id', 'equipment_name', 'infrastructure_id', 'infrastructure_name',
  'plant_height', 'leaf_count', 'duration', 'weather', 'temperature', 'humidity',
  'issue_categories', 'issue_presets', 'issue_photos', 'problem_id', 'source_problem_id',
  'remarks', 'air_temperature', 'air_humidity', 'light_intensity', 'co2_concentration',
  'soil_temperature', 'soil_moisture', 'soil_ec', 'soil_ph',
  'create_time', 'update_time',
]);

/** 需序列化为 JSON 字符串存储的列 */
const INSPECTION_JSON_COLUMNS = new Set<string>([
  'images', 'feedback_users', 'issue_categories', 'issue_presets', 'issue_photos',
]);

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();
    const db = getDatabase();

    // camelCase → snake_case 映射 + 白名单过滤（Fail Loud：丢弃字段必须可见）
    const updates: Record<string, any> = {};
    const droppedKeys: string[] = [];
    for (const [k, v] of Object.entries(req.body)) {
      if (k === 'id' || v === undefined) continue;
      const col = INSPECTION_FIELD_MAP[k] || k;
      if (!INSPECTION_DB_COLUMNS.has(col)) {
        droppedKeys.push(k);
        continue;
      }
      updates[col] = INSPECTION_JSON_COLUMNS.has(col) && Array.isArray(v) ? JSON.stringify(v) : v;
    }
    if (droppedKeys.length > 0) {
      console.warn(`[inspections PUT] 忽略非白名单字段: ${droppedKeys.join(', ')}`);
    }

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values: any[] = Object.values(updates);
    values.push(now, id);

    db.run(`UPDATE inspections SET ${fields}, update_time = ? WHERE id = ?`, values);
    // 2026-10-10：0 行更新 → 404（Fail Loud，防幽灵成功）
    if (db.getRowsModified() === 0) {
      return res.status(404).json({ success: false, error: '巡查记录不存在' });
    }
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新巡查记录失败:', error);
    res.status(500).json({ success: false, error: '更新巡查记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM inspections WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除巡查记录失败' });
  }
});

export default router;
