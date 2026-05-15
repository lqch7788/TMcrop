/**
 * 巡查记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

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
    issueStatus: db.issueStatus || db.issue_status || (db.status === 'attention' ? 'pending' : 'resolved'),
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

    // 转换字段，补充缺失字段默认值
    const transformed = items.map(transformInspectionRecord);

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

    res.json({ success: true, data: transformInspectionRecord(item) });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取巡查详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, record_code, inspection_type, inspector_id, inspector_name, greenhouse_name,
            check_date, check_time, check_result, issue_severity, issue_text, images, status,
            feedbackUsers } = req.body;

    const newId = id || `INS${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO inspections (id, record_code, inspection_type, inspector_id, inspector_name, greenhouse_name,
        check_date, check_time, check_result, issue_severity, issue_text, images, status, feedback_users, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, record_code, inspection_type, inspector_id, inspector_name, greenhouse_name,
        check_date, check_time, check_result, issue_severity, issue_text, images, status || 'pending',
        feedbackUsers ? JSON.stringify(feedbackUsers) : null, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建巡查记录失败:', error);
    res.status(500).json({ success: false, error: '创建巡查记录失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // 特殊处理：feedbackUsers 序列化为 JSON 字符串存储
    if ('feedbackUsers' in updates) {
      updates.feedback_users = Array.isArray(updates.feedbackUsers)
        ? JSON.stringify(updates.feedbackUsers) : null;
      delete updates.feedbackUsers;
    }
    // 移除 id 字段防止更新主键
    delete updates.id;

    const now = new Date().toISOString();
    const db = getDatabase();

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values: any[] = Object.values(updates);
    values.push(now, id);

    db.run(`UPDATE inspections SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
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
