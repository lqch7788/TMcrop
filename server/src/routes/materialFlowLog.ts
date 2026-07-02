/**
 * 物料流转追溯 API 路由
 * 2026-06-13 新建
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

// ============================================================
// GET / — 流水列表（分页筛选）
// ============================================================
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const { flowType, cropName, sourceCode, targetCode, startDate, endDate } = req.query;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (flowType && flowType !== 'all') { where += ' AND flow_type = ?'; params.push(flowType); }
    if (cropName) { where += ' AND crop_name LIKE ?'; params.push(`%${cropName}%`); }
    if (sourceCode) { where += ' AND source_code = ?'; params.push(sourceCode); }
    if (targetCode) { where += ' AND target_code = ?'; params.push(targetCode); }
    if (startDate) { where += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND created_at <= ?'; params.push(endDate + 'T23:59:59'); }

    const offset = (page - 1) * pageSize;
    const countRows = db.exec(`SELECT COUNT(*) as cnt FROM material_flow_log ${where}`, params);
    const total = Number(countRows[0]?.values?.[0]?.[0] || 0);

    const rows = db.exec(
      `SELECT * FROM material_flow_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const list = rows[0]?.values?.map((row) => {
      const cols = rows[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    }) || [];

    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// GET /trace — 单批次全链路追溯
// ============================================================
router.get('/trace', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'code 参数必填' });
    }
    const rows = db.exec(
      `SELECT * FROM material_flow_log WHERE source_code = ? OR target_code = ? ORDER BY created_at ASC`,
      [code, code]
    );
    const list = rows[0]?.values?.map((row) => {
      const cols = rows[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    }) || [];
    res.json({ success: true, data: list });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// GET /stats/by-crop — 育苗用料统计（按作物 × 来源）
// ============================================================
router.get('/stats/by-crop', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31T23:59:59`;

    const rows = db.exec(`
      SELECT crop_name, source_category,
             target_code,
             SUM(source_quantity) as total_qty,
             COALESCE(source_unit, '粒') as source_unit
      FROM material_flow_log
      WHERE flow_type = 'seed_source→seedling'
        AND created_at BETWEEN ? AND ?
      GROUP BY crop_name, source_category, target_code
      ORDER BY crop_name, total_qty DESC
    `, [start, end]);

    const list = rows[0]?.values?.map((row) => {
      const cols = rows[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    }) || [];
    res.json({ success: true, data: list });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// GET /stats/by-source — 种植用料统计（直接播种 vs 育苗移栽）
// ============================================================
router.get('/stats/by-source', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31T23:59:59`;

    const rows = db.exec(`
      SELECT crop_name, flow_type, source_category,
             target_code,
             SUM(source_quantity) as total_qty,
             COALESCE(source_unit, '株') as source_unit
      FROM material_flow_log
      WHERE flow_type IN ('seed_source→planting', 'seedling→planting')
        AND created_at BETWEEN ? AND ?
      GROUP BY crop_name, flow_type, source_category, target_code
      ORDER BY crop_name, total_qty DESC
    `, [start, end]);

    const list = rows[0]?.values?.map((row) => {
      const cols = rows[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    }) || [];
    res.json({ success: true, data: list });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// GET /stats/annual — 全链路年度总览
// ============================================================
router.get('/stats/annual', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31T23:59:59`;

    const rows = db.exec(`
      SELECT flow_type, crop_name,
             source_code, target_code, source_category,
             COUNT(*) as flow_count,
             SUM(COALESCE(source_quantity, target_quantity, 0)) as total_qty,
             COALESCE(source_unit, target_unit, '') as unit
      FROM material_flow_log
      WHERE flow_type != 'correction'
        AND created_at BETWEEN ? AND ?
      GROUP BY flow_type, crop_name, source_code, target_code
      ORDER BY flow_type, crop_name
    `, [start, end]);

    const list = rows[0]?.values?.map((row) => {
      const cols = rows[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    }) || [];
    res.json({ success: true, data: list });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// DELETE /:id — 单条删除流转记录
// 2026-06-15 新增（前端要求删除测试数据）
// ============================================================
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const result = db.run('DELETE FROM material_flow_log WHERE id = ? OR oid = ?', [id, id]);
    if ((result as any).changes === 0) {
      return res.status(404).json({ success: false, error: '流转记录不存在' });
    }
    saveDatabase();
    res.json({ success: true, data: { deletedCount: (result as any).changes } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// DELETE / — 批量删除（按 ids 复数 query 参数）
// 2026-06-15 新增
// ============================================================
router.delete('/', (req: Request, res: Response) => {
  try {
    // 兼容 ids=id1&ids=id2 和 ids=id1,id2 两种格式
    let ids: string[] = [];
    const raw = req.query.ids;
    if (Array.isArray(raw)) {
      ids = raw.flatMap(v => String(v).split(','));
    } else if (typeof raw === 'string' && raw.trim()) {
      ids = raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids 必填且非空' });
    }
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const result = db.run(
      `DELETE FROM material_flow_log WHERE id IN (${placeholders}) OR oid IN (${placeholders})`,
      [...ids, ...ids]
    );
    saveDatabase();
    res.json({ success: true, data: { deletedCount: (result as any).changes } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// GET /stats/inventory-trace — 库存来源追溯
// ============================================================
router.get('/stats/inventory-trace', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { instanceId } = req.query;
    if (!instanceId || typeof instanceId !== 'string') {
      return res.status(400).json({ success: false, error: 'instanceId 参数必填' });
    }
    const rows = db.exec(
      `SELECT * FROM material_flow_log WHERE target_type = 'inventory_stock' AND target_id = ?`,
      [instanceId]
    );
    const list = rows[0]?.values?.map((row) => {
      const cols = rows[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    }) || [];
    res.json({ success: true, data: list });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
