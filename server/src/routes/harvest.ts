/**
 * 采收记录 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 初始化采收记录数据
 * GET /api/harvest/init
 */
router.get('/init', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // 查询现有数据
    let sql = 'SELECT * FROM harvest_records ORDER BY create_time DESC LIMIT 100';
    const items = queryToObjects(db, sql, []);

    // 如果没有数据，添加示例数据
    if (items.length === 0) {
      const now = new Date().toISOString();
      const defaultData = [
        {
          id: 'HV001',
          harvest_code: 'HV20260501001',
          source_id: 'PL001',
          source_name: 'ZZ2026-001-01',
          crop_name: '番茄',
          crop_variety: '红果番茄',
          greenhouse_name: '一棚',
          harvest_date: '2026-05-01',
          harvest_quantity: 500,
          unit: 'kg',
          unit_price: 3.5,
          total_amount: 1750,
          quality_grade: 'A级',
          buyer_id: 'BUY001',
          buyer_name: '永辉超市',
          sales_channel: '商超',
          status: 'completed',
          remarks: '第一批采收',
          create_by: '李明辉',
          create_time: now,
          update_time: now
        },
        {
          id: 'HV002',
          harvest_code: 'HV20260502001',
          source_id: 'PL002',
          source_name: 'ZZ2026-002-01',
          crop_name: '黄瓜',
          crop_variety: '水果黄瓜',
          greenhouse_name: '二棚',
          harvest_date: '2026-05-02',
          harvest_quantity: 300,
          unit: 'kg',
          unit_price: 2.5,
          total_amount: 750,
          quality_grade: 'A级',
          buyer_id: 'BUY002',
          buyer_name: '沃尔玛',
          sales_channel: '商超',
          status: 'completed',
          remarks: '第二批采收',
          create_by: '王建国',
          create_time: now,
          update_time: now
        }
      ];

      for (const item of defaultData) {
        db.run(`
          INSERT INTO harvest_records (id, harvest_code, source_id, source_name, crop_name, crop_variety, greenhouse_name,
            harvest_date, harvest_quantity, unit, unit_price, total_amount, quality_grade,
            buyer_id, buyer_name, sales_channel, status, remarks, create_by, create_time, update_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [item.id, item.harvest_code, item.source_id, item.source_name, item.crop_name, item.crop_variety, item.greenhouse_name,
            item.harvest_date, item.harvest_quantity, item.unit, item.unit_price, item.total_amount, item.quality_grade,
            item.buyer_id, item.buyer_name, item.sales_channel, item.status, item.remarks, item.create_by, item.create_time, item.update_time]);
      }
      saveDatabase();

      // 重新查询
      const newItems = queryToObjects(db, sql, []);
      return res.json({ success: true, data: newItems, meta: { total: newItems.length } });
    }

    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('初始化采收记录失败:', error);
    res.status(500).json({ success: false, error: '初始化采收记录失败' });
  }
});

/**
 * 重置采收记录数据
 * POST /api/harvest/reset
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 清空现有数据
    db.run('DELETE FROM harvest_records');

    // 插入默认数据
    const defaultData = [
      {
        id: 'HV001',
        harvest_code: 'HV20260501001',
        source_id: 'PL001',
        source_name: 'ZZ2026-001-01',
        crop_name: '番茄',
        crop_variety: '红果番茄',
        greenhouse_name: '一棚',
        harvest_date: '2026-05-01',
        harvest_quantity: 500,
        unit: 'kg',
        unit_price: 3.5,
        total_amount: 1750,
        quality_grade: 'A级',
        buyer_id: 'BUY001',
        buyer_name: '永辉超市',
        sales_channel: '商超',
        status: 'completed',
        remarks: '第一批采收',
        create_by: '李明辉'
      },
      {
        id: 'HV002',
        harvest_code: 'HV20260502001',
        source_id: 'PL002',
        source_name: 'ZZ2026-002-01',
        crop_name: '黄瓜',
        crop_variety: '水果黄瓜',
        greenhouse_name: '二棚',
        harvest_date: '2026-05-02',
        harvest_quantity: 300,
        unit: 'kg',
        unit_price: 2.5,
        total_amount: 750,
        quality_grade: 'A级',
        buyer_id: 'BUY002',
        buyer_name: '沃尔玛',
        sales_channel: '商超',
        status: 'completed',
        remarks: '第二批采收',
        create_by: '王建国'
      }
    ];

    for (const item of defaultData) {
      db.run(`
        INSERT INTO harvest_records (id, harvest_code, source_id, source_name, crop_name, crop_variety, greenhouse_name,
          harvest_date, harvest_quantity, unit, unit_price, total_amount, quality_grade,
          buyer_id, buyer_name, sales_channel, status, remarks, create_by, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, item.harvest_code, item.source_id, item.source_name, item.crop_name, item.crop_variety, item.greenhouse_name,
          item.harvest_date, item.harvest_quantity, item.unit, item.unit_price, item.total_amount, item.quality_grade,
          item.buyer_id, item.buyer_name, item.sales_channel, item.status, item.remarks, item.create_by, now, now]);
    }

    saveDatabase();
    res.json({ success: true, message: '采收记录已重置' });
  } catch (error) {
    console.error('重置采收记录失败:', error);
    res.status(500).json({ success: false, error: '重置采收记录失败' });
  }
});

/**
 * 生成采收单号
 * GET /api/harvest/generate-code
 */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const code = `HV${year}${month}${day}${hours}${minutes}${seconds}${random}`;
    res.json({ success: true, data: { code } });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成采收单号失败' });
  }
});

/**
 * 获取采收统计数据
 * GET /api/harvest/stats
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const { start_date, end_date, crop_name, greenhouse_name } = req.query;
    const db = getDatabase();

    // 构建基础WHERE条件
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (start_date) {
      whereClause += ' AND harvest_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND harvest_date <= ?';
      params.push(end_date);
    }
    if (crop_name) {
      whereClause += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }
    if (greenhouse_name) {
      whereClause += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    // 总记录数
    const countSql = `SELECT COUNT(*) as total FROM harvest_records ${whereClause}`;
    const countResult = queryToObjects(db, countSql, params);
    const totalRecords = countResult[0]?.total || 0;

    // 总采收量
    const yieldParams = [...params];
    const yieldSql = `SELECT COALESCE(SUM(harvest_quantity), 0) as total_yield FROM harvest_records ${whereClause}`;
    const yieldResult = queryToObjects(db, yieldSql, yieldParams);
    const totalYield = Number(yieldResult[0]?.totalYield) || 0;

    // 总产值
    const amountParams = [...params];
    const amountSql = `SELECT COALESCE(SUM(total_amount), 0) as total_amount FROM harvest_records ${whereClause}`;
    const amountResult = queryToObjects(db, amountSql, amountParams);
    const totalAmount = Number(amountResult[0]?.totalAmount) || 0;

    // 按状态统计
    const statusParams = [...params];
    const statusSql = `
      SELECT status, COUNT(*) as count, COALESCE(SUM(harvest_quantity), 0) as yield
      FROM harvest_records
      ${whereClause}
      GROUP BY status
    `;
    const statusResult = queryToObjects(db, statusSql, statusParams);

    // 按作物统计（TOP 5）
    const cropParams = [...params];
    const cropSql = `
      SELECT crop_name as name, COALESCE(SUM(harvest_quantity), 0) as value, COUNT(*) as count
      FROM harvest_records
      ${whereClause}
      GROUP BY crop_name
      ORDER BY value DESC
      LIMIT 5
    `;
    const cropResult = queryToObjects(db, cropSql, cropParams);

    // 按温室统计
    const greenhouseParams = [...params];
    const greenhouseSql = `
      SELECT greenhouse_name as name, COALESCE(SUM(harvest_quantity), 0) as value, COUNT(*) as count
      FROM harvest_records
      ${whereClause}
      GROUP BY greenhouse_name
      ORDER BY value DESC
    `;
    const greenhouseResult = queryToObjects(db, greenhouseSql, greenhouseParams);

    // 按质量等级统计
    const gradeParams = [...params];
    const gradeSql = `
      SELECT quality_grade as name, COALESCE(SUM(harvest_quantity), 0) as value, COUNT(*) as count
      FROM harvest_records
      ${whereClause}
      GROUP BY quality_grade
      ORDER BY value DESC
    `;
    const gradeResult = queryToObjects(db, gradeSql, gradeParams);

    res.json({
      success: true,
      data: {
        overview: {
          totalRecords,
          totalYield,
          totalAmount,
          avgPrice: totalYield > 0 ? Math.round((totalAmount / totalYield) * 100) / 100 : 0
        },
        byStatus: statusResult,
        byCrop: cropResult,
        byGreenhouse: greenhouseResult,
        byGrade: gradeResult
      }
    });
  } catch (error) {
    console.error('获取采收统计失败:', error);
    res.status(500).json({ success: false, error: '获取采收统计失败' });
  }
});

/**
 * 导出采收数据
 * GET /api/harvest/export
 */
router.get('/export', (req: Request, res: Response) => {
  try {
    const { start_date, end_date, crop_name, greenhouse_name, status, format = 'json' } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM harvest_records WHERE 1=1';
    const params: any[] = [];

    if (start_date) {
      sql += ' AND harvest_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND harvest_date <= ?';
      params.push(end_date);
    }
    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }
    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY harvest_date DESC, create_time DESC';

    const items = queryToObjects(db, sql, params);

    if (format === 'csv') {
      // CSV格式导出
      const headers = [
        '采收单号', '来源ID', '来源名称', '作物名称', '作物品种', '温室名称',
        '采收日期', '采收量', '单位', '单价', '总金额', '品质等级',
        '买家ID', '买家名称', '销售渠道', '状态', '备注', '创建人', '创建时间', '更新时间'
      ];
      const csvRows = [headers.join(',')];
      items.forEach((item: any) => {
        const row = [
          item.harvest_code || '',
          item.source_id || '',
          item.source_name || '',
          item.crop_name || '',
          item.crop_variety || '',
          item.greenhouse_name || '',
          item.harvest_date || '',
          item.harvest_quantity || 0,
          item.unit || '',
          item.unit_price || 0,
          item.total_amount || 0,
          item.quality_grade || '',
          item.buyer_id || '',
          item.buyer_name || '',
          item.sales_channel || '',
          item.status || '',
          (item.remarks || '').replace(/"/g, '""'),
          item.create_by || '',
          item.create_time || '',
          item.update_time || ''
        ].map(v => `"${v}"`).join(',');
        csvRows.push(row);
      });

      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=harvest_records_${new Date().toISOString().slice(0, 10)}.csv`);
      res.send(csvRows.join('\n'));
    } else {
      // JSON格式导出（默认）
      res.json({ success: true, data: items, meta: { total: items.length } });
    }
  } catch (error) {
    console.error('导出采收数据失败:', error);
    res.status(500).json({ success: false, error: '导出采收数据失败' });
  }
});

/**
 * 批量获取采收记录
 * GET /api/harvest/batch?ids=id1,id2,id3
 */
router.get('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ success: false, error: '缺少ids参数' });
    }

    const idArray = (ids as string).split(',').filter(Boolean);
    if (idArray.length === 0) {
      return res.status(400).json({ success: false, error: 'ids参数格式无效' });
    }

    const db = getDatabase();
    const placeholders = idArray.map(() => '?').join(',');
    const sql = `SELECT * FROM harvest_records WHERE id IN (${placeholders}) ORDER BY create_time DESC`;
    const items = queryToObjects(db, sql, idArray);

    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('批量获取采收记录失败:', error);
    res.status(500).json({ success: false, error: '批量获取采收记录失败' });
  }
});

/**
 * 根据批次号获取采收记录
 * GET /api/harvest/batch-code/:batchCode
 */
router.get('/batch-code/:batchCode', (req: Request, res: Response) => {
  try {
    const { batchCode } = req.params;
    if (!batchCode) {
      return res.status(400).json({ success: false, error: '缺少批次号参数' });
    }

    const db = getDatabase();
    const sql = 'SELECT * FROM harvest_records WHERE source_id = ? OR source_name = ? ORDER BY harvest_date DESC, create_time DESC';
    const items = queryToObjects(db, sql, [batchCode, batchCode]);

    res.json({ success: true, data: items, meta: { total: items.length } });
  } catch (error) {
    console.error('根据批次号获取采收记录失败:', error);
    res.status(500).json({ success: false, error: '根据批次号获取采收记录失败' });
  }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const { crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM harvest_records WHERE 1=1';
    const params: any[] = [];

    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
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

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取采收记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM harvest_records WHERE id = ?');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '采收记录不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取采收详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, harvest_code, source_id, source_name, crop_name, crop_variety, greenhouse_name,
            harvest_date, harvest_quantity, unit, unit_price, total_amount, quality_grade,
            buyer_id, buyer_name, sales_channel, status, remarks, create_by } = req.body;

    const newId = id || `HV${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO harvest_records (id, harvest_code, source_id, source_name, crop_name, crop_variety, greenhouse_name,
        harvest_date, harvest_quantity, unit, unit_price, total_amount, quality_grade,
        buyer_id, buyer_name, sales_channel, status, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, harvest_code, source_id, source_name, crop_name, crop_variety, greenhouse_name,
        harvest_date, harvest_quantity, unit, unit_price, total_amount, quality_grade,
        buyer_id, buyer_name, sales_channel, status || 'pending', remarks, create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建采收记录失败:', error);
    res.status(500).json({ success: false, error: '创建采收记录失败' });
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

    db.run(`UPDATE harvest_records SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新采收记录失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM harvest_records WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除采收记录失败' });
  }
});

// 批量更新采收记录
router.put('/batch', (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少ids参数或ids不是有效数组' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: '缺少updates参数或updates不是有效对象' });
    }

    const now = new Date().toISOString();
    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now);

    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE harvest_records SET ${fields}, update_time = ? WHERE id IN (${placeholders})`, [...values, ...ids]);

    saveDatabase();
    res.json({ success: true, data: { ids, updated: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量更新采收记录失败' });
  }
});

// 批量删除采收记录
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少ids参数或ids不是有效数组' });
    }

    const db = getDatabase();
    const deletedIds: string[] = [];
    const failedIds: { id: string; reason: string }[] = [];

    // 批量查询所有记录
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM harvest_records WHERE id IN (${placeholders})`);
    stmt.bind(ids);

    // 收集所有记录到内存
    const recordsMap = new Map<string, Record<string, unknown>>();
    while (stmt.step()) {
      const record = stmt.getAsObject();
      recordsMap.set(record.id as string, record);
    }
    stmt.free();

    // 检查每个记录
    for (const id of ids) {
      const record = recordsMap.get(id);

      if (!record) {
        failedIds.push({ id, reason: '记录不存在' });
        continue;
      }

      // 只允许删除草稿状态的记录
      if (record.status !== 'draft') {
        failedIds.push({ id, reason: '只允许删除草稿状态的记录' });
        continue;
      }

      deletedIds.push(id);
    }

    // 批量删除有效的记录
    if (deletedIds.length > 0) {
      const deletePlaceholders = deletedIds.map(() => '?').join(',');
      db.run(`DELETE FROM harvest_records WHERE id IN (${deletePlaceholders})`, deletedIds);
    }

    saveDatabase();
    res.json({
      success: true,
      data: {
        deleted: deletedIds,
        failed: failedIds
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除采收记录失败' });
  }
});

export default router;
