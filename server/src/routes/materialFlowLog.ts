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
// 2026-07-16：加 LIMIT 200 硬上限（热门批号可达 10k+ 行 → 加 LIMIT 防止 dev server OOM）
//             超出截断时返回 truncated=true 让前端提示「仅显示最近 200 条」可再翻页
// ============================================================
router.get('/trace', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'code 参数必填' });
    }
    const TRACE_LIMIT = 200;
    // 先 COUNT 一次判断是否截断
    const countRows = db.exec(
      `SELECT COUNT(*) AS cnt FROM material_flow_log WHERE source_code = ? OR target_code = ?`,
      [code, code]
    );
    const total = Number(countRows[0]?.values?.[0]?.[0] || 0);
    const truncated = total > TRACE_LIMIT;
    const rows = db.exec(
      `SELECT * FROM material_flow_log WHERE source_code = ? OR target_code = ? ORDER BY created_at ASC LIMIT ?`,
      [code, code, TRACE_LIMIT]
    );
    const list = rows[0]?.values?.map((row) => {
      const cols = rows[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    }) || [];
    res.json({ success: true, data: list, truncated, total });
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
// 2026-07-16 安全加固：仅 admin 角色可调用；统一使用主键 id（删除 oid 备用匹配）
// ============================================================
router.delete('/:id', (req: Request, res: Response) => {
  try {
    // 2026-07-16：仅 admin 角色可删除流转审计记录
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: '无权删除流转记录，需要管理员权限' });
    }
    const { id } = req.params;
    const db = getDatabase();
    const result = db.run('DELETE FROM material_flow_log WHERE id = ?', [id]);
    if ((result as any).changes === 0) {
      return res.status(404).json({ success: false, error: '流转记录不存在' });
    }
    saveDatabase();
    // 2026-07-16：审计日志（成功也记录）
    console.log(`[audit] material-flow-log DELETE id=${id} by user=${req.user?.userId} (${req.user?.name})`);
    res.json({ success: true, data: { deletedCount: (result as any).changes } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// DELETE / — 批量删除（按 ids 复数 query 参数）
// 2026-06-15 新增
// 2026-07-16 安全加固：admin 角色 + 单次最多 100 个 + 审计
// ============================================================
const MAX_BATCH_DELETE = 100;
router.delete('/', (req: Request, res: Response) => {
  try {
    // 2026-07-16：仅 admin 角色可删除
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: '无权批量删除流转记录，需要管理员权限' });
    }
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
    // 2026-07-16：限制单次删除数量，防止 DoS
    if (ids.length > MAX_BATCH_DELETE) {
      return res.status(400).json({ success: false, error: `单次最多删除 ${MAX_BATCH_DELETE} 条，当前 ${ids.length} 条` });
    }
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const result = db.run(
      `DELETE FROM material_flow_log WHERE id IN (${placeholders})`,
      ids
    );
    saveDatabase();
    console.log(`[audit] material-flow-log BATCH DELETE count=${ids.length} by user=${req.user?.userId} (${req.user?.name})`);
    res.json({ success: true, data: { deletedCount: (result as any).changes } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================
// GET /stats/inventory-trace — 库存来源追溯
// 2026-07-16：加 ORDER BY + LIMIT 200（之前 SELECT * 无 LIMIT，长生命周期产品可达数百条）
// ============================================================
router.get('/stats/inventory-trace', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { instanceId } = req.query;
    if (!instanceId || typeof instanceId !== 'string') {
      return res.status(400).json({ success: false, error: 'instanceId 参数必填' });
    }
    const TRACE_LIMIT = 200;
    const countRows = db.exec(
      `SELECT COUNT(*) AS cnt FROM material_flow_log WHERE target_type = 'inventory_stock' AND target_id = ?`,
      [instanceId]
    );
    const total = Number(countRows[0]?.values?.[0]?.[0] || 0);
    const truncated = total > TRACE_LIMIT;
    const rows = db.exec(
      `SELECT * FROM material_flow_log WHERE target_type = 'inventory_stock' AND target_id = ? ORDER BY created_at DESC LIMIT ?`,
      [instanceId, TRACE_LIMIT]
    );
    const list = rows[0]?.values?.map((row) => {
      const cols = rows[0].columns;
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    }) || [];
    res.json({ success: true, data: list, truncated, total });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
