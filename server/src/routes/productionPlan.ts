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
 * 数据库字段映射：snake_case -> camelCase
 * 用于将后端数据库字段转换为前端期望的格式
 * 完整支持 CropBatch 类型的所有字段
 */
function mapFieldsToCamelCase(item: Record<string, unknown>): Record<string, unknown> {
  const fieldMap: Record<string, string> = {
    id: 'id',
    plan_code: 'batchCode',
    plan_name: 'batchName',
    plan_type: 'planType',
    crop_name: 'cropName',
    crop_variety: 'variety',
    greenhouse_name: 'greenhouseName',
    greenhouse_id: 'greenhouseId',
    area_name: 'areaName',
    area_id: 'areaId',
    planned_quantity: 'plannedQuantity',
    actual_quantity: 'actualQuantity',
    planting_date: 'startDate',
    expected_harvest_date: 'expectedHarvestDate',
    actual_harvest_date: 'actualHarvestDate',
    planting_area: 'plantingArea',
    planting_mode: 'plantingMode',
    responsible_person: 'responsiblePerson',
    status: 'status',
    stage: 'stage',
    stage_name: 'stageName',
    target_yield: 'targetYield',
    actual_yield: 'actualYield',
    priority: 'priority',
    remarks: 'remarks',
    create_by: 'publisher',
    create_time: 'createTime',
    update_time: 'updateTime',
    // 额外字段
    plan_detail: 'planDetail',
    location_name: 'locationName',
    target_quantity: 'targetQuantity',
    unit: 'unit',
    supplier_name: 'supplierName',
    seed_quantity: 'seedQuantity',
    seedling_site_name: 'seedlingSiteName',
    target_seedling_count: 'targetSeedlingCount',
    end_type: 'endType',
  };

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    const camelKey = fieldMap[key] || key;
    result[camelKey] = value;
  }
  return result;
}

/**
 * 将数组中所有对象进行字段转换
 */
function mapArrayToCamelCase(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return items.map(item => mapFieldsToCamelCase(item));
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
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    // 转换字段格式为camelCase
    const camelItems = mapArrayToCamelCase(items as Record<string, unknown>[]);

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

    const stmt = db.prepare('SELECT * FROM production_plans WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '生产计划不存在' });
    }

    // 转换字段格式为camelCase
    const camelItem = mapFieldsToCamelCase(item);
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
      plan_code,
      plan_name,
      plan_type,
      crop_name,
      crop_variety,
      greenhouse_name,
      area_name,
      planned_quantity,
      actual_quantity,
      planting_date,
      expected_harvest_date,
      actual_harvest_date,
      status,
      priority,
      remarks,
      create_by
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: '生产计划ID不能为空' });
    }

    const now = new Date().toISOString();
    const code = plan_code || generatePlanCode(plan_type);

    db.run(`
      INSERT INTO production_plans (
        id, plan_code, plan_name, plan_type, crop_name, crop_variety,
        greenhouse_name, area_name, planned_quantity, actual_quantity,
        planting_date, expected_harvest_date, actual_harvest_date,
        status, priority, remarks, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      code,
      plan_name || '',
      plan_type || '',
      crop_name || '',
      crop_variety || '',
      greenhouse_name || '',
      area_name || '',
      planned_quantity || 0,
      actual_quantity || 0,
      planting_date || '',
      expected_harvest_date || '',
      actual_harvest_date || '',
      status || 'planning',
      priority || 'normal',
      remarks || '',
      create_by || '',
      now,
      now
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
      cropVariety: 'crop_variety',
      greenhouseName: 'greenhouse_name',
      areaName: 'area_name',
      plannedQuantity: 'planned_quantity',
      actualQuantity: 'actual_quantity',
      plantingDate: 'planting_date',
      expectedHarvestDate: 'expected_harvest_date',
      actualHarvestDate: 'actual_harvest_date',
      status: 'status',
      priority: 'priority',
      remarks: 'remarks',
      createBy: 'create_by'
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

    res.json({ success: true, message: '生产计划更新成功' });
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

    // 只允许删除草稿或已取消的计划
    if (plan.status !== 'draft' && plan.status !== 'cancelled') {
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
