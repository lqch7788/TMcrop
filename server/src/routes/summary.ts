/**
 * 生产汇总统计 API 路由
 * 提供批次汇总、产量统计、成本统计、人工统计等接口
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
// 2026-07-22：追溯修复 - 链时间线端点
import { queryEntityHistory, queryInventoryHistory, queryBatchTimeline } from '../services/entityHistory.service';

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
    // 注意: plantings 通过 source_id 连接 seedlings, seedlings 通过 source_id 连接 seed_sources
    // harvest_records.source_id 指向 plantings.id，实现精确追溯
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
        CASE WHEN COUNT(DISTINCT pl.id) > 0 THEN 1 ELSE 0 END as hasPlanting,
        -- 2026-07-22：P1 改进 - 库存聚合（来自 inventory_stock 表）
        CASE WHEN COUNT(DISTINCT ist.id) > 0 THEN 1 ELSE 0 END as hasInventory,
        COALESCE(SUM(ist.current_quantity), 0) as inventoryQuantity,
        COUNT(DISTINCT ist.id) as inventoryItemCount
      FROM production_plans pp
      LEFT JOIN seed_sources ss ON ss.production_plan_code = pp.plan_code
      LEFT JOIN seedlings s ON s.source_id = ss.id
      LEFT JOIN plantings pl ON pl.source_id = s.id
      LEFT JOIN harvest_records hr ON hr.source_id = pl.id
      LEFT JOIN inventory_stock ist ON (ist.business_id = pl.id OR ist.business_id = hr.id OR ist.source_id = ss.id) AND ist.current_quantity > 0
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

    // 2026-09-29 修复（P0）：queryToObjects 会把 SQL 别名转成驼峰（harvest_count → harvestCount），
    // 原代码按蛇形读取 → 全部 undefined → 恒为 0。此前只有 batch 统计正确，
    // 正是因为其别名是 `count`（无下划线，驼峰转换不改变它）。
    // 同时响应中间件 camelCaseResponse 会把输出键名再转一次驼峰，
    // 故此处直接构造驼峰键，避免"蛇形→驼峰"二次转换带来的歧义。
    const data = {
      yield: {
        monthHarvestCount: monthHarvest[0]?.harvestCount || 0,
        monthTotalYield: monthHarvest[0]?.totalYield || 0,
        monthTotalAmount: monthHarvest[0]?.totalAmount || 0
      },
      task: {
        totalTasks: monthTask[0]?.totalTasks || 0,
        completedTasks: monthTask[0]?.completedTasks || 0,
        inProgressTasks: monthTask[0]?.inProgressTasks || 0,
        pendingTasks: monthTask[0]?.pendingTasks || 0,
        completionRate: monthTask[0]?.totalTasks > 0
          ? Math.round((monthTask[0]?.completedTasks / monthTask[0]?.totalTasks) * 100)
          : 0
      },
      labor: {
        totalHours: monthLabor[0]?.totalHours || 0,
        totalLaborCost: monthLabor[0]?.totalLaborCost || 0
      },
      problem: {
        totalProblems: monthProblem[0]?.totalProblems || 0,
        resolvedProblems: monthProblem[0]?.resolvedProblems || 0,
        resolutionRate: monthProblem[0]?.totalProblems > 0
          ? Math.round((monthProblem[0]?.resolvedProblems / monthProblem[0]?.totalProblems) * 100)
          : 0
      },
      batch: {
        activeCount: activeBatch[0]?.count || 0,
        totalBatches: totalBatches[0]?.count || 0
      },
      totalCost: (monthLabor[0]?.totalLaborCost || 0)
        + (monthMaterialCost[0]?.materialCost || 0)
        + (monthEnergyCost[0]?.energyCost || 0)
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取生产报表概览失败:', error);
    res.status(500).json({ success: false, error: '获取生产报表概览失败' });
  }
});

/**
 * 获取六大模块体检概览（供生产汇总看板的「模块体检」区使用）
 * GET /api/summary/module-health
 *
 * 2026-09-29 新增：汇总看板要让管理者一眼看到 计划/作物/农事/物资/审批/人工
 * 六个模块的运行状态。此前这些数字散落在 6 个以上独立端点，且种源/育苗/种植/
 * 采购计划/物料/供应商/入库单等模块根本没有聚合端点，前端只能拉全量列表自己数。
 * 此处集中一次聚合返回，避免看板并发十几个请求各自拼装。
 *
 * 注意：本端点是**实时存量快照**（有多少物料、多少在种批次），不是时间段统计，
 * 因此不接受 start_date/end_date 参数。
 */
router.get('/module-health', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();

    /**
     * 执行单行聚合 SQL 并取指定列的数值。
     * queryToObjects 会把列名转驼峰，故统一用 `AS total` 这类无下划线的别名。
     */
    const pick = (sql: string, key: string, fallback = 0): number => {
      const rows = queryToObjects<Record<string, unknown>>(db, sql, []);
      const v = rows[0]?.[key];
      return typeof v === 'number' ? v : fallback;
    };

    const data = {
      // 计划管理
      plan: {
        orders: pick('SELECT COUNT(*) AS total FROM crop_orders', 'total'),
        ordersInProgress: pick("SELECT COUNT(*) AS total FROM crop_orders WHERE status = 'in_progress'", 'total'),
        productionPlans: pick('SELECT COUNT(*) AS total FROM production_plans', 'total'),
        techSolutions: pick('SELECT COUNT(*) AS total FROM tech_solutions', 'total'),
        purchasePlans: pick('SELECT COUNT(*) AS total FROM purchase_plans', 'total'),
        purchasePlansPending: pick("SELECT COUNT(*) AS total FROM purchase_plans WHERE status = 'pending'", 'total'),
      },
      // 作物管理（种源/育苗/种植均排除软删记录）
      crop: {
        seedSources: pick("SELECT COUNT(*) AS total FROM seed_sources WHERE deleted_at IS NULL AND status = 'active'", 'total'),
        seedlings: pick('SELECT COUNT(*) AS total FROM seedlings WHERE deleted_at IS NULL', 'total'),
        seedlingsInProgress: pick("SELECT COUNT(*) AS total FROM seedlings WHERE deleted_at IS NULL AND status = 'in_progress'", 'total'),
        plantings: pick('SELECT COUNT(*) AS total FROM plantings WHERE deleted_at IS NULL', 'total'),
        plantingsHarvesting: pick("SELECT COUNT(*) AS total FROM plantings WHERE deleted_at IS NULL AND status = 'harvesting'", 'total'),
        inventoryInstances: pick('SELECT COUNT(*) AS total FROM inventory_stock', 'total'),
        inventoryQuantity: pick('SELECT COALESCE(SUM(current_quantity), 0) AS total FROM inventory_stock', 'total'),
      },
      // 农事管理
      farm: {
        tasksTotal: pick('SELECT COUNT(*) AS total FROM farm_tasks', 'total'),
        tasksCompleted: pick("SELECT COUNT(*) AS total FROM farm_tasks WHERE status = 'completed'", 'total'),
        tasksWaitingAcceptance: pick("SELECT COUNT(*) AS total FROM farm_tasks WHERE status = 'waiting_acceptance'", 'total'),
        // 逾期口径：有计划日期、已过期、且未终结；用 localtime 避免 UTC 早 8 小时误判为前一天
        tasksOverdue: pick(
          `SELECT COUNT(*) AS total FROM farm_tasks
           WHERE plan_date <> '' AND plan_date < date('now', 'localtime')
             AND status NOT IN ('completed', 'cancelled', 'abandoned')`,
          'total'
        ),
        problemsTotal: pick('SELECT COUNT(*) AS total FROM problems', 'total'),
        problemsOpen: pick("SELECT COUNT(*) AS total FROM problems WHERE status IN ('pending', 'in_progress', 'waiting_acceptance')", 'total'),
      },
      // 物资管理
      material: {
        materials: pick('SELECT COUNT(*) AS total FROM materials', 'total'),
        materialsLowStock: pick('SELECT COUNT(*) AS total FROM materials WHERE minStock > 0 AND quantity < minStock', 'total'),
        suppliers: pick('SELECT COUNT(*) AS total FROM suppliers', 'total'),
        suppliersActive: pick("SELECT COUNT(*) AS total FROM suppliers WHERE status = 'active'", 'total'),
        // 只统计正单向入库单，排除冲销单（recordType = 'reversal'）
        inboundRecords: pick("SELECT COUNT(*) AS total FROM inbound_records WHERE recordType = 'inbound'", 'total'),
        materialRequests: pick('SELECT COUNT(*) AS total FROM material_requests', 'total'),
        materialRequestsPending: pick("SELECT COUNT(*) AS total FROM material_requests WHERE status = 'pending'", 'total'),
      },
      // 审批管理
      approval: {
        total: pick('SELECT COUNT(*) AS total FROM approvals', 'total'),
        pending: pick("SELECT COUNT(*) AS total FROM approvals WHERE status = 'pending'", 'total'),
        approved: pick("SELECT COUNT(*) AS total FROM approvals WHERE status = 'approved'", 'total'),
        rejected: pick("SELECT COUNT(*) AS total FROM approvals WHERE status = 'rejected'", 'total'),
      },
      // 人工管理
      labor: {
        employees: pick("SELECT COUNT(*) AS total FROM employees WHERE status = 'active'", 'total'),
        attendanceRecords: pick('SELECT COUNT(*) AS total FROM attendance_records', 'total'),
        workHours: pick('SELECT COALESCE(SUM(work_hours), 0) AS total FROM labor_records', 'total'),
        workLogs: pick('SELECT COUNT(*) AS total FROM work_logs', 'total'),
      },
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取模块体检概览失败:', error);
    res.status(500).json({ success: false, error: '获取模块体检概览失败' });
  }
});

/**
 * 指标看板数据（面向领导/管理者的指标体系总览）
 * GET /api/summary/indicator-board?start_date=&end_date=
 *
 * 2026-09-29 新增。原 /summary/indicators 只返回 4 个维度（产量/任务/问题/人工），
 * 且 period 参数被忽略（硬编码近 30 天窗口），指标看板页面在业务数据不落在该窗口时
 * 几乎全 0；页面还自行编造目标值（把 avgYieldPerHarvest × 1.2 当作产量目标）。
 *
 * 现改为：能自动计算的指标一律实时从业务表聚合；目标值/预警线**沿用 indicators
 * 指标库中的现有定义**（按 linkCode 关联），库中未登记的用本文件默认值；
 * 指标库里其余靠人工维护的指标原样带出，由页面分「自动 / 手工」两区展示。
 */
router.get('/indicator-board', (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    if (start_date && !isValidDate(start_date as string)) {
      return res.status(400).json({ success: false, error: '开始日期格式无效，请使用 YYYY-MM-DD 格式' });
    }
    if (end_date && !isValidDate(end_date as string)) {
      return res.status(400).json({ success: false, error: '结束日期格式无效，请使用 YYYY-MM-DD 格式' });
    }

    const db = getDatabase();
    const now = new Date();
    // 默认本年度；结束日期用本地时间拼接，避免 toISOString 的 UTC 偏移（早 8 小时会取到昨天）
    const start = (start_date as string) || `${now.getFullYear()}-01-01`;
    const end = (end_date as string)
      || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    /** 取单行聚合结果（queryToObjects 转驼峰，别名统一用无下划线的单词以免被转换破坏） */
    const row = (sql: string, params: (string | number)[] = []): Record<string, unknown> => {
      const r = queryToObjects<Record<string, unknown>>(db, sql, params);
      return r[0] || {};
    };
    const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
    /** a / b 的百分比，保留 1 位小数 */
    const pct = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
    const r1 = (v: number): number => Math.round(v * 10) / 10;

    // ── 区间聚合（抽成函数，当期与上期各算一次以支持环比）──
    /**
     * 计算指定时间区间内的时敏聚合值
     * @param from 区间起（YYYY-MM-DD）
     * @param to   区间止（YYYY-MM-DD）
     */
    const computeAggregates = (from: string, to: string) => {
      const planQty = num(row(
        'SELECT COALESCE(SUM(planned_quantity), 0) AS v FROM production_plans WHERE planting_date >= ? AND planting_date <= ?',
        [from, to]
      ).v);
      const harvestQty = num(row(
        "SELECT COALESCE(SUM(harvest_quantity), 0) AS v FROM harvest_records WHERE status IN ('completed', 'harvested') AND harvest_date >= ? AND harvest_date <= ?",
        [from, to]
      ).v);
      const taskRow = row(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done FROM farm_tasks WHERE plan_date >= ? AND plan_date <= ?",
        [from, to]
      );
      const problemRow = row(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS done FROM problems WHERE create_time >= ? AND create_time <= ?",
        [`${from} 00:00:00`, `${to} 23:59:59`]
      );
      const survivalRate = num(row(
        'SELECT ROUND(AVG(survival_rate), 1) AS v FROM seedlings WHERE survival_rate > 0 AND deleted_at IS NULL AND seedling_date >= ? AND seedling_date <= ?',
        [from, to]
      ).v);
      const laborCost = num(row(
        "SELECT COALESCE(SUM(total_amount), 0) AS v FROM labor_records WHERE status = 'completed' AND work_date >= ? AND work_date <= ?",
        [from, to]
      ).v);
      const materialCost = num(row(
        'SELECT COALESCE(SUM(total_amount), 0) AS v FROM material_costs WHERE cost_date >= ? AND cost_date <= ?',
        [from, to]
      ).v);
      const energyCost = num(row(
        'SELECT COALESCE(SUM(total_amount), 0) AS v FROM energy_costs WHERE cost_date >= ? AND cost_date <= ?',
        [from, to]
      ).v);
      const approvalRow = row(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pend FROM approvals WHERE apply_date >= ? AND apply_date <= ?",
        [from, to]
      );
      // 审批平均耗时（天）：只统计已出结果（通过/驳回）的单据
      const approvalAvgDays = num(row(
        `SELECT ROUND(AVG(julianday(updated_at) - julianday(apply_date)), 1) AS v
         FROM approvals WHERE status IN ('approved', 'rejected') AND apply_date >= ? AND apply_date <= ?`,
        [from, to]
      ).v);

      return {
        planQty, harvestQty,
        taskDone: num(taskRow.done), taskTotal: num(taskRow.total),
        problemDone: num(problemRow.done), problemTotal: num(problemRow.total),
        survivalRate, laborCost, materialCost, energyCost,
        approvalTotal: num(approvalRow.total), approvalPend: num(approvalRow.pend),
        approvalAvgDays,
      };
    };

    /** 与 [from, to] 等长的前一个紧邻区间（本地时间计算，避免 UTC 偏移） */
    const prevRange = (from: string, to: string): { start: string; end: string } => {
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const s = new Date(`${from}T00:00:00`);
      const e = new Date(`${to}T00:00:00`);
      const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
      const prevEnd = new Date(s.getTime() - 86400000);
      const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
      return { start: fmt(prevStart), end: fmt(prevEnd) };
    };

    const cur = computeAggregates(start, end);
    const prevWindow = prevRange(start, end);
    const prev = computeAggregates(prevWindow.start, prevWindow.end);

    // ── 存量聚合（与时间区间无关，因此不参与环比）──
    const materialRow = row(
      'SELECT COUNT(*) AS total, SUM(CASE WHEN minStock > 0 AND quantity < minStock THEN 1 ELSE 0 END) AS low FROM materials'
    );
    const planRow = row(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('completed', 'published') THEN 1 ELSE 0 END) AS done FROM production_plans"
    );
    // 物料效期预警：90 天内到期的批次数（前瞻性风险，而非当前状态）
    const expiringCount = num(row(
      "SELECT COUNT(*) AS v FROM batch_inventory WHERE expiry_date <> '' AND expiry_date < date('now', '+90 days')"
    ).v);

    const totalCost = cur.laborCost + cur.materialCost + cur.energyCost;

    // ── 数据来源可信度判定（2026-09-29）──
    // 系统里有历史遗留的演示数据：material_costs 的 `SIMM` 前缀、energy_costs 的 `SIME` 前缀
    // 都是 Simulation 模拟数据，labor_records 则只有 3 条创建时间完全相同的种子记录（LB001-003）。
    // 靠这些表算出的指标必须标注出来，否则会误导决策（例如"人工成本率 0.3%"其实是没录数据）。
    // 判定是**数据驱动**的：把演示数据清理干净后，标注会自动消失。
    const simRatio = (table: string, prefix: string): number => {
      const r = row(
        `SELECT SUM(CASE WHEN id LIKE ? THEN total_amount ELSE 0 END) AS sim, SUM(total_amount) AS total
         FROM ${table} WHERE cost_date >= ? AND cost_date <= ?`,
        [`${prefix}%`, start, end]
      );
      const total = num(r.total);
      return total > 0 ? num(r.sim) / total : 0;
    };
    const materialIsDemo = simRatio('material_costs', 'SIMM') > 0.5;
    const energyIsDemo = simRatio('energy_costs', 'SIME') > 0.5;
    const laborIsDemo = cur.laborCost > 0
      ? num(row(
          "SELECT COUNT(*) AS total FROM labor_records WHERE status = 'completed' AND work_date >= ? AND work_date <= ?",
          [start, end]
        ).total) < 5
      : true;
    /** 成本率类指标的分母是三类成本之和，任一为演示数据都会污染该指标 */
    const costSource: 'live' | 'demo' = (materialIsDemo || energyIsDemo || laborIsDemo) ? 'demo' : 'live';

    /** 指标库定义（按 code 索引），用于沿用其 target / warning / weight */
    const defs = new Map<string, Record<string, unknown>>();
    for (const d of queryToObjects<Record<string, unknown>>(db, 'SELECT code, name, target, warning, weight FROM indicators', [])) {
      defs.set(String(d.code), d);
    }

    /** 环比：本期相对上期的变化率（%）。上期为 0 或缺失时返回 null —— 不编造数字 */
    const changeRate = (curVal: number, prevVal: number | null): number | null => {
      if (prevVal === null || prevVal === 0) return null;
      return Math.round(((curVal - prevVal) / Math.abs(prevVal)) * 1000) / 10;
    };

    /**
     * 构建一条自动指标
     *
     * 2026-09-29 改为对象参数：字段已达十余个，位置参数难以阅读与维护。
     */
    const build = (cfg: {
      key: string;
      name: string;
      category: string;
      actual: number;
      /** 口径明细，如"已采收 41,285 / 计划 62,789 kg" */
      detail: string;
      /** 计算口径说明 */
      formula: string;
      /** 数据来源（中文） */
      sourceLabel: string;
      /** 计量单位，默认 % */
      unit?: string;
      /** 上一等长区间的同指标值，用于环比；存量类指标不传 */
      previous?: number | null;
      /** 关联的指标库 code（目标值/预警线/权重取自这里） */
      linkCode?: string | null;
      /** 指标库未登记时的默认目标值与预警线 */
      defaultTarget: number;
      defaultWarning: number;
      /** higher=越高越好；lower=越低越好（成本率/耗时/临期数等） */
      direction: 'higher' | 'lower';
      /** live=真实业务数据；demo=底层含模拟数据 */
      dataSource?: 'live' | 'demo';
    }) => {
      const {
        key, name, category, actual, detail, formula, sourceLabel,
        unit = '%', previous = null, linkCode = null,
        defaultTarget, defaultWarning, direction, dataSource = 'live',
      } = cfg;

      const def = linkCode ? defs.get(linkCode) : undefined;
      const target = num(def?.target) || defaultTarget;
      const warning = num(def?.warning) || defaultWarning;
      const weight = num(def?.weight) || 10; // 库中未登记的给默认权重，保证综合得分覆盖全部自动指标
      // 达成率：越高越好的直接比；越低越好的取反比并**封顶 120%**
      //（否则"人工成本率 0.3% vs 目标 25%"会算出 8000%+ 这种荒谬数字）；
      // 目标为 0 的指标（如安全事故数）单独处理：为 0 即满分，否则 0 分
      const achievement = target === 0
        ? (actual === 0 ? 100 : 0)
        : direction === 'higher'
          ? pct(actual, target)
          : Math.min(pct(target, actual), 120);
      let status: 'good' | 'warning' | 'bad';
      if (direction === 'higher') {
        status = actual >= target ? 'good' : actual >= warning ? 'warning' : 'bad';
      } else {
        status = actual <= target ? 'good' : actual <= warning ? 'warning' : 'bad';
      }
      return {
        key, name, category, unit, actual: r1(actual), target, warning, weight,
        achievement, status, direction, linkCode, fromLibrary: !!def, dataSource,
        detail, formula, sourceLabel,
        previousValue: previous === null ? null : r1(previous),
        changeRate: changeRate(actual, previous),
      };
    };

    const autoIndicators = [
      build({
        key: 'yieldAchievement', name: '产量达成率', category: '生产',
        actual: cur.planQty > 0 ? (cur.harvestQty / cur.planQty) * 100 : 0,
        detail: `已采收 ${cur.harvestQty.toLocaleString()} / 计划 ${cur.planQty.toLocaleString()} kg`,
        formula: '统计期内已采收量 ÷ 生产计划量 × 100%',
        sourceLabel: '采收记录、生产计划',
        previous: prev.planQty > 0 ? (prev.harvestQty / prev.planQty) * 100 : null,
        linkCode: 'PROD_001', defaultTarget: 95, defaultWarning: 90, direction: 'higher',
      }),
      build({
        key: 'taskCompletion', name: '任务完成率', category: '效率',
        actual: pct(cur.taskDone, cur.taskTotal),
        detail: `${cur.taskDone} / ${cur.taskTotal} 个任务已完成`,
        formula: '已完成任务数 ÷ 任务总数 × 100%',
        sourceLabel: '农事任务',
        previous: pct(prev.taskDone, prev.taskTotal),
        defaultTarget: 90, defaultWarning: 75, direction: 'higher',
      }),
      build({
        key: 'problemResolution', name: '问题解决率', category: '质量',
        actual: pct(cur.problemDone, cur.problemTotal),
        detail: `${cur.problemDone} / ${cur.problemTotal} 个问题已解决`,
        formula: '已解决问题数 ÷ 问题总数 × 100%',
        sourceLabel: '问题记录',
        previous: pct(prev.problemDone, prev.problemTotal),
        defaultTarget: 80, defaultWarning: 60, direction: 'higher',
      }),
      build({
        key: 'seedlingSurvival', name: '种苗成活率', category: '质量',
        actual: cur.survivalRate,
        detail: '统计期内各育苗批次成活率的平均值',
        formula: '各育苗批次的成活率取算术平均',
        sourceLabel: '育苗记录',
        previous: prev.survivalRate || null,
        linkCode: 'KPI003', defaultTarget: 98, defaultWarning: 95, direction: 'higher',
      }),
      build({
        key: 'materialCostRate', name: '物料成本率', category: '成本',
        actual: totalCost > 0 ? (cur.materialCost / totalCost) * 100 : 0,
        detail: `物料 ¥${Math.round(cur.materialCost).toLocaleString()} / 总成本 ¥${Math.round(totalCost).toLocaleString()}`,
        formula: '物料成本 ÷ 总成本 × 100%（总成本 = 人工 + 物料 + 能源）',
        sourceLabel: '物料成本',
        previous: (prev.laborCost + prev.materialCost + prev.energyCost) > 0
          ? (prev.materialCost / (prev.laborCost + prev.materialCost + prev.energyCost)) * 100
          : null,
        linkCode: 'COST_001', defaultTarget: 35, defaultWarning: 38, direction: 'lower',
        dataSource: costSource,
      }),
      build({
        key: 'laborCostRate', name: '人工成本率', category: '成本',
        actual: totalCost > 0 ? (cur.laborCost / totalCost) * 100 : 0,
        detail: `人工 ¥${Math.round(cur.laborCost).toLocaleString()} / 总成本 ¥${Math.round(totalCost).toLocaleString()}`,
        formula: '人工成本 ÷ 总成本 × 100%（总成本 = 人工 + 物料 + 能源）',
        sourceLabel: '人工记录',
        previous: (prev.laborCost + prev.materialCost + prev.energyCost) > 0
          ? (prev.laborCost / (prev.laborCost + prev.materialCost + prev.energyCost)) * 100
          : null,
        linkCode: 'COST_002', defaultTarget: 25, defaultWarning: 28, direction: 'lower',
        dataSource: costSource,
      }),
      build({
        key: 'inventorySufficiency', name: '库存充足率', category: '效率',
        actual: num(materialRow.total) > 0
          ? ((num(materialRow.total) - num(materialRow.low)) / num(materialRow.total)) * 100
          : 0,
        detail: `${num(materialRow.total) - num(materialRow.low)} / ${num(materialRow.total)} 种物料高于安全库存`,
        formula: '(物料总数 − 低于安全库存数) ÷ 物料总数 × 100%',
        sourceLabel: '物料主数据',
        defaultTarget: 95, defaultWarning: 90, direction: 'higher',
      }),
      build({
        key: 'approvalCompletion', name: '审批处理率', category: '效率',
        actual: pct(cur.approvalTotal - cur.approvalPend, cur.approvalTotal),
        detail: `已办结 ${cur.approvalTotal - cur.approvalPend} / ${cur.approvalTotal} 张单据`,
        formula: '已办结单数 ÷ 审批总单数 × 100%（已办结 = 非待审批）',
        sourceLabel: '审批单据',
        previous: pct(prev.approvalTotal - prev.approvalPend, prev.approvalTotal),
        defaultTarget: 90, defaultWarning: 80, direction: 'higher',
      }),
      build({
        key: 'planCompletion', name: '计划完成率', category: '生产',
        actual: pct(num(planRow.done), num(planRow.total)),
        detail: `${num(planRow.done)} / ${num(planRow.total)} 个生产计划已发布或完成`,
        formula: '已发布或已完成计划数 ÷ 计划总数 × 100%',
        sourceLabel: '生产计划',
        defaultTarget: 90, defaultWarning: 80, direction: 'higher',
      }),
      // ── 2026-09-29 新增：面向管理者的效率与风险视角 ──
      build({
        key: 'approvalLeadTime', name: '审批平均耗时', category: '效率',
        actual: cur.approvalAvgDays,
        unit: '天',
        detail: `统计期内已出结果的审批单据平均处理 ${cur.approvalAvgDays} 天`,
        formula: '已完成审批的(结果时间 − 提交时间)之和 ÷ 已审结单数',
        sourceLabel: '审批单据',
        previous: prev.approvalAvgDays || null,
        defaultTarget: 2, defaultWarning: 3, direction: 'lower',
      }),
      build({
        key: 'materialExpiring', name: '物料临期预警', category: '风险',
        actual: expiringCount,
        unit: '项',
        detail: `有 ${expiringCount} 个物料批次将在 90 天内到期（含已过期）`,
        formula: '统计效期在 90 天内的物料批次数',
        sourceLabel: '批次库存',
        defaultTarget: 0, defaultWarning: 3, direction: 'lower',
      }),
    ];

    // ── 指标库中未被自动覆盖的条目（实际值靠人工维护，原样带出）──
    const linkedCodes = new Set(autoIndicators.map((i) => i.linkCode).filter(Boolean) as string[]);
    const manualIndicators = queryToObjects<Record<string, unknown>>(
      db,
      // id / frequency 供前端编辑弹窗与删除操作使用（合并「指标数据」页后需要就地维护）
      'SELECT id, code, name, category, unit, target, actual, warning, weight, source, trend, frequency FROM indicators ORDER BY category, code',
      []
    )
      .filter((d) => !linkedCodes.has(String(d.code)))
      .map((d) => {
        const target = num(d.target);
        const actual = num(d.actual);
        const warning = num(d.warning);
        // 指标库没有 direction 字段，但可由 warning 与 target 的大小关系自洽推出：
        // warning > target = 超标线在目标之上 = 越低越好（成本率/损耗率/发生率/消耗强度/研发周期）；
        // warning < target = 越高越好（达成率/完好率/合格率/利用率）。已对全部 23 条验证成立。
        const direction: 'higher' | 'lower' = warning > target ? 'lower' : 'higher';
        const achievement = target === 0
          ? (actual === 0 ? 100 : 0)
          : direction === 'higher'
            ? pct(actual, target)
            : Math.min(pct(target, actual), 120);
        const status: 'good' | 'warning' | 'bad' = direction === 'higher'
          ? (actual >= target ? 'good' : actual >= warning ? 'warning' : 'bad')
          : (actual <= target ? 'good' : actual <= warning ? 'warning' : 'bad');
        return {
          id: d.id, code: d.code, name: d.name, category: d.category, unit: d.unit,
          target, actual, warning, weight: num(d.weight), source: d.source, trend: d.trend,
          frequency: d.frequency,
          achievement, status, direction,
          // 口径说明：手工指标的值不是算出来的，而是人在指标库中录入的
          formula: '实际值来自指标库的人工维护值，非系统自动计算',
          sourceLabel: (d.source as string) || '人工录入',
          // 手工指标的实际值全部来自 indicators 表（15 条为批量写入的演示值，4 条为空），一律标注
          dataSource: 'demo' as const,
        };
      });

    // ── 结构透视数据（供「运营透视」TAB 使用）──
    /** 出库业务类型 → 中文（已比对库中实际出现的全部取值） */
    const FLOW_TYPE_LABELS: Record<string, string> = {
      transfer: '内部调拨', transfer_out: '调出', internal_planting: '种植领用',
      damage_loss: '损耗', gift_sample: '赠样', customer_sale: '销售',
      seedling: '育苗领用', material_execute: '生产领料', material_return: '生产退料',
      return_inbound: '退料入库', restore: '冲销恢复', crop_sale: '作物销售', other: '其他',
    };
    /** 审批业务类型 → 中文（识别审批瓶颈用） */
    const APPROVAL_TYPE_LABELS: Record<string, string> = {
      production_plan: '生产计划', tech_solution: '技术方案', purchase_request: '采购申请',
      material_request: '领料申请', return_material: '退料申请', material_inbound: '物料入库',
      material_transfer: '库存调拨', batch_void: '批次作废', batch_change: '批次变更',
      planting_plan: '种植计划', seedling_plan: '育苗计划', order_create: '订单创建',
      order_change: '订单变更', task_dispatch: '任务派发', task_change: '任务变更',
      inspection_issue: '巡查问题', issue_resolve: '问题处理', leave: '请假',
      overtime: '加班', resignation: '离职', recruitment: '招聘', onboarding: '入职',
      attendance_repair: '考勤补录', salary_adjustment: '薪资调整',
      contract_renewal: '合同续签', salary_budget: '薪资预算', transfer: '调动',
      indicator_approval: '指标审批', indicator_adjust: '指标调整',
      budget_create: '预算创建', budget_adjust: '预算调整', production_batch: '生产批次',
    };

    /** 物料去向：按业务类型聚合出库流水 */
    const materialFlow = queryToObjects<Record<string, unknown>>(
      db,
      `SELECT business_type AS t, COUNT(*) AS c, ROUND(COALESCE(SUM(quantity), 0), 1) AS q
       FROM inventory_transaction
       WHERE transaction_type = 'outbound' AND operate_date >= ? AND operate_date <= ?
       GROUP BY business_type ORDER BY c DESC`,
      [start, end]
    ).map((r) => ({
      type: String(r.t || ''),
      label: FLOW_TYPE_LABELS[String(r.t)] || String(r.t || '未分类'),
      count: num(r.c),
      quantity: num(r.q),
    }));

    /** 审批类型分布：条数最多的就是流程瓶颈 */
    const approvalByType = queryToObjects<Record<string, unknown>>(
      db,
      `SELECT type AS t, COUNT(*) AS c,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS p
       FROM approvals WHERE apply_date >= ? AND apply_date <= ?
       GROUP BY type ORDER BY c DESC LIMIT 10`,
      [start, end]
    ).map((r) => ({
      type: String(r.t || ''),
      label: APPROVAL_TYPE_LABELS[String(r.t)] || String(r.t || '未知类型'),
      count: num(r.c),
      pending: num(r.p),
    }));

    /** 人员负荷：任务数按负责人（识别负荷不均） */
    const workload = queryToObjects<Record<string, unknown>>(
      db,
      `SELECT assignee_name AS n, COUNT(*) AS c,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS d
       FROM farm_tasks
       WHERE plan_date >= ? AND plan_date <= ? AND assignee_name <> ''
       GROUP BY assignee_name ORDER BY c DESC LIMIT 10`,
      [start, end]
    ).map((r) => ({
      name: String(r.n || ''),
      total: num(r.c),
      completed: num(r.d),
    }));

    // ── 汇总：加权综合得分 + 按分类达成率 ──
    const totalWeight = autoIndicators.reduce((s, i) => s + i.weight, 0);
    const score = totalWeight > 0
      ? Math.round(
          autoIndicators.reduce((s, i) => s + Math.min(i.achievement, 100) * i.weight, 0) / totalWeight
        )
      : 0;

    const categories = [...new Set(autoIndicators.map((i) => i.category))];
    const byCategory = categories.map((c) => {
      const items = autoIndicators.filter((i) => i.category === c);
      return {
        category: c,
        achievement: Math.round(items.reduce((s, i) => s + Math.min(i.achievement, 100), 0) / items.length),
        count: items.length,
      };
    });

    res.json({
      success: true,
      data: {
        period: { start, end },
        /** 环比所用的上一等长区间（前端可用于提示"较 X 月 X 日~X 月 X 日"） */
        previousPeriod: prevWindow,
        autoIndicators,
        manualIndicators,
        score,
        byCategory,
        costBreakdown: {
          labor: r1(cur.laborCost), material: r1(cur.materialCost),
          energy: r1(cur.energyCost), total: r1(totalCost),
        },
        /** 结构透视（「运营透视」TAB 用） */
        structure: { materialFlow, approvalByType, workload },
      },
    });
  } catch (error) {
    console.error('获取指标看板数据失败:', error);
    res.status(500).json({ success: false, error: '获取指标看板数据失败' });
  }
});

/**
 * 指标下钻明细（点击待办项 / 指标卡后查看具体是哪些记录）
 * GET /api/summary/indicator-drilldown?type={problems|overdueTasks|pendingApprovals|lowStock|expiring|pendingAcceptance}
 *
 * 2026-09-29 新增：此前看板只能看到总数（"未解决问题 18"），
 * 管理者无法知道是哪 18 个、更无法直接去处理，形成"看得见、动不了"的断点。
 * 本端点把每个数字背后的记录清单拉出来，字段统一为 {id,title,meta,status,path} 供前端通用渲染。
 */
router.get('/indicator-drilldown', (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ success: false, error: '缺少 type 参数' });
    }
    const db = getDatabase();
    const key = String(type);

    /** 字典 */
    const PRIORITY: Record<string, string> = { high: '高', medium: '中', low: '低', urgent: '紧急' };
    const PROBLEM_STATUS: Record<string, string> = {
      pending: '待处理', in_progress: '处理中', waiting_acceptance: '待验收', completed: '已完成',
    };
    const TASK_STATUS: Record<string, string> = {
      pending: '待执行', in_progress: '进行中', waiting_acceptance: '待验收',
      completed: '已完成', cancelled: '已取消', abandoned: '已放弃',
    };
    const APPROVAL_STATUS: Record<string, string> = {
      pending: '待审批', approved: '已通过', rejected: '已驳回', draft: '草稿',
      partially_approved: '部分通过', cancelled: '已撤销',
    };

    type Row = { id: string; title: string; meta: string; status: string; path: string };
    let title = '';
    let rows: Row[] = [];

    switch (key) {
      case 'problems': {
        title = '未解决问题';
        rows = queryToObjects<Record<string, unknown>>(
          db,
          `SELECT id, title, priority, status, create_time, greenhouse_name FROM problems
           WHERE status IN ('pending', 'in_progress', 'waiting_acceptance')
           ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, create_time DESC
           LIMIT 100`,
          []
        ).map((r) => ({
          id: String(r.id),
          title: String(r.title || '(无标题)'),
          meta: `${PRIORITY[String(r.priority)] || '普通'}优先级 · ${String(r.greenhouseName || '未指定区域')} · ${String(r.createTime || '').slice(0, 10)}`,
          status: PROBLEM_STATUS[String(r.status)] || String(r.status || ''),
          path: '/summary/problems',
        }));
        break;
      }
      case 'overdueTasks': {
        title = '逾期任务';
        rows = queryToObjects<Record<string, unknown>>(
          db,
          `SELECT id, task_title, assignee_name, plan_date, greenhouse_name FROM farm_tasks
           WHERE plan_date <> '' AND plan_date < date('now', 'localtime')
             AND status NOT IN ('completed', 'cancelled', 'abandoned')
           ORDER BY plan_date ASC LIMIT 100`,
          []
        ).map((r) => ({
          id: String(r.id),
          title: String(r.taskTitle || '(无标题)'),
          meta: `负责人 ${String(r.assigneeName || '未指派')} · ${String(r.greenhouseName || '')} · 计划 ${String(r.planDate || '')}`,
          status: '已逾期',
          path: '/farm-hub',
        }));
        break;
      }
      case 'pendingAcceptance': {
        title = '待验收任务';
        rows = queryToObjects<Record<string, unknown>>(
          db,
          `SELECT id, task_title, assignee_name, completion_date, greenhouse_name FROM farm_tasks
           WHERE status = 'waiting_acceptance' ORDER BY completion_date ASC LIMIT 100`,
          []
        ).map((r) => ({
          id: String(r.id),
          title: String(r.taskTitle || '(无标题)'),
          meta: `执行人 ${String(r.assigneeName || '未指派')} · ${String(r.greenhouseName || '')} · 完成于 ${String(r.completionDate || '').slice(0, 10)}`,
          status: '待验收',
          path: '/farm-hub',
        }));
        break;
      }
      case 'pendingApprovals': {
        title = '待审批单据';
        rows = queryToObjects<Record<string, unknown>>(
          db,
          `SELECT id, code, title, type, applicant_name, apply_date FROM approvals
           WHERE status = 'pending' ORDER BY apply_date ASC LIMIT 100`,
          []
        ).map((r) => ({
          id: String(r.id),
          title: String(r.title || r.code || '(无标题)'),
          meta: `申请人 ${String(r.applicantName || '')} · 提交 ${String(r.applyDate || '')}`,
          status: '待审批',
          path: '/pending-approval',
        }));
        break;
      }
      case 'lowStock': {
        title = '低于安全库存的物料';
        rows = queryToObjects<Record<string, unknown>>(
          db,
          `SELECT id, code, name, quantity, minStock, unit FROM materials
           WHERE minStock > 0 AND quantity < minStock ORDER BY (quantity - minStock) ASC LIMIT 100`,
          []
        ).map((r) => ({
          id: String(r.id),
          title: `${String(r.name || '')}（${String(r.code || '')}）`,
          meta: `当前 ${num(r.quantity)} ${String(r.unit || '')} / 安全库存 ${num(r.minStock)} ${String(r.unit || '')}`,
          status: '需补货',
          path: '/warehouse-overview',
        }));
        break;
      }
      case 'expiring': {
        title = '90 天内到期的物料批次';
        rows = queryToObjects<Record<string, unknown>>(
          db,
          `SELECT id, material_name, material_code, batch_no, expiry_date, remaining_quantity, unit
           FROM batch_inventory
           WHERE expiry_date <> '' AND expiry_date < date('now', '+90 days')
           ORDER BY expiry_date ASC LIMIT 100`,
          []
        ).map((r) => ({
          id: String(r.id),
          title: `${String(r.materialName || '')} 批次 ${String(r.batchNo || '-')}`,
          meta: `剩余 ${num(r.remainingQuantity)} ${String(r.unit || '')} · 效期 ${String(r.expiryDate || '')}`,
          status: '临期',
          path: '/warehouse-overview',
        }));
        break;
      }
      default:
        return res.status(400).json({ success: false, error: `不支持的 type: ${key}` });
    }

    res.json({ success: true, data: { type: key, title, total: rows.length, rows } });
  } catch (error) {
    console.error('获取下钻明细失败:', error);
    res.status(500).json({ success: false, error: '获取下钻明细失败' });
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

    // 库存管理 — 作物库存按 stock_type 分组（v2 设计 §5.4）
    // 2026-07-22：修复追溯页面第六阶段数据源错位
    // 之前查 materials 表（物料字典）—— 用户问的是 inventory_stock（作物库存）
    // 状态过滤：排除已用完/已调拨/已出库；保留冻结（frozen_full/frozen_partial）
    const inventoryStats = queryToObjects(db, `
      SELECT stock_type,
             COUNT(*) as itemCount,
             COALESCE(SUM(current_quantity), 0) as totalQuantity,
             COALESCE(SUM(total_amount), 0) as totalAmount
      FROM inventory_stock
      WHERE current_quantity > 0
        AND status NOT IN ('empty', 'transferred', 'outbound')
      GROUP BY stock_type
    `);
    const inventoryItems = queryToObjects(db, `
      SELECT id, instance_id as code, stock_type, crop_name as cropName,
             variety_name as variety, current_quantity as quantity, unit,
             warehouse_name as warehouseName, status,
             business_id as sourceId, business_type as sourceType,
             source_module as sourceModule
      FROM inventory_stock
      WHERE current_quantity > 0
        AND status NOT IN ('empty', 'transferred', 'outbound')
      ORDER BY stock_type, create_time DESC
      LIMIT 60
    `);

    res.json({
      success: true,
      data: {
        stages: [
          { key: 'plan', label: '生产计划', count: planTotal, detail: planStats, items: [] },
          { key: 'seed', label: '种源管理', count: Number(seedCount), detail: { total: Number(seedCount) }, items: seedItems },
          { key: 'seedling', label: '育苗管理', count: seedlingTotal, detail: seedlingStats, items: seedlingItems },
          { key: 'planting', label: '种植管理', count: plantingTotal, detail: plantingStats, items: plantingItems },
          { key: 'harvest', label: '采收入库', count: Number(harvestStats?.count || 0), detail: { ...harvestStats }, items: harvestItems },
          {
            key: 'inventory',
            label: '库存管理',
            count: inventoryItems.length,
            detail: {
              seedCount: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'seed')?.itemCount || 0),
              seedlingCount: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'seedling')?.itemCount || 0),
              productCount: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'product')?.itemCount || 0),
              seedQuantity: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'seed')?.totalQuantity || 0),
              seedlingQuantity: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'seedling')?.totalQuantity || 0),
              productQuantity: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'product')?.totalQuantity || 0),
              seedAmount: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'seed')?.totalAmount || 0),
              seedlingAmount: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'seedling')?.totalAmount || 0),
              productAmount: Number(inventoryStats.find((s: any) => (s.stock_type || s.stockType) === 'product')?.totalAmount || 0),
            },
            items: inventoryItems,
          },
        ],
      },
    });
  } catch (error) {
    console.error('获取全链条概览失败:', error);
    res.status(500).json({ success: false, error: '获取全链条概览失败' });
  }
});

/**
 * GET /api/summary/chain-timeline
 * 2026-07-22：全链路操作时间线端点（追溯页面核心组件）
 * Query:
 *   - batchCode: 按生产计划批次聚合整条链路
 *   - instanceId: 按库存实例 ID 查询
 *   - seedSourceId / seedlingId / plantingId: 按实体 ID 查询
 *   - from / to: 时间范围（YYYY-MM-DD）
 *   - limit: 默认 200，最大 500
 */
router.get('/chain-timeline', (req: Request, res: Response) => {
  try {
    const { batchCode, instanceId, seedSourceId, seedlingId, plantingId, from, to, limit = '200' } = req.query;
    const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 200));

    let items: any[] = [];
    if (batchCode) {
      items = queryBatchTimeline(String(batchCode), limitNum);
    } else if (instanceId) {
      items = queryInventoryHistory(String(instanceId), limitNum);
    } else if (seedSourceId) {
      items = queryEntityHistory('seed_source', String(seedSourceId), limitNum);
    } else if (seedlingId) {
      items = queryEntityHistory('seedling', String(seedlingId), limitNum);
    } else if (plantingId) {
      items = queryEntityHistory('planting', String(plantingId), limitNum);
    } else {
      return res.status(400).json({
        success: false,
        error: '缺少 batchCode / instanceId / seedSourceId / seedlingId / plantingId 之一',
      });
    }

    // 时间过滤（occurredAt 是 ISO 字符串，可直接字符串比较）
    const filtered = items.filter((item) => {
      const occurred = String(item.occurredAt || '');
      if (from && occurred < String(from)) return false;
      if (to && occurred > String(to)) return false;
      return true;
    });

    res.json({ success: true, data: { items: filtered, total: filtered.length } });
  } catch (e: any) {
    console.error('[GET /summary/chain-timeline]', e);
    res.status(500).json({ success: false, error: e.message });
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
