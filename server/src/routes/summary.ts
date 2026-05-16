/**
 * 生产汇总统计 API 路由
 * 提供批次汇总、产量统计、成本统计、人工统计等接口
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// ========== 参数验证辅助函数 ==========

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return true; // 可选的日期
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 验证分页参数
 */
function validatePagination(page: any, limit: any): { page: number; limit: number; error?: string } {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;

  if (pageNum < 1) {
    return { page: 1, limit: limitNum, error: '页码不能小于1' };
  }
  if (limitNum < 1 || limitNum > 100) {
    return { page: pageNum, limit: 20, error: '每页数量必须在1-100之间' };
  }

  return { page: pageNum, limit: limitNum };
}

/**
 * 验证 group_by 参数
 */
function validateGroupBy(groupBy: string, allowedValues: string[]): string {
  if (!groupBy || !allowedValues.includes(groupBy)) {
    return allowedValues[0]; // 返回默认值
  }
  return groupBy;
}

/**
 * 构造分页 SQL 片段（参数化版本，防止SQL注入）
 */
function addPagination(sql: string, page: number, limit: number, params: any[]): string {
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  return `${sql} LIMIT ? OFFSET ?`;
}

/**
 * 获取批次汇总统计
 * GET /api/summary/batch-stats
 * 关联 production_plans, plantings, harvest_records, farm_tasks, labor_records
 * 支持分页和参数验证
 */
router.get('/batch-stats', (req: Request, res: Response) => {
  try {
    const { crop_name, status, greenhouse_name, start_date, end_date, page = 1, limit = 20 } = req.query;

    // 参数验证
    const pagination = validatePagination(page, limit);
    if (start_date && !isValidDate(start_date as string)) {
      return res.status(400).json({ success: false, error: '开始日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    if (end_date && !isValidDate(end_date as string)) {
      return res.status(400).json({ success: false, error: '结束日期格式无效，请使用 YYYY-MM-DD 格式' });
    }

    const db = getDatabase();

    // 构建 WHERE 条件（不包含 GROUP BY 前的部分）
    let whereClause = 'WHERE 1=1';
    const countParams: any[] = [];
    const params: any[] = [];

    if (crop_name) {
      whereClause += ' AND pp.crop_name LIKE ?';
      countParams.push(`%${crop_name}%`);
      params.push(`%${crop_name}%`);
    }
    if (status) {
      whereClause += ' AND pp.status = ?';
      countParams.push(status);
      params.push(status);
    }
    if (greenhouse_name) {
      whereClause += ' AND pp.greenhouse_name LIKE ?';
      countParams.push(`%${greenhouse_name}%`);
      params.push(`%${greenhouse_name}%`);
    }
    if (start_date) {
      whereClause += ' AND pp.planting_date >= ?';
      countParams.push(start_date);
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND pp.planting_date <= ?';
      countParams.push(end_date);
      params.push(end_date);
    }

    // 基础 SQL（不含分页）
    // 注意: plantings 通过 source_id 连接 seedlings, seedlings 通过 production_plan_code 连接 production_plans
    // 由于 harvest_records.source_id 为空，JOIN 时同时使用 greenhouse_name + crop_name 作为备选匹配条件
    const baseSql = `
      SELECT
        pp.id,
        pp.plan_code as batchCode,
        pp.plan_name as batchName,
        pp.crop_name as cropName,
        pp.crop_variety as variety,
        pp.greenhouse_name as greenhouse,
        pp.area_name as plantingArea,
        pp.planned_quantity as targetYield,
        pp.actual_quantity as actualQuantity,
        COALESCE(SUM(hr.harvest_quantity), 0) as harvestQuantity,
        CASE
          WHEN pp.planned_quantity > 0
          THEN ROUND(COALESCE(SUM(hr.harvest_quantity), 0) * 100.0 / pp.planned_quantity, 1)
          ELSE 0
        END as completionRate,
        pp.status,
        pp.planting_date,
        pp.expected_harvest_date,
        pp.actual_harvest_date,
        COUNT(DISTINCT ft.id) as taskCount,
        COUNT(DISTINCT CASE WHEN ft.status = 'completed' THEN ft.id END) as completedTaskCount,
        COUNT(DISTINCT CASE WHEN ft.status = 'pending' THEN ft.id END) as pendingTaskCount,
        COUNT(DISTINCT CASE WHEN ft.status = 'in_progress' THEN ft.id END) as inProgressTaskCount,
        COALESCE(SUM(lr.work_hours), 0) as totalWorkHours,
        COALESCE(SUM(lr.total_amount), 0) as laborCost,
        pp.planned_quantity - COALESCE(SUM(hr.harvest_quantity), 0) as remainingYield,
        -- 全链条追溯阶段标记：标识批次在各环节是否有数据
        CASE WHEN COUNT(DISTINCT ss.id) > 0 THEN 1 ELSE 0 END as hasSeedSource,
        CASE WHEN COUNT(DISTINCT s.id) > 0 THEN 1 ELSE 0 END as hasSeedling,
        CASE WHEN COUNT(DISTINCT pl.id) > 0 THEN 1 ELSE 0 END as hasPlanting
      FROM production_plans pp
      LEFT JOIN seed_sources ss ON ss.production_plan_code = pp.plan_code
      LEFT JOIN seedlings s ON s.source_id = ss.id
      LEFT JOIN plantings pl ON pl.source_id = s.id
      LEFT JOIN harvest_records hr ON hr.source_id = pl.id OR (hr.greenhouse_name = pp.greenhouse_name AND hr.crop_name = pp.crop_name)
      LEFT JOIN farm_tasks ft ON ft.greenhouse_name = pp.greenhouse_name AND ft.source_type = 'planting' AND ft.source_id = pl.id
      LEFT JOIN labor_records lr ON lr.greenhouse_name = pp.greenhouse_name AND lr.task_description LIKE '%' || pp.plan_code || '%'
      ${whereClause}
    `;

    // 完整 SQL（包含 GROUP BY 和分页）
    const sql = addPagination(`${baseSql} GROUP BY pp.id ORDER BY pp.create_time DESC`, pagination.page, pagination.limit, params);

    // 获取总数
    const countSql = `SELECT COUNT(DISTINCT pp.id) as total FROM production_plans pp LEFT JOIN seed_sources ss ON ss.production_plan_code = pp.plan_code LEFT JOIN seedlings s ON s.source_id = ss.id ${whereClause}`;
    const countResult = queryToObjects(db, countSql, countParams);
    const total = countResult[0]?.total || 0;

    const items = queryToObjects(db, sql, params);

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit)
      }
    });
  } catch (error) {
    console.error('获取批次统计失败:', error);
    res.status(500).json({ success: false, error: '获取批次统计失败' });
  }
});

/**
 * 获取产量统计
 * GET /api/summary/yield-stats
 * 支持 group_by: month, crop, greenhouse, quality
 */
router.get('/yield-stats', (req: Request, res: Response) => {
  try {
    const { start_date, end_date, group_by = 'month', crop_name, greenhouse_name, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 参数验证
    const pagination = validatePagination(page, limit);
    if (start_date && !isValidDate(start_date as string)) {
      return res.status(400).json({ success: false, error: '开始日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    if (end_date && !isValidDate(end_date as string)) {
      return res.status(400).json({ success: false, error: '结束日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    const validGroupBy = validateGroupBy(group_by as string, ['month', 'crop', 'greenhouse', 'quality']);

    let sql: string;
    const params: any[] = [];

    if (group_by === 'crop') {
      // 按作物分组
      sql = `
        SELECT
          hr.crop_name as name,
          SUM(hr.harvest_quantity) as value,
          COUNT(*) as count,
          AVG(hr.unit_price) as avg_price,
          SUM(hr.total_amount) as total_amount
        FROM harvest_records hr
        WHERE hr.status = 'completed' AND hr.harvest_quantity > 0
      `;
    } else if (validGroupBy === 'greenhouse') {
      // 按温室分组
      sql = `
        SELECT
          hr.greenhouse_name as name,
          SUM(hr.harvest_quantity) as value,
          COUNT(*) as count,
          AVG(hr.unit_price) as avg_price,
          SUM(hr.total_amount) as total_amount
        FROM harvest_records hr
        WHERE hr.status = 'completed' AND hr.harvest_quantity > 0
      `;
    } else if (validGroupBy === 'quality') {
      // 按质量等级分组
      sql = `
        SELECT
          hr.quality_grade as name,
          SUM(hr.harvest_quantity) as value,
          COUNT(*) as count,
          AVG(hr.unit_price) as avg_price,
          SUM(hr.total_amount) as total_amount
        FROM harvest_records hr
        WHERE hr.status = 'completed' AND hr.harvest_quantity > 0
      `;
    } else {
      // 按月份分组（默认）
      sql = `
        SELECT
          strftime('%Y-%m', hr.harvest_date) as name,
          strftime('%Y', hr.harvest_date) as year,
          strftime('%m', hr.harvest_date) as month,
          SUM(hr.harvest_quantity) as value,
          COUNT(*) as count,
          AVG(hr.unit_price) as avg_price,
          SUM(hr.total_amount) as total_amount
        FROM harvest_records hr
        WHERE hr.status = 'completed' AND hr.harvest_quantity > 0
      `;
    }

    if (start_date) {
      sql += ' AND hr.harvest_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND hr.harvest_date <= ?';
      params.push(end_date);
    }
    if (crop_name) {
      sql += ' AND hr.crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }
    if (greenhouse_name) {
      sql += ' AND hr.greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    if (validGroupBy === 'crop') {
      sql += ' GROUP BY hr.crop_name ORDER BY value DESC';
    } else if (validGroupBy === 'greenhouse') {
      sql += ' GROUP BY hr.greenhouse_name ORDER BY value DESC';
    } else if (validGroupBy === 'quality') {
      sql += ' GROUP BY hr.quality_grade ORDER BY value DESC';
    } else {
      sql += ' GROUP BY strftime("%Y-%m", hr.harvest_date) ORDER BY name DESC';
    }

    // 添加分页
    const filterParamCount = params.length;
    const paginatedSql = addPagination(sql, pagination.page, pagination.limit, params);

    const items = queryToObjects(db, paginatedSql, params);

    const countParams = params.slice(0, filterParamCount);
    // 获取总数
    const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM').split('GROUP BY')[0] + 'GROUP BY ' + sql.split('GROUP BY')[1].split('ORDER BY')[0];
    const countResult = queryToObjects(db, countSql, countParams);
    const total = countResult.length;

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit)
      }
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: `获取产量统计失败: ${errMsg}` });
  }
});

/**
 * 获取成本统计
 * GET /api/summary/cost-stats
 * 整合人工成本、物料成本和能源成本
 */
router.get('/cost-stats', (req: Request, res: Response) => {
  try {
    const { start_date, end_date, batch_code, cost_type, group_by = 'month' } = req.query;

    // 参数验证
    if (start_date && !isValidDate(start_date as string)) {
      return res.status(400).json({ success: false, error: '开始日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    if (end_date && !isValidDate(end_date as string)) {
      return res.status(400).json({ success: false, error: '结束日期格式无效，请使用 YYYY-MM-DD 格式' });
    }

    const db = getDatabase();
    const results: any = {};
    const summary: any = {
      total_labor_cost: 0,
      total_material_cost: 0,
      total_energy_cost: 0,
      total_cost: 0,
      total_work_hours: 0,
    };

    // 1. 人工成本统计
    if (!cost_type || cost_type === 'labor' || cost_type === 'all') {
      let laborSql = `
        SELECT
          'labor' as cost_category,
          '人工成本' as cost_type,
          strftime('%Y-%m', lr.work_date) as month,
          SUM(lr.work_hours) as work_hours,
          SUM(lr.total_amount) as total_amount,
          COUNT(DISTINCT lr.worker_id) as worker_count
        FROM labor_records lr
        WHERE lr.status = 'completed' AND lr.work_hours > 0
      `;
      const laborParams: any[] = [];

      if (start_date) {
        laborSql += ' AND lr.work_date >= ?';
        laborParams.push(start_date);
      }
      if (end_date) {
        laborSql += ' AND lr.work_date <= ?';
        laborParams.push(end_date);
      }
      if (batch_code) {
        laborSql += ' AND lr.task_description LIKE ?';
        laborParams.push(`%${batch_code}%`);
      }

      laborSql += ' GROUP BY strftime("%Y-%m", lr.work_date) ORDER BY month DESC';
      const laborData = queryToObjects(db, laborSql, laborParams);
      results.labor = laborData;

      // 计算人工成本汇总（queryToObjects返回驼峰命名）
      laborData.forEach((item: any) => {
        summary.total_labor_cost += Number(item.totalAmount) || 0;
        summary.total_work_hours += Number(item.workHours) || 0;
      });
    }

    // 2. 物料成本统计
    if (!cost_type || cost_type === 'material' || cost_type === 'all') {
      let materialSql = `
        SELECT
          'material' as cost_category,
          mc.cost_type,
          mc.cost_type as cost_type_code,
          mc.cost_name,
          strftime('%Y-%m', mc.cost_date) as month,
          SUM(mc.quantity) as total_quantity,
          SUM(mc.total_amount) as total_amount,
          COUNT(*) as record_count
        FROM material_costs mc
        WHERE 1=1
      `;
      const materialParams: any[] = [];

      if (start_date) {
        materialSql += ' AND mc.cost_date >= ?';
        materialParams.push(start_date);
      }
      if (end_date) {
        materialSql += ' AND mc.cost_date <= ?';
        materialParams.push(end_date);
      }
      if (batch_code) {
        materialSql += ' AND mc.batch_code LIKE ?';
        materialParams.push(`%${batch_code}%`);
      }
      if (cost_type && cost_type !== 'all' && cost_type !== 'material') {
        materialSql += ' AND mc.cost_type = ?';
        materialParams.push(cost_type);
      }

      materialSql += ' GROUP BY mc.cost_type, strftime("%Y-%m", mc.cost_date) ORDER BY month DESC';
      const materialData = queryToObjects(db, materialSql, materialParams);
      results.material = materialData;

      // 计算物料成本汇总（queryToObjects返回驼峰命名）
      materialData.forEach((item: any) => {
        summary.total_material_cost += Number(item.totalAmount) || 0;
      });
    }

    // 3. 能源成本统计
    if (!cost_type || cost_type === 'energy' || cost_type === 'all') {
      let energySql = `
        SELECT
          'energy' as cost_category,
          ec.cost_type,
          ec.cost_type as cost_type_code,
          strftime('%Y-%m', ec.cost_date) as month,
          SUM(ec.quantity) as total_quantity,
          SUM(ec.total_amount) as total_amount,
          COUNT(*) as record_count
        FROM energy_costs ec
        WHERE 1=1
      `;
      const energyParams: any[] = [];

      if (start_date) {
        energySql += ' AND ec.cost_date >= ?';
        energyParams.push(start_date);
      }
      if (end_date) {
        energySql += ' AND ec.cost_date <= ?';
        energyParams.push(end_date);
      }
      if (batch_code) {
        energySql += ' AND ec.batch_code LIKE ?';
        energyParams.push(`%${batch_code}%`);
      }

      energySql += ' GROUP BY ec.cost_type, strftime("%Y-%m", ec.cost_date) ORDER BY month DESC';
      const energyData = queryToObjects(db, energySql, energyParams);
      results.energy = energyData;

      // 计算能源成本汇总（queryToObjects返回驼峰命名）
      energyData.forEach((item: any) => {
        summary.total_energy_cost += Number(item.totalAmount) || 0;
      });
    }

    // 计算总成本
    summary.total_cost = summary.total_labor_cost + summary.total_material_cost + summary.total_energy_cost;
    summary.avg_hourly_rate = summary.total_work_hours > 0
      ? Math.round(summary.total_labor_cost / summary.total_work_hours * 100) / 100
      : 0;

    res.json({
      success: true,
      data: results,
      summary
    });
  } catch (error) {
    console.error('获取成本统计失败:', error);
    res.status(500).json({ success: false, error: '获取成本统计失败' });
  }
});

/**
 * 获取人工工时统计
 * GET /api/summary/labor-stats
 * 支持分页和参数验证
 */
router.get('/labor-stats', (req: Request, res: Response) => {
  try {
    const { start_date, end_date, group_by = 'month', greenhouse_name, worker_name, page = 1, limit = 50 } = req.query;

    // 参数验证
    const pagination = validatePagination(page, limit);
    if (start_date && !isValidDate(start_date as string)) {
      return res.status(400).json({ success: false, error: '开始日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    if (end_date && !isValidDate(end_date as string)) {
      return res.status(400).json({ success: false, error: '结束日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    const validGroupBy = validateGroupBy(group_by as string, ['month', 'worker', 'greenhouse', 'task']);

    const db = getDatabase();

    let sql: string;
    const params: any[] = [];

    if (validGroupBy === 'worker') {
      // 按工人分组
      sql = `
        SELECT
          lr.worker_name as name,
          SUM(lr.work_hours) as hours,
          SUM(lr.total_amount) as amount,
          COUNT(*) as work_count,
          AVG(lr.work_hours) as avg_daily_hours
        FROM labor_records lr
        WHERE lr.status = 'completed' AND lr.work_hours > 0
      `;
    } else if (validGroupBy === 'greenhouse') {
      // 按温室分组
      sql = `
        SELECT
          lr.greenhouse_name as name,
          SUM(lr.work_hours) as hours,
          SUM(lr.total_amount) as amount,
          COUNT(DISTINCT lr.worker_id) as worker_count
        FROM labor_records lr
        WHERE lr.status = 'completed' AND lr.work_hours > 0
      `;
    } else if (validGroupBy === 'task') {
      // 按任务类型分组
      sql = `
        SELECT
          lr.task_description as name,
          SUM(lr.work_hours) as hours,
          SUM(lr.total_amount) as amount,
          COUNT(*) as task_count
        FROM labor_records lr
        WHERE lr.status = 'completed' AND lr.work_hours > 0
      `;
    } else {
      // 按月份分组（默认）
      sql = `
        SELECT
          strftime('%Y-%m', lr.work_date) as name,
          strftime('%Y', lr.work_date) as year,
          strftime('%m', lr.work_date) as month,
          SUM(lr.work_hours) as hours,
          SUM(lr.total_amount) as amount,
          COUNT(DISTINCT lr.worker_id) as worker_count,
          AVG(lr.work_hours) as avg_daily_hours
        FROM labor_records lr
        WHERE lr.status = 'completed' AND lr.work_hours > 0
      `;
    }

    if (start_date) {
      sql += ' AND lr.work_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND lr.work_date <= ?';
      params.push(end_date);
    }
    if (greenhouse_name) {
      sql += ' AND lr.greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }
    if (worker_name) {
      sql += ' AND lr.worker_name LIKE ?';
      params.push(`%${worker_name}%`);
    }

    if (validGroupBy === 'worker') {
      sql += ' GROUP BY lr.worker_name ORDER BY hours DESC';
    } else if (validGroupBy === 'greenhouse') {
      sql += ' GROUP BY lr.greenhouse_name ORDER BY hours DESC';
    } else if (validGroupBy === 'task') {
      sql += ' GROUP BY lr.task_description ORDER BY hours DESC';
    } else {
      sql += ' GROUP BY strftime("%Y-%m", lr.work_date) ORDER BY name DESC';
    }

    // 添加分页
    const paginatedSql = addPagination(sql, pagination.page, pagination.limit, params);

    const items = queryToObjects(db, paginatedSql, params);

    // 构建独立的汇总查询（不依赖原SQL字符串操作）
    let summaryWhere = 'WHERE 1=1 AND lr.status = \'completed\' AND lr.work_hours > 0';
    const summaryParams: any[] = [];
    if (start_date) {
      summaryWhere += ' AND lr.work_date >= ?';
      summaryParams.push(start_date);
    }
    if (end_date) {
      summaryWhere += ' AND lr.work_date <= ?';
      summaryParams.push(end_date);
    }
    if (greenhouse_name) {
      summaryWhere += ' AND lr.greenhouse_name LIKE ?';
      summaryParams.push(`%${greenhouse_name}%`);
    }
    if (worker_name) {
      summaryWhere += ' AND lr.worker_name LIKE ?';
      summaryParams.push(`%${worker_name}%`);
    }

    const summarySql = `SELECT
      COUNT(*) as record_count,
      SUM(lr.work_hours) as total_hours,
      SUM(lr.total_amount) as total_amount
    FROM labor_records lr
    ${summaryWhere}`;
    const summaryResult = queryToObjects(db, summarySql, summaryParams);
    const totalHours = Number(summaryResult[0]?.totalHours) || 0;
    const totalAmount = Number(summaryResult[0]?.totalAmount) || 0;

    res.json({
      success: true,
      data: {
        details: items,
        summary: {
          total_hours: Math.round(totalHours * 100) / 100,
          total_amount: Math.round(totalAmount * 100) / 100,
          avg_hourly_rate: totalHours > 0 ? Math.round(totalAmount / totalHours * 100) / 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('获取人工统计失败:', error);
    res.status(500).json({ success: false, error: '获取人工统计失败' });
  }
});

/**
 * 获取生产报表概览（供生产报表页面使用）
 * GET /api/summary/overview
 */
router.get('/overview', (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    // 参数验证
    if (start_date && !isValidDate(start_date as string)) {
      return res.status(400).json({ success: false, error: '开始日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    if (end_date && !isValidDate(end_date as string)) {
      return res.status(400).json({ success: false, error: '结束日期格式无效，请使用 YYYY-MM-DD 格式' });
    }

    const db = getDatabase();

    // 获取本月产量
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = start_date || monthStart.toISOString().split('T')[0];
    const monthEndStr = end_date || new Date().toISOString().split('T')[0];

    // 本月采收统计
    const monthHarvestSql = `
      SELECT
        COUNT(*) as harvest_count,
        COALESCE(SUM(harvest_quantity), 0) as total_yield,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM harvest_records
      WHERE status = 'completed' AND harvest_date >= ? AND harvest_date <= ?
    `;
    const monthHarvest = queryToObjects(db, monthHarvestSql, [monthStartStr, monthEndStr]);

    // 本月任务统计
    const monthTaskSql = `
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
      FROM farm_tasks
      WHERE plan_date >= ? AND plan_date <= ?
    `;
    const monthTask = queryToObjects(db, monthTaskSql, [monthStartStr, monthEndStr]);

    // 本月人工工时
    const monthLaborSql = `
      SELECT
        COALESCE(SUM(work_hours), 0) as total_hours,
        COALESCE(SUM(total_amount), 0) as total_labor_cost
      FROM labor_records
      WHERE status = 'completed' AND work_date >= ? AND work_date <= ?
    `;
    const monthLabor = queryToObjects(db, monthLaborSql, [monthStartStr, monthEndStr]);

    // 本月问题统计
    const monthProblemSql = `
      SELECT
        COUNT(*) as total_problems,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as resolved_problems
      FROM problems
      WHERE create_time >= ? AND create_time <= ?
    `;
    const monthProblem = queryToObjects(db, monthProblemSql, [monthStartStr + ' 00:00:00', monthEndStr + ' 23:59:59']);

    // 活跃批次数量
    const activeBatchSql = `SELECT COUNT(*) as count FROM production_plans WHERE status IN ('planning', 'planted', 'in_progress')`;
    const activeBatch = queryToObjects(db, activeBatchSql, []);

    // 总批次数（所有生产计划，含已完成/已归档等）
    const totalBatchesSql = `SELECT COUNT(*) as count FROM production_plans`;
    const totalBatches = queryToObjects(db, totalBatchesSql, []);

    // 本月物料成本
    const monthMaterialCostSql = `
      SELECT COALESCE(SUM(total_amount), 0) as material_cost
      FROM material_costs
      WHERE cost_date >= ? AND cost_date <= ?
    `;
    const monthMaterialCost = queryToObjects(db, monthMaterialCostSql, [monthStartStr, monthEndStr]);

    // 本月能源成本
    const monthEnergyCostSql = `
      SELECT COALESCE(SUM(total_amount), 0) as energy_cost
      FROM energy_costs
      WHERE cost_date >= ? AND cost_date <= ?
    `;
    const monthEnergyCost = queryToObjects(db, monthEnergyCostSql, [monthStartStr, monthEndStr]);

    const data = {
      yield: {
        month_harvest_count: monthHarvest[0]?.harvest_count || 0,
        month_total_yield: monthHarvest[0]?.total_yield || 0,
        month_total_amount: monthHarvest[0]?.total_amount || 0
      },
      task: {
        total_tasks: monthTask[0]?.total_tasks || 0,
        completed_tasks: monthTask[0]?.completed_tasks || 0,
        in_progress_tasks: monthTask[0]?.in_progress_tasks || 0,
        pending_tasks: monthTask[0]?.pending_tasks || 0,
        completion_rate: monthTask[0]?.total_tasks > 0
          ? Math.round((monthTask[0]?.completed_tasks / monthTask[0]?.total_tasks) * 100)
          : 0
      },
      labor: {
        total_hours: monthLabor[0]?.total_hours || 0,
        total_labor_cost: monthLabor[0]?.total_labor_cost || 0
      },
      problem: {
        total_problems: monthProblem[0]?.total_problems || 0,
        resolved_problems: monthProblem[0]?.resolved_problems || 0,
        resolution_rate: monthProblem[0]?.total_problems > 0
          ? Math.round((monthProblem[0]?.resolved_problems / monthProblem[0]?.total_problems) * 100)
          : 0
      },
      batch: {
        active_count: activeBatch[0]?.count || 0,
        total_batches: totalBatches[0]?.count || 0
      },
      total_cost: (monthLabor[0]?.total_labor_cost || 0)
        + (monthMaterialCost[0]?.material_cost || 0)
        + (monthEnergyCost[0]?.energy_cost || 0)
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取生产报表概览失败:', error);
    res.status(500).json({ success: false, error: '获取生产报表概览失败' });
  }
});

/**
 * 获取生产指标统计（供管理指标页面使用）
 * GET /api/summary/indicators
 */
router.get('/indicators', (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    // 参数验证
    if (start_date && !isValidDate(start_date as string)) {
      return res.status(400).json({ success: false, error: '开始日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    if (end_date && !isValidDate(end_date as string)) {
      return res.status(400).json({ success: false, error: '结束日期格式无效，请使用 YYYY-MM-DD 格式' });
    }

    const db = getDatabase();

    const periodStart = start_date || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    const periodEnd = end_date || new Date().toISOString().split('T')[0];

    // 产量指标
    const yieldSql = `
      SELECT
        COALESCE(SUM(harvest_quantity), 0) as total_yield,
        COUNT(*) as harvest_count,
        AVG(harvest_quantity) as avg_yield_per_harvest
      FROM harvest_records
      WHERE status = 'completed' AND harvest_date >= ? AND harvest_date <= ?
    `;
    const yieldData = queryToObjects(db, yieldSql, [periodStart, periodEnd]);

    // 任务完成率
    const taskSql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM farm_tasks
      WHERE plan_date >= ? AND plan_date <= ?
    `;
    const taskData = queryToObjects(db, taskSql, [periodStart, periodEnd]);

    // 问题解决率
    const problemSql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as resolved
      FROM problems
      WHERE create_time >= ? AND create_time <= ?
    `;
    const problemData = queryToObjects(db, problemSql, [periodStart + ' 00:00:00', periodEnd + ' 23:59:59']);

    // 人工效率
    const laborSql = `
      SELECT
        COALESCE(SUM(work_hours), 0) as total_hours,
        COALESCE(SUM(total_amount), 0) as total_cost,
        COUNT(DISTINCT worker_id) as worker_count
      FROM labor_records
      WHERE status = 'completed' AND work_date >= ? AND work_date <= ?
    `;
    const laborData = queryToObjects(db, laborSql, [periodStart, periodEnd]);

    const taskCompletionRate = taskData[0]?.total > 0
      ? Math.round((taskData[0]?.completed / taskData[0]?.total) * 100)
      : 0;
    const problemResolutionRate = problemData[0]?.total > 0
      ? Math.round((problemData[0]?.resolved / problemData[0]?.total) * 100)
      : 0;
    const laborEfficiency = laborData[0]?.total_hours > 0
      ? Math.round((yieldData[0]?.total_yield / laborData[0]?.total_hours) * 100) / 100
      : 0;

    const data = {
      period: { start: periodStart, end: periodEnd },
      yield: {
        total_yield: yieldData[0]?.total_yield || 0,
        harvest_count: yieldData[0]?.harvest_count || 0,
        avg_yield_per_harvest: Math.round((yieldData[0]?.avg_yield_per_harvest || 0) * 100) / 100
      },
      task: {
        total: taskData[0]?.total || 0,
        completed: taskData[0]?.completed || 0,
        completion_rate: taskCompletionRate
      },
      problem: {
        total: problemData[0]?.total || 0,
        resolved: problemData[0]?.resolved || 0,
        resolution_rate: problemResolutionRate
      },
      labor: {
        total_hours: laborData[0]?.total_hours || 0,
        total_cost: laborData[0]?.total_cost || 0,
        worker_count: laborData[0]?.worker_count || 0,
        efficiency: laborEfficiency
      },
      // 综合评分（满分100）
      overall_score: Math.round((taskCompletionRate + problemResolutionRate) / 2)
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取生产指标失败:', error);
    res.status(500).json({ success: false, error: '获取生产指标失败' });
  }
});

/**
 * 全链条追溯概览 — 6环节数据独立统计
 * GET /api/summary/chain-overview
 * 生产计划→种源→育苗→种植→采收→库存，各环节独立取数
 */
router.get('/chain-overview', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // 生产计划 — 按状态统计
    const planStats = queryToObjects(db, `
      SELECT status, COUNT(*) as count FROM production_plans GROUP BY status
    `);
    const planTotal = planStats.reduce((s: number, r: any) => s + Number(r.count), 0);

    // 种源管理 — 列表+总数
    const seedItems = queryToObjects(db, `
      SELECT id, source_code as code, source_name as name, crop_name as cropName,
             crop_variety as variety, supplier_name as supplierName,
             quantity, unit, status, purchase_date as purchaseDate
      FROM seed_sources ORDER BY create_time DESC LIMIT 20
    `);
    const seedCount = seedItems.length;

    // 育苗管理 — 列表+总数+按状态分组
    const seedlingItems = queryToObjects(db, `
      SELECT id, seedling_code as code, crop_name as cropName, crop_variety as variety,
             greenhouse_name as greenhouse, seedling_quantity as quantity,
             survival_quantity as survivalQuantity, survival_rate as survivalRate,
             status, seedling_date as seedlingDate
      FROM seedlings ORDER BY create_time DESC LIMIT 20
    `);
    const seedlingStats = queryToObjects(db, `
      SELECT status, COUNT(*) as count FROM seedlings GROUP BY status
    `);
    const seedlingTotal = seedlingStats.reduce((s: number, r: any) => s + Number(r.count), 0);

    // 种植管理 — 列表+总数+按状态分组
    const plantingItems = queryToObjects(db, `
      SELECT id, planting_code as code, crop_name as cropName, crop_variety as variety,
             greenhouse_name as greenhouse, area_name as area,
             planting_quantity as quantity, growth_status as status,
             planting_date as plantingDate,
             expected_harvest_date as expectedHarvestDate
      FROM plantings ORDER BY create_time DESC LIMIT 20
    `);
    const plantingStats = queryToObjects(db, `
      SELECT status, COUNT(*) as count FROM plantings GROUP BY status
    `);
    const plantingTotal = plantingStats.reduce((s: number, r: any) => s + Number(r.count), 0);

    // 采收入库 — 记录列表+总量
    const harvestItems = queryToObjects(db, `
      SELECT id, harvest_code as code, crop_name as cropName, crop_variety as variety,
             greenhouse_name as greenhouse, harvest_quantity as quantity,
             unit_price as unitPrice, total_amount as totalAmount,
             quality_grade as qualityGrade, harvest_date as harvestDate, status
      FROM harvest_records ORDER BY harvest_date DESC LIMIT 20
    `);
    const harvestStats = queryToObjects(db, `
      SELECT COUNT(*) as count,
             COALESCE(SUM(harvest_quantity), 0) as totalQuantity
      FROM harvest_records
    `)[0];

    // 库存管理 — 物品列表+总量
    const inventoryItems = queryToObjects(db, `
      SELECT id, code, name, category, specification as spec, unit, quantity,
             price as unitPrice, (quantity * CAST(price AS REAL)) as totalAmount,
             location as warehouseName, dataStatus as status
      FROM materials WHERE quantity > 0 ORDER BY lastUpdateTime DESC LIMIT 20
    `);
    const inventoryStats = queryToObjects(db, `
      SELECT COUNT(*) as itemCount,
             COALESCE(SUM(quantity), 0) as totalQuantity
      FROM materials WHERE quantity > 0
    `)[0];

    res.json({
      success: true,
      data: {
        stages: [
          { key: 'plan', label: '生产计划', count: planTotal, detail: planStats, items: [] },
          { key: 'seed', label: '种源管理', count: Number(seedCount), detail: { total: Number(seedCount) }, items: seedItems },
          { key: 'seedling', label: '育苗管理', count: seedlingTotal, detail: seedlingStats, items: seedlingItems },
          { key: 'planting', label: '种植管理', count: plantingTotal, detail: plantingStats, items: plantingItems },
          { key: 'harvest', label: '采收入库', count: Number(harvestStats?.count || 0), detail: { ...harvestStats }, items: harvestItems },
          { key: 'inventory', label: '库存管理', count: Number(inventoryStats?.itemCount || 0), detail: { ...inventoryStats }, items: inventoryItems },
        ],
      },
    });
  } catch (error) {
    console.error('获取全链条概览失败:', error);
    res.status(500).json({ success: false, error: '获取全链条概览失败' });
  }
});

/** GET /api/summary/comparison-stats — V10.0 多维度对比统计 */
router.get('/comparison-stats', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      main_param, compare_param1, compare_param2,
      start_date, end_date, sampling = 'month',
    } = req.query as Record<string, string>;

    // 参数到表的映射
    const paramTableMap: Record<string, { table: string; field: string; dateField: string; groupField: string }> = {
      yield: { table: 'harvest_records', field: 'harvest_quantity', dateField: 'harvest_date', groupField: "strftime('%Y-%m', harvest_date)" },
      fertilizer_total: { table: 'fertilizer_records', field: 'quantity', dateField: 'fertilize_time', groupField: "strftime('%Y-%m', fertilize_time)" },
      fertilizer_cost: { table: 'fertilizer_records', field: 'total_cost', dateField: 'fertilize_time', groupField: "strftime('%Y-%m', fertilize_time)" },
      work_hours: { table: 'labor_records', field: 'work_hours', dateField: 'work_date', groupField: "strftime('%Y-%m', work_date)" },
      worker_count: { table: 'labor_records', field: 'worker_id', dateField: 'work_date', groupField: "strftime('%Y-%m', work_date)" },
    };

    // 根据 sampling 重新计算 groupField
    function getGroupField(config: { table: string; field: string; dateField: string; groupField: string }, sampling: string): string {
      switch (sampling) {
        case 'day': return `date(${config.dateField})`;
        case 'year': return `strftime('%Y', ${config.dateField})`;
        default: return config.groupField; // month default
      }
    }

    const results: any = {};

    const fetchParam = (paramKey: string, label: string) => {
      const config = paramTableMap[paramKey];
      if (!config) return null;

      const conditions: string[] = [];
      const params: any[] = [];
      if (start_date) { conditions.push(`${config.dateField} >= ?`); params.push(start_date); }
      if (end_date) { conditions.push(`${config.dateField} <= ?`); params.push(`${end_date} 23:59:59`); }

      // 根据采样粒度动态生成 groupField
      const groupField = getGroupField(config, sampling);

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const aggFunc = paramKey === 'worker_count' ? 'COUNT(DISTINCT worker_id)' : `SUM(${config.field})`;

      const data = queryToObjects(db,
        `SELECT ${groupField} as label, ${aggFunc} as value
         FROM ${config.table} ${whereClause}
         GROUP BY ${groupField} ORDER BY label`,
        params
      );

      return {
        key: paramKey,
        label,
        data,
      };
    };

    if (main_param) results.main = fetchParam(main_param, '主参数');
    if (compare_param1) results.compare1 = fetchParam(compare_param1, '对比参数1');
    if (compare_param2) results.compare2 = fetchParam(compare_param2, '对比参数2');

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
