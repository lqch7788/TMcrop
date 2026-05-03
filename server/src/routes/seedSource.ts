/**
 * 种源 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 使用 SQL 别名将数据库字段映射到前端期望的字段名
    // 通过 LEFT JOIN 获取 crop_varieties 表的详细信息
    // 注意：需要正确处理作物品种的多级结构：类别 > 类型 > 品种 > 子品种 > 详细品种
    let baseSql = `SELECT
      ss.id,
      ss.source_code AS seedCode,
      ss.source_name AS sourceName,
      ss.source_type AS sourceType,
      COALESCE(ss.source_origin, 'external_purchase') AS sourceOrigin,
      COALESCE(cv.category_name, ss.crop_category, '') AS cropCategory,
      COALESCE(cv.type_name, ss.type_name, '') AS typeName,
      COALESCE(cv.variety_name, ss.variety_name, '') AS varietyName,
      ss.crop_name AS cropName,
      COALESCE(ss.crop_variety, '') AS cropVariety,
      COALESCE(
        cv.category_code || cv.type_code || cv.variety_code || cv.sub_variety1_code || cv.detail_variety_code,
        ss.crop_code,
        ''
      ) AS cropCode,
      ss.supplier_id AS supplierId,
      ss.supplier_name AS supplierName,
      ss.purchase_date AS purchaseDate,
      ss.quantity,
      ss.unit,
      ss.purchase_price AS unitPrice,
      ss.total_amount AS totalAmount,
      ss.remaining_quantity AS availableCount,
      ss.quantity AS initialCount,
      '[]' AS pictures,
      ss.used_quantity AS usedQuantity,
      ss.remaining_quantity,
      ss.status,
      ss.remarks,
      ss.production_plan_code AS productionPlanCode,
      0 AS printCount,
      ss.create_by AS createBy,
      ss.create_time AS createTime,
      ss.update_time AS updateTime
    FROM seed_sources ss
    LEFT JOIN crop_varieties cv ON ss.crop_name = cv.variety_name
      OR ss.crop_name = cv.sub_variety1_name
      OR ss.crop_name = cv.detail_variety_code
    WHERE 1=1`;
    const params: any[] = [];

    if (crop_name) {
      baseSql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      baseSql += ' AND ss.status = ?';
      params.push(status);
    }

    // 保存原始SQL用于count查询
    const countSql = `SELECT COUNT(*) as total FROM seed_sources ss LEFT JOIN crop_varieties cv ON ss.crop_variety = cv.variety_name OR ss.crop_name = cv.variety_name WHERE 1=1`;
    let countParams: any[] = [];

    if (crop_name) {
      countSql += ' AND ss.crop_name LIKE ?';
      countParams.push(`%${crop_name}%`);
    }
    if (status) {
      countSql += ' AND ss.status = ?';
      countParams.push(status);
    }

    baseSql += ' ORDER BY ss.create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, countParams);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    baseSql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    // 获取数据列表
    const items = queryToObjects(db, baseSql, params);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取种源记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seed_sources WHERE id = ?');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '种源记录不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取种源详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, source_code, source_name, source_type, source_origin, crop_category, type_name, variety_name,
            crop_name, crop_variety, crop_code, supplier_id, supplier_name,
            quantity, unit, purchase_date, purchase_price, total_amount, used_quantity, remaining_quantity,
            status, remarks, production_plan_code, create_by, create_by_id } = req.body;

    const newId = id || `SS${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();
    db.run(`
      INSERT INTO seed_sources (id, source_code, source_name, source_type, source_origin,
        production_plan_code, crop_category, type_name, variety_name, crop_name, crop_variety, crop_code,
        supplier_id, supplier_name, quantity, unit, purchase_date, purchase_price,
        total_amount, used_quantity, remaining_quantity, status, remarks, create_by, create_by_id, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, source_code, source_name, source_type, source_origin || 'external_purchase',
        production_plan_code || '', crop_category || '', type_name || '', variety_name || '', crop_name, crop_variety || '', crop_code || '',
        supplier_id || '', supplier_name || '', quantity || 0, unit || '', purchase_date || '', purchase_price || 0,
        total_amount || 0, used_quantity || 0, remaining_quantity || quantity || 0,
        status || 'active', remarks || '', create_by || '', create_by_id || '', now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建种源记录失败:', error);
    res.status(500).json({ success: false, error: '创建种源记录失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE seed_sources SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新种源记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM seed_sources WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除种源记录失败' });
  }
});

export default router;
