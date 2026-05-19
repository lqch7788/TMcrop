/**
 * 指标 API 路由
 * 提供指标的 CRUD 操作
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

// ============================================
// 指标 API
// ============================================

/**
 * 获取所有指标
 * GET /api/indicators
 * Query: category, keyword, page, limit
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      category,
      keyword,
      page = 1,
      limit = 50
    } = req.query;

    let sql = 'SELECT * FROM indicators WHERE 1=1';
    const params: (string | number)[] = [];

    if (category && category !== '全部') {
      sql += ' AND category = ?';
      params.push(category as string);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR code LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
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

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取指标列表失败:', error);
    res.status(500).json({ success: false, error: '获取指标列表失败' });
  }
});

/**
 * 获取单个指标
 * GET /api/indicators/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM indicators WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '指标不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取指标详情失败:', error);
    res.status(500).json({ success: false, error: '获取指标详情失败' });
  }
});

/**
 * 创建指标
 * POST /api/indicators
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      id,
      code,
      name,
      category,
      unit,
      target,
      actual,
      trend,
      frequency,
      source,
      warning,
      weight
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: '指标ID不能为空' });
    }

    const now = new Date().toISOString();

    // 生成指标编码
    let indicatorCode = code;
    if (!indicatorCode) {
      const prefix = 'KPI';
      const year = new Date().getFullYear().toString().slice(-2);
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

      // 查询当天最大的指标编号
      const stmt = db.prepare(`
        SELECT code FROM indicators
        WHERE code LIKE ?
        ORDER BY code DESC LIMIT 1
      `);
      stmt.bind([`${prefix}${year}${month}%`]);

      let maxSeq = 0;
      if (stmt.step()) {
        const lastCode = stmt.getAsObject().code as string;
        const seqStr = lastCode.slice(-3);
        maxSeq = parseInt(seqStr, 10) || 0;
      }
      stmt.free();

      const seq = maxSeq + 1;
      indicatorCode = `${prefix}${year}${month}${String(seq).padStart(3, '0')}`;
    }

    db.run(`
      INSERT INTO indicators (
        id, code, name, category, unit, target, actual, trend,
        frequency, source, warning, weight, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      indicatorCode,
      name || '',
      category || '生产指标',
      unit || '',
      target || 0,
      actual || 0,
      trend || 'stable',
      frequency || '月度',
      source || '人工录入',
      warning || 0,
      weight || 0,
      now,
      now
    ]);

    saveDatabase();

    // 查询完整记录返回（供前端乐观更新使用）
    const stmt2 = db.prepare('SELECT * FROM indicators WHERE id = ?');
    stmt2.bind([id]);
    let created: Record<string, unknown> | null = null;
    if (stmt2.step()) {
      created = stmt2.getAsObject();
    }
    stmt2.free();

    res.status(201).json({ success: true, message: '指标创建成功', data: created });
  } catch (error) {
    console.error('创建指标失败:', error);
    res.status(500).json({ success: false, error: '创建指标失败' });
  }
});

/**
 * 更新指标
 * PUT /api/indicators/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 先查询当前数据
    const stmt = db.prepare('SELECT * FROM indicators WHERE id = ?');
    stmt.bind([id]);
    let indicator: Record<string, unknown> | null = null;
    if (stmt.step()) {
      indicator = stmt.getAsObject();
    }
    stmt.free();

    if (!indicator) {
      return res.status(404).json({ success: false, error: '指标不存在' });
    }

    // 构建更新字段映射 (camelCase -> snake_case)
    const fieldMap: Record<string, string> = {
      code: 'code',
      name: 'name',
      category: 'category',
      unit: 'unit',
      target: 'target',
      actual: 'actual',
      trend: 'trend',
      frequency: 'frequency',
      source: 'source',
      warning: 'warning',
      weight: 'weight'
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

    db.run(`UPDATE indicators SET ${updateFields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    // 查询更新后的完整记录返回（供前端乐观更新使用）
    const stmt2 = db.prepare('SELECT * FROM indicators WHERE id = ?');
    stmt2.bind([id]);
    let updated: Record<string, unknown> | null = null;
    if (stmt2.step()) {
      updated = stmt2.getAsObject();
    }
    stmt2.free();

    res.json({ success: true, message: '指标更新成功', data: updated });
  } catch (error) {
    console.error('更新指标失败:', error);
    res.status(500).json({ success: false, error: '更新指标失败' });
  }
});

/**
 * 删除指标
 * DELETE /api/indicators/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查指标是否存在
    const stmt = db.prepare('SELECT * FROM indicators WHERE id = ?');
    stmt.bind([id]);
    let indicator: Record<string, unknown> | null = null;
    if (stmt.step()) {
      indicator = stmt.getAsObject();
    }
    stmt.free();

    if (!indicator) {
      return res.status(404).json({ success: false, error: '指标不存在' });
    }

    db.run('DELETE FROM indicators WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '指标删除成功' });
  } catch (error) {
    console.error('删除指标失败:', error);
    res.status(500).json({ success: false, error: '删除指标失败' });
  }
});

/**
 * 批量删除指标
 * DELETE /api/indicators/batch
 * Body: { ids: string[] }
 */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要删除的指标ID列表' });
    }

    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM indicators WHERE id IN (${placeholders})`, ids);
    saveDatabase();

    res.json({ success: true, message: `成功删除 ${ids.length} 个指标` });
  } catch (error) {
    console.error('批量删除指标失败:', error);
    res.status(500).json({ success: false, error: '批量删除指标失败' });
  }
});

/**
 * 重置指标数据
 * POST /api/indicators/reset
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 清空现有数据
    db.run('DELETE FROM indicators');

    // 插入默认数据
    const defaultData = [
      { id: '1', code: 'KPI001', name: '月产量完成率', category: '生产指标', unit: '%', target: 95, actual: 92.5, trend: 'up', frequency: '月度', source: '自动采集', warning: 90, weight: 15 },
      { id: '2', code: 'KPI002', name: '温室利用率', category: '资源指标', unit: '%', target: 90, actual: 88.3, trend: 'down', frequency: '月度', source: '自动采集', warning: 85, weight: 10 },
      { id: '3', code: 'KPI003', name: '种苗成活率', category: '质量指标', unit: '%', target: 98, actual: 97.2, trend: 'up', frequency: '季度', source: '自动采集', warning: 95, weight: 12 },
      { id: '4', code: 'KPI004', name: '病虫害发生率', category: '质量指标', unit: '%', target: 5, actual: 3.8, trend: 'down', frequency: '月度', source: '自动采集', warning: 8, weight: 10 },
      { id: '5', code: 'KPI005', name: '采收损耗率', category: '质量指标', unit: '%', target: 3, actual: 2.5, trend: 'down', frequency: '月度', source: '人工录入', warning: 5, weight: 8 },
      { id: '6', code: 'KPI006', name: '人工成本占比', category: '成本指标', unit: '%', target: 25, actual: 26.2, trend: 'up', frequency: '月度', source: '自动采集', warning: 28, weight: 10 },
      { id: '7', code: 'KPI007', name: '肥料利用率', category: '效率指标', unit: '%', target: 85, actual: 82.1, trend: 'up', frequency: '季度', source: '人工录入', warning: 80, weight: 8 },
      { id: '8', code: 'KPI008', name: '亩均产值', category: '效益指标', unit: '万元/亩', target: 3.5, actual: 3.2, trend: 'up', frequency: '年度', source: '人工录入', warning: 3.0, weight: 15 },
      { id: '9', code: 'KPI009', name: '客户满意度', category: '服务指标', unit: '分', target: 90, actual: 92, trend: 'up', frequency: '季度', source: '人工录入', warning: 85, weight: 10 },
      { id: '10', code: 'KPI010', name: '设备完好率', category: '设备指标', unit: '%', target: 95, actual: 94.5, trend: 'down', frequency: '月度', source: '自动采集', warning: 90, weight: 8 },
      { id: '11', code: 'KPI011', name: '水资源利用率', category: '效率指标', unit: '%', target: 80, actual: 78.5, trend: 'up', frequency: '月度', source: '自动采集', warning: 75, weight: 8 },
      { id: '12', code: 'KPI012', name: '农残检测合格率', category: '质量指标', unit: '%', target: 100, actual: 99.8, trend: 'stable', frequency: '批次', source: '人工录入', warning: 98, weight: 12 },
      { id: '13', code: 'KPI013', name: '新品研发周期', category: '效率指标', unit: '天', target: 60, actual: 55, trend: 'down', frequency: '年度', source: '人工录入', warning: 70, weight: 6 },
      { id: '14', code: 'KPI014', name: '能源消耗强度', category: '成本指标', unit: 'kWh/亩', target: 800, actual: 850, trend: 'up', frequency: '月度', source: '自动采集', warning: 900, weight: 8 },
      { id: '15', code: 'KPI015', name: '员工培训完成率', category: '服务指标', unit: '%', target: 95, actual: 93, trend: 'up', frequency: '季度', source: '人工录入', warning: 90, weight: 5 },
      { id: '16', code: 'KPI016', name: '安全事故发生率', category: '安全指标', unit: '次', target: 0, actual: 1, trend: 'up', frequency: '月度', source: '人工录入', warning: 2, weight: 15 },
    ];

    for (const item of defaultData) {
      db.run(`
        INSERT INTO indicators (
          id, code, name, category, unit, target, actual, trend,
          frequency, source, warning, weight, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id,
        item.code,
        item.name,
        item.category,
        item.unit,
        item.target,
        item.actual,
        item.trend,
        item.frequency,
        item.source,
        item.warning,
        item.weight,
        now,
        now
      ]);
    }

    saveDatabase();
    res.json({ success: true, message: '指标数据已重置' });
  } catch (error) {
    console.error('重置指标数据失败:', error);
    res.status(500).json({ success: false, error: '重置指标数据失败' });
  }
});

/**
 * 从前端 localStorage 导入数据
 * POST /api/indicators/import
 * Body: { indicators: Indicator[] }
 */
router.post('/import', (req: Request, res: Response) => {
  try {
    const { indicators } = req.body;

    if (!Array.isArray(indicators) || indicators.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的指标数据' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // 清空现有数据
    db.run('DELETE FROM indicators');

    // 批量插入前端数据
    for (const item of indicators) {
      db.run(`
        INSERT INTO indicators (
          id, code, name, category, unit, target, actual, trend,
          frequency, source, warning, weight, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id,
        item.code || '',
        item.name || '',
        item.category || '生产指标',
        item.unit || '',
        item.target || 0,
        item.actual || 0,
        item.trend || 'stable',
        item.frequency || '月度',
        item.source || '人工录入',
        item.warning || 0,
        item.weight || 0,
        now,
        now
      ]);
    }

    saveDatabase();
    res.json({ success: true, message: `成功导入 ${indicators.length} 条指标数据` });
  } catch (error) {
    console.error('导入指标数据失败:', error);
    res.status(500).json({ success: false, error: '导入指标数据失败' });
  }
});

export default router;
