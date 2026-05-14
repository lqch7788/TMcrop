/**
 * 生产计划 API 路由
 * 提供生产计划的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// ============================================
// 辅助函数
// ============================================

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * API字段映射：queryToObjects返回的camelCase字段 -> 前端期望的字段名
 * 注意：queryToObjects已经将数据库snake_case转为camelCase，所以这里直接映射camelCase字段
 */
function mapFieldsToFrontend(item: Record<string, unknown>): Record<string, unknown> {
  const fieldMap: Record<string, string> = {
    // id保持不变
    id: 'id',
    // planCode -> batchCode (前端期望)
    planCode: 'batchCode',
    planName: 'batchName',
    planType: 'planType',
    cropName: 'cropName',
    // cropVariety -> variety (前端期望)
    cropVariety: 'variety',
    greenhouseName: 'greenhouseName',
    greenhouseId: 'greenhouseId',
    areaName: 'areaName',
    areaId: 'areaId',
    plannedQuantity: 'targetQuantity',
    actualQuantity: 'actualYield',
    plantingDate: 'startDate',
    expectedHarvestDate: 'expectedHarvestDate',
    actualHarvestDate: 'actualHarvestDate',
    plantingArea: 'plantingArea',
    plantingMode: 'plantingMode',
    responsiblePerson: 'responsiblePerson',
    status: 'status',
    stage: 'stage',
    stageName: 'stageName',
    targetYield: 'targetYield',
    actualYield: 'actualYield',
    priority: 'priority',
    remarks: 'remarks',
    createBy: 'publisher',
    createTime: 'createTime',
    updateTime: 'updateTime',
    // 额外字段
    planDetail: 'planDetail',
    locationName: 'locationName',
    targetQuantity: 'targetQuantity',
    unit: 'unit',
    supplierName: 'supplierName',
    seedQuantity: 'seedQuantity',
    seedlingSiteName: 'seedlingSiteName',
    targetSeedlingCount: 'targetSeedlingCount',
    endType: 'endType',
    batchStatus: 'batchStatus',
    planDetailFileName: 'planDetailFileName',
  };

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    const mappedKey = fieldMap[key] || key;
    result[mappedKey] = value;
  }
  return result;
}

/**
 * 将数组中所有对象进行字段转换
 */
function mapArrayToFrontend(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return items.map(item => mapFieldsToFrontend(item));
}

/**
 * 生成生产计划编码
 */
function generatePlanCode(type: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const typePrefix = type ? type.substring(0, 2).toUpperCase() : 'PP';
  return `PP${year}${month}${day}${typePrefix}${seq}`;
}

// ============================================
// 生产计划基础 API
// ============================================

/**
 * 获取所有生产计划
 * GET /api/production-plans
 * Query: crop_name, status, plan_type, keyword, page, limit
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      crop_name,
      status,
      plan_type,
      keyword,
      page = 1,
      limit = 50
    } = req.query;

    let sql = 'SELECT * FROM production_plans WHERE 1=1';
    const params: (string | number)[] = [];

    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (plan_type) {
      sql += ' AND plan_type = ?';
      params.push(plan_type as string);
    }

    if (keyword) {
      sql += ' AND (plan_code LIKE ? OR crop_name LIKE ? OR plan_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

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

    // 转换字段格式为camelCase
    const camelItems = mapArrayToFrontend(items as Record<string, unknown>[]);

    res.json({
      success: true,
      data: camelItems,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取生产计划列表失败:', error);
    res.status(500).json({ success: false, error: '获取生产计划列表失败' });
  }
});

/**
 * 获取单个生产计划
 * GET /api/production-plans/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const items = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM production_plans WHERE id = ?',
      [id]
    );

    if (!items || items.length === 0) {
      return res.status(404).json({ success: false, error: '生产计划不存在' });
    }

    // 转换字段格式为前端期望格式
    const camelItem = mapFieldsToFrontend(items[0]);
    res.json({ success: true, data: camelItem });
  } catch (error) {
    console.error('获取生产计划详情失败:', error);
    res.status(500).json({ success: false, error: '获取生产计划详情失败' });
  }
});

/**
 * 创建生产计划
 * POST /api/production-plans
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      id,
      batchCode,
      batchName,
      planType,
      cropName,
      variety,
      greenhouseName,
      greenhouseId,
      areaName,
      areaId,
      targetQuantity,
      targetYield,
      actualYield,
      startDate,
      expectedHarvestDate,
      actualHarvestDate,
      status,
      priority,
      remarks,
      publisher,
      createBy,
      responsiblePerson,
      unit,
      publishDate,
      batchStatus,
      planDetail,
      planDetailFileName,
      plantingArea,
      plantingMode,
      supplierName,
      seedlingSiteName,
      seedQuantity,
      targetSeedlingCount
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: '生产计划ID不能为空' });
    }

    const now = new Date().toISOString();
    const code = batchCode || generatePlanCode(planType);

    db.run(`
      INSERT INTO production_plans (
        id, plan_code, plan_name, plan_type, crop_name, crop_variety,
        greenhouse_name, area_name, planned_quantity, actual_quantity,
        planting_date, expected_harvest_date, actual_harvest_date,
        status, priority, remarks, create_by, create_time, update_time,
        responsible_person, unit, publish_date, batch_status,
        plan_detail, plan_detail_file_name, planting_area, planting_mode,
        supplier_name, seedling_site_name, seed_quantity, target_seedling_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      code,
      batchName || '',
      planType || '',
      cropName || '',
      variety || '',
      greenhouseName || '',
      areaName || '',
      targetQuantity || targetYield || 0,
      actualYield || 0,
      startDate || '',
      expectedHarvestDate || '',
      actualHarvestDate || '',
      status || 'planning',
      priority || 'normal',
      remarks || '',
      publisher || createBy || '',
      now,
      now,
      responsiblePerson || '',
      unit || '',
      publishDate || '',
      batchStatus || 'draft',
      planDetail || '',
      planDetailFileName || '',
      plantingArea || 0,
      plantingMode || '',
      supplierName || '',
      seedlingSiteName || '',
      seedQuantity || 0,
      targetSeedlingCount || 0
    ]);

    saveDatabase();

    res.status(201).json({ success: true, message: '生产计划创建成功', id, code });
  } catch (error) {
    console.error('创建生产计划失败:', error);
    res.status(500).json({ success: false, error: '创建生产计划失败' });
  }
});

/**
 * 更新生产计划
 * PUT /api/production-plans/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 先查询当前数据
    const stmt = db.prepare('SELECT * FROM production_plans WHERE id = ?');
    stmt.bind([id]);
    let plan: Record<string, unknown> | null = null;
    if (stmt.step()) {
      plan = stmt.getAsObject();
    }
    stmt.free();

    if (!plan) {
      return res.status(404).json({ success: false, error: '生产计划不存在' });
    }

    // 构建更新字段映射 (camelCase -> snake_case)
    const fieldMap: Record<string, string> = {
      planCode: 'plan_code',
      planName: 'plan_name',
      planType: 'plan_type',
      cropName: 'crop_name',
      variety: 'crop_variety',
      cropVariety: 'crop_variety',
      greenhouseName: 'greenhouse_name',
      areaName: 'area_name',
      plannedQuantity: 'planned_quantity',
      targetQuantity: 'planned_quantity',
      targetYield: 'planned_quantity',
      actualQuantity: 'actual_quantity',
      plantingDate: 'planting_date',
      expectedHarvestDate: 'expected_harvest_date',
      actualHarvestDate: 'actual_harvest_date',
      status: 'status',
      priority: 'priority',
      remarks: 'remarks',
      createBy: 'create_by',
      responsiblePerson: 'responsible_person',
      unit: 'unit',
      publishDate: 'publish_date',
      batchStatus: 'batch_status',
      planDetail: 'plan_detail',
      planDetailFileName: 'plan_detail_file_name',
      plantingArea: 'planting_area',
      plantingMode: 'planting_mode',
      supplierName: 'supplier_name',
      seedlingSiteName: 'seedling_site_name',
      seedQuantity: 'seed_quantity',
      targetSeedlingCount: 'target_seedling_count'
    };

    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;

      const dbField = fieldMap[key] || key;
      updateFields.push(`${dbField} = ?`);
      values.push(value as string | number | null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    updateFields.push('update_time = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE production_plans SET ${updateFields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    // 查询更新后的完整数据并返回（自动 camelCase 转换）
    const updatedPlans = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM production_plans WHERE id = ?',
      [id]
    );
    const updatedData = updatedPlans.length > 0 ? mapFieldsToFrontend(updatedPlans[0]) : null;

    res.json({ success: true, message: '生产计划更新成功', data: updatedData });
  } catch (error) {
    console.error('更新生产计划失败:', error);
    res.status(500).json({ success: false, error: '更新生产计划失败' });
  }
});

/**
 * 删除生产计划
 * DELETE /api/production-plans/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查生产计划是否存在
    const stmt = db.prepare('SELECT * FROM production_plans WHERE id = ?');
    stmt.bind([id]);
    let plan: Record<string, unknown> | null = null;
    if (stmt.step()) {
      plan = stmt.getAsObject();
    }
    stmt.free();

    if (!plan) {
      return res.status(404).json({ success: false, error: '生产计划不存在' });
    }

    // 只允许删除草稿或已取消的计划（检查 batch_status 字段）
    if (plan.batch_status !== 'draft' && plan.batch_status !== 'cancelled') {
      return res.status(400).json({ success: false, error: '只允许删除草稿或已取消的生产计划' });
    }

    db.run('DELETE FROM production_plans WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '生产计划删除成功' });
  } catch (error) {
    console.error('删除生产计划失败:', error);
    res.status(500).json({ success: false, error: '删除生产计划失败' });
  }
});

// ============================================
// 生产计划统计 API
// ============================================

/**
 * 获取生产计划统计数据
 * GET /api/production-plans/stats/summary
 */
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(planned_quantity) as total_planned,
        SUM(actual_quantity) as total_actual
      FROM production_plans
    `;

    const stmt = db.prepare(sql);
    stmt.step();
    const stats = stmt.getAsObject();
    stmt.free();

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取生产计划统计失败:', error);
    res.status(500).json({ success: false, error: '获取生产计划统计失败' });
  }
});

export default router;
