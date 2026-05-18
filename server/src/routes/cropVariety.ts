/**
 * 作物品种 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

/**
 * 获取所有作物品种
 * 支持 keyword 参数搜索
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { keyword } = req.query;

    let sql = 'SELECT * FROM crop_varieties WHERE 1=1';
    const params: string[] = [];

    if (keyword) {
      sql += ' AND (variety_name LIKE ? OR sub_variety1_name LIKE ? OR detail_variety_name LIKE ? OR crop_code LIKE ?)';
      const kw = `%${keyword}%`;
      // Use separate parameter entries for each LIKE clause to avoid sql.js binding issues
      params.push(kw);
      params.push(kw);
      params.push(kw);
      params.push(kw);
    }

    sql += ' ORDER BY crop_code';

    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const varieties: Record<string, unknown>[] = [];
    while (stmt.step()) {
      varieties.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({
      success: true,
      data: varieties,
      meta: {
        total: varieties.length
      }
    });
  } catch (error) {
    console.error('获取作物品种失败:', error);
    res.status(500).json({
      success: false,
      error: '获取作物品种失败'
    });
  }
});

/**
 * 根据ID获取单个作物品种
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM crop_varieties WHERE id = ?');
    stmt.bind([id]);
    stmt.step();
    const variety = stmt.getAsObject();

    if (!variety || Object.keys(variety).length === 0) {
      return res.status(404).json({
        success: false,
        error: '作物品种不存在'
      });
    }

    res.json({
      success: true,
      data: variety
    });
  } catch (error) {
    console.error('获取作物品种详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取作物品种详情失败'
    });
  }
});

/**
 * 创建作物品种
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const newId = req.body.id || `CV${Date.now()}`;

    // 所有支持的字段列表（snake_case）
    const fields = [
      'id', 'crop_code', 'category_code', 'category_name', 'type_code', 'type_name',
      'variety_code', 'variety_name', 'sub_variety1_code', 'sub_variety1_name',
      'detail_variety_code', 'detail_variety_name',
      'alias', 'image', 'description',
      'germination_period', 'seedling_period', 'flowering_period', 'fruiting_period', 'harvest_period',
      'air_temperature', 'air_humidity', 'co2_content', 'light_intensity',
      'soil_temperature', 'soil_humidity', 'soil_ph', 'soil_ec',
      'remarks', 'status'
    ];

    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        columns.push(field);
        placeholders.push('?');
        // alias 可能是数组，转为 JSON 字符串存储
        if (field === 'alias' && Array.isArray(req.body[field])) {
          values.push(JSON.stringify(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
      }
    }

    // 确保 ID 总是包含
    if (!columns.includes('id')) {
      columns.unshift('id');
      placeholders.unshift('?');
      values.unshift(newId);
    }

    columns.push('create_time', 'update_time');
    placeholders.push('?', '?');
    values.push(now, now);

    const db = getDatabase();
    db.run(
      `INSERT INTO crop_varieties (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    );

    saveDatabase();

    // 返回完整记录
    const stmt = db.prepare('SELECT * FROM crop_varieties WHERE id = ?');
    stmt.bind([newId]);
    stmt.step();
    const fullRecord = stmt.getAsObject();
    stmt.free();

    res.status(201).json({
      success: true,
      data: fullRecord
    });
  } catch (error) {
    console.error('创建作物品种失败:', error);
    res.status(500).json({
      success: false,
      error: '创建作物品种失败',
      detail: (error as Error).message
    });
  }
});

/**
 * 更新作物品种
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    // 只允许更新 crop_varieties 表中存在的字段
    const allowedFields = [
      'crop_code', 'category_code', 'category_name',
      'type_code', 'type_name',
      'variety_code', 'variety_name',
      'sub_variety1_code', 'sub_variety1_name',
      'detail_variety_code', 'detail_variety_name',
      'alias', 'image', 'description',
      'germination_period', 'seedling_period', 'flowering_period', 'fruiting_period', 'harvest_period',
      'air_temperature', 'air_humidity', 'co2_content', 'light_intensity',
      'soil_temperature', 'soil_humidity', 'soil_ph', 'soil_ec',
      'remarks', 'status'
    ];

    // 构建更新语句，只包含允许的字段
    const validUpdates: string[] = [];
    const values: any[] = [];

    for (const key of Object.keys(updates)) {
      if (key !== 'id' && allowedFields.includes(key)) {
        validUpdates.push(`${key} = ?`);
        // alias 如果是数组，转为 JSON 字符串存储
        if (key === 'alias' && Array.isArray(updates[key])) {
          values.push(JSON.stringify(updates[key]));
        } else {
          values.push(updates[key]);
        }
      }
    }

    if (validUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有需要更新的字段或字段不被允许'
      });
    }

    values.push(now, id);

    db.run(`UPDATE crop_varieties SET ${validUpdates.join(', ')}, update_time = ? WHERE id = ?`, values);
    saveDatabase();

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('更新作物品种失败:', error);
    res.status(500).json({
      success: false,
      error: '更新作物品种失败'
    });
  }
});

/**
 * 删除作物品种
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM crop_varieties WHERE id = ?', [id]);
    saveDatabase();

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('删除作物品种失败:', error);
    res.status(500).json({
      success: false,
      error: '删除作物品种失败'
    });
  }
});

// ==================== 类别扩展 API ====================

/**
 * 获取所有扩展类别
 */
router.get('/extensions/categories', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM crop_variety_category_extensions ORDER BY sort_order, category_code');

    if (results.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { columns, values } = results[0];
    const extensions = values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: extensions });
  } catch (error) {
    console.error('获取类别扩展失败:', error);
    res.status(500).json({ success: false, error: '获取类别扩展失败' });
  }
});

/**
 * 创建类别扩展
 */
router.post('/extensions/categories', (req: Request, res: Response) => {
  try {
    const { id, category_code, category_name, sort_order = 0, status = 'active' } = req.body;

    if (!category_code || !category_name) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const newId = id || `CATEXT${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO crop_variety_category_extensions
      (id, category_code, category_name, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [newId, category_code, category_name, sort_order, status, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建类别扩展失败:', error);
    res.status(500).json({ success: false, error: '创建类别扩展失败' });
  }
});

/**
 * 删除类别扩展
 */
router.delete('/extensions/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM crop_variety_category_extensions WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除类别扩展失败:', error);
    res.status(500).json({ success: false, error: '删除类别扩展失败' });
  }
});

/**
 * 更新类别扩展
 */
router.put('/extensions/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category_name, sort_order, status } = req.body;
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run(
      `UPDATE crop_variety_category_extensions SET category_name = ?, sort_order = ?, status = ?, updated_at = ? WHERE id = ?`,
      [category_name, sort_order || 0, status || 'active', now, id]
    );
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新类别扩展失败:', error);
    res.status(500).json({ success: false, error: '更新类别扩展失败' });
  }
});

// ==================== 类型扩展 API ====================

/**
 * 获取指定类别的所有扩展类型
 */
router.get('/extensions/types/:categoryCode', (req: Request, res: Response) => {
  try {
    const { categoryCode } = req.params;
    const db = getDatabase();
    const results = db.exec(`SELECT * FROM crop_variety_type_extensions WHERE category_code = ? ORDER BY sort_order, type_code`, [categoryCode]);

    if (results.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { columns, values } = results[0];
    const extensions = values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: extensions });
  } catch (error) {
    console.error('获取类型扩展失败:', error);
    res.status(500).json({ success: false, error: '获取类型扩展失败' });
  }
});

/**
 * 获取所有扩展类型
 */
router.get('/extensions/types', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM crop_variety_type_extensions ORDER BY category_code, sort_order, type_code');

    if (results.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { columns, values } = results[0];
    const extensions = values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: extensions });
  } catch (error) {
    console.error('获取所有类型扩展失败:', error);
    res.status(500).json({ success: false, error: '获取类型扩展失败' });
  }
});

/**
 * 创建类型扩展
 */
router.post('/extensions/types', (req: Request, res: Response) => {
  try {
    const { id, category_code, category_name, type_code, type_name, sort_order = 0, status = 'active' } = req.body;

    if (!category_code || !type_code || !type_name) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const newId = id || `TYPEXT${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO crop_variety_type_extensions
      (id, category_code, category_name, type_code, type_name, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, category_code, category_name, type_code, type_name, sort_order, status, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建类型扩展失败:', error);
    res.status(500).json({ success: false, error: '创建类型扩展失败' });
  }
});

/**
 * 删除类型扩展
 */
router.delete('/extensions/types/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM crop_variety_type_extensions WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除类型扩展失败:', error);
    res.status(500).json({ success: false, error: '删除类型扩展失败' });
  }
});

/**
 * 更新类型扩展
 */
router.put('/extensions/types/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type_name, sort_order, status } = req.body;
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run(
      `UPDATE crop_variety_type_extensions SET type_name = ?, sort_order = ?, status = ?, updated_at = ? WHERE id = ?`,
      [type_name, sort_order || 0, status || 'active', now, id]
    );
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新类型扩展失败:', error);
    res.status(500).json({ success: false, error: '更新类型扩展失败' });
  }
});

// ==================== 品种扩展 API ====================

/**
 * 获取所有扩展品种（放在前面，避免被 :categoryCode/:typeCode 匹配）
 */
router.get('/extensions/varieties', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM crop_variety_variety_extensions ORDER BY category_code, type_code, sort_order, variety_code');

    if (results.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { columns, values } = results[0];
    const extensions = values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: extensions });
  } catch (error) {
    console.error('获取所有品种扩展失败:', error);
    res.status(500).json({ success: false, error: '获取品种扩展失败' });
  }
});

/**
 * 获取指定类型的所有扩展品种
 */
router.get('/extensions/varieties/:categoryCode/:typeCode', (req: Request, res: Response) => {
  try {
    const { categoryCode, typeCode } = req.params;
    const db = getDatabase();
    const results = db.exec(
      `SELECT * FROM crop_variety_variety_extensions WHERE category_code = ? AND type_code = ? ORDER BY sort_order, variety_code`,
      [categoryCode, typeCode]
    );

    if (results.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { columns, values } = results[0];
    const extensions = values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: extensions });
  } catch (error) {
    console.error('获取品种扩展失败:', error);
    res.status(500).json({ success: false, error: '获取品种扩展失败' });
  }
});

/**
 * 创建品种扩展
 */
router.post('/extensions/varieties', (req: Request, res: Response) => {
  try {
    const { id, category_code, type_code, variety_code, variety_name, sort_order = 0, status = 'active' } = req.body;

    if (!category_code || !type_code || !variety_code || !variety_name) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const newId = id || `VAREXT${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO crop_variety_variety_extensions
      (id, category_code, type_code, variety_code, variety_name, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, category_code, type_code, variety_code, variety_name, sort_order, status, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建品种扩展失败:', error);
    res.status(500).json({ success: false, error: '创建品种扩展失败' });
  }
});

/**
 * 删除品种扩展
 */
router.delete('/extensions/varieties/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM crop_variety_variety_extensions WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除品种扩展失败:', error);
    res.status(500).json({ success: false, error: '删除品种扩展失败' });
  }
});

/**
 * 更新品种扩展
 */
router.put('/extensions/varieties/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variety_name, sort_order, status } = req.body;
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run(
      `UPDATE crop_variety_variety_extensions SET variety_name = ?, sort_order = ?, status = ?, updated_at = ? WHERE id = ?`,
      [variety_name, sort_order || 0, status || 'active', now, id]
    );
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新品种扩展失败:', error);
    res.status(500).json({ success: false, error: '更新品种扩展失败' });
  }
});

// ==================== 子品种1扩展 API ====================

/**
 * 获取所有扩展子品种1（放在前面，避免被 :categoryCode/:typeCode/:varietyCode 匹配）
 */
router.get('/extensions/subvariety1', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM crop_variety_sub1_extensions ORDER BY category_code, type_code, variety_code, sort_order, sub_variety1_code');

    if (results.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { columns, values } = results[0];
    const extensions = values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: extensions });
  } catch (error) {
    console.error('获取所有子品种1扩展失败:', error);
    res.status(500).json({ success: false, error: '获取子品种1扩展失败' });
  }
});

/**
 * 获取指定品种的所有扩展子品种1
 */
router.get('/extensions/subvariety1/:categoryCode/:typeCode/:varietyCode', (req: Request, res: Response) => {
  try {
    const { categoryCode, typeCode, varietyCode } = req.params;
    const db = getDatabase();
    const results = db.exec(
      `SELECT * FROM crop_variety_sub1_extensions WHERE category_code = ? AND type_code = ? AND variety_code = ? ORDER BY sort_order, sub_variety1_code`,
      [categoryCode, typeCode, varietyCode]
    );

    if (results.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { columns, values } = results[0];
    const extensions = values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    res.json({ success: true, data: extensions });
  } catch (error) {
    console.error('获取子品种1扩展失败:', error);
    res.status(500).json({ success: false, error: '获取子品种1扩展失败' });
  }
});

/**
 * 创建子品种1扩展
 */
router.post('/extensions/subvariety1', (req: Request, res: Response) => {
  try {
    const { id, category_code, type_code, variety_code, sub_variety1_code, sub_variety1_name, sort_order = 0, status = 'active' } = req.body;

    if (!category_code || !type_code || !variety_code || !sub_variety1_code || !sub_variety1_name) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const newId = id || `SUBEXT${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO crop_variety_sub1_extensions
      (id, category_code, type_code, variety_code, sub_variety1_code, sub_variety1_name, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, category_code, type_code, variety_code, sub_variety1_code, sub_variety1_name, sort_order, status, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建子品种1扩展失败:', error);
    res.status(500).json({ success: false, error: '创建子品种1扩展失败' });
  }
});

/**
 * 删除子品种1扩展
 */
router.delete('/extensions/subvariety1/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM crop_variety_sub1_extensions WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除子品种1扩展失败:', error);
    res.status(500).json({ success: false, error: '删除子品种1扩展失败' });
  }
});

/**
 * 更新子品种1扩展
 */
router.put('/extensions/subvariety1/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sub_variety1_name, sort_order, status } = req.body;
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run(
      `UPDATE crop_variety_sub1_extensions SET sub_variety1_name = ?, sort_order = ?, status = ?, updated_at = ? WHERE id = ?`,
      [sub_variety1_name, sort_order || 0, status || 'active', now, id]
    );
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新子品种1扩展失败:', error);
    res.status(500).json({ success: false, error: '更新子品种1扩展失败' });
  }
});

/**
 * 批量导入作物品种（用于数据迁移）
 * 按 crop_code 去重，已存在的跳过
 */
router.post('/bulk', (req: Request, res: Response) => {
  try {
    const { varieties } = req.body;
    if (!Array.isArray(varieties) || varieties.length === 0) {
      return res.status(400).json({ success: false, error: 'varieties 数组不能为空' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    let inserted = 0;
    let skipped = 0;

    // 获取已存在的 crop_code 集合
    const existingCodes = new Set<string>();
    const existingStmt = db.prepare('SELECT crop_code FROM crop_varieties');
    while (existingStmt.step()) {
      const row = existingStmt.getAsObject();
      if (row.crop_code) existingCodes.add(row.crop_code as string);
    }
    existingStmt.free();

    // 所有支持的字段
    const fields = [
      'id', 'crop_code', 'category_code', 'category_name', 'type_code', 'type_name',
      'variety_code', 'variety_name', 'sub_variety1_code', 'sub_variety1_name',
      'detail_variety_code', 'detail_variety_name',
      'alias', 'image', 'description',
      'germination_period', 'seedling_period', 'flowering_period', 'fruiting_period', 'harvest_period',
      'air_temperature', 'air_humidity', 'co2_content', 'light_intensity',
      'soil_temperature', 'soil_humidity', 'soil_ph', 'soil_ec',
      'remarks', 'status'
    ];

    for (const item of varieties) {
      const cropCode = item.crop_code || item.cropCode;
      if (!cropCode) continue;
      if (existingCodes.has(cropCode)) {
        skipped++;
        continue;
      }

      const columns: string[] = [];
      const placeholders: string[] = [];
      const values: any[] = [];

      for (const field of fields) {
        // 尝试 snake_case 和 camelCase
        const value = item[field] ?? item[toCamelCase(field)];
        if (value !== undefined && value !== null) {
          columns.push(field);
          placeholders.push('?');
          if (field === 'alias' && Array.isArray(value)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }

      // 确保必填字段
      if (!columns.includes('crop_code')) {
        columns.push('crop_code');
        placeholders.push('?');
        values.push(cropCode);
      }
      if (!columns.includes('status')) {
        columns.push('status');
        placeholders.push('?');
        values.push('active');
      }

      columns.push('create_time', 'update_time');
      placeholders.push('?', '?');
      values.push(now, now);

      try {
        db.run(
          `INSERT INTO crop_varieties (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
          values
        );
        existingCodes.add(cropCode);
        inserted++;
      } catch (e) {
        console.error(`插入 ${cropCode} 失败:`, e);
      }
    }

    if (inserted > 0) {
      saveDatabase();
    }

    res.json({
      success: true,
      data: { inserted, skipped, total: varieties.length }
    });
  } catch (error) {
    console.error('批量导入作物品种失败:', error);
    res.status(500).json({ success: false, error: '批量导入作物品种失败' });
  }
});

// snake_case → camelCase 辅助函数
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export default router;
