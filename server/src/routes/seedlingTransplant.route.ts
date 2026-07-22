/**
 * 育苗管理 — 定植/标签子路由（2026-07-21 提取）
 * 挂载点：/api/seedlings/:id
 */
import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import { getDatabase, saveDatabase } from "../db";
import { queryToObjects, execCount } from "../utils/queryHelper";
import { formatLocalDateISO } from "../utils/dateUtil";
// 2026-07-22：追溯修复 - 定植/打印操作写入 audit_log
import { writeAuditLog } from "../services/auditLog.service";

const router = Router({ mergeParams: true });
/**
 * 添加定植记录
 * POST /seedlings/:id/transplant-records
 */
router.post('/transplant-records', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      crop_name,
      crop_variety,
      greenhouse_name,
      area_name,
      from_location,
      to_location,
      transplant_date,
      transplant_quantity,
      survival_quantity,
      survival_rate,
      operator_id,
      operator_name,
      status,
      remarks,
      data,
      create_by
    } = req.body;

    // 验证育苗记录是否存在
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let seedling = null;
    if (stmt.step()) {
      seedling = stmt.getAsObject();
    }
    stmt.free();

    if (!seedling || Object.keys(seedling).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    // 生成定植记录ID和OID
    const newId = `TR${Date.now()}`;
    const newOid = `TR${Date.now()}${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 插入定植记录
    db.run(`
      INSERT INTO transplant_records (
        id, oid, transplant_code, source_type, source_id, source_name,
        crop_name, crop_variety, greenhouse_name, area_name,
        from_location, to_location, transplant_date, transplant_quantity,
        survival_quantity, survival_rate, operator_id, operator_name,
        status, remarks, data, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      newOid,
      newOid,
      'seedling',
      id,
      (seedling as any).seedling_code,
      crop_name || (seedling as any).crop_name,
      crop_variety || (seedling as any).crop_variety,
      greenhouse_name || (seedling as any).greenhouse_name,
      area_name || (seedling as any).area_name,
      from_location || ' nursery',
      to_location,
      transplant_date || formatLocalDateISO(),
      transplant_quantity || (seedling as any).survival_quantity || 0,
      survival_quantity || 0,
      survival_rate || 0,
      operator_id,
      operator_name,
      status || 'completed',
      remarks,
      data ? JSON.stringify(data) : null,
      create_by,
      now,
      now
    ]);

    // 更新育苗状态为已定植
    db.run('UPDATE seedlings SET status = ?, update_time = ? WHERE id = ?', ['transplanted', now, id]);

    saveDatabase();
    // 2026-07-22：追溯修复 - 写入 audit_log（CRITICAL 3 修复）
    writeAuditLog({
      businessType: 'seedling.transplant',
      businessId: id,
      action: 'transplant',
      operatorName: (req as any).user?.name,
      opinion: `添加定植记录 ${newId}`,
    });
    res.status(201).json({ success: true, data: queryToObjects(db, 'SELECT * FROM transplant_records WHERE id = ?', [newId])[0] });
  } catch (error) {
    console.error('添加定植记录失败:', error);
    res.status(500).json({ success: false, error: '添加定植记录失败' });
  }
});

/**
 * 更新定植记录状态
 * PUT /seedlings/:id/transplant-records/:recordId/status
 */
router.put('/transplant-records/:recordId/status', (req: Request, res: Response) => {
  try {
    const { id, recordId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: '缺少 status 参数' });
    }

    const db = getDatabase();

    // 检查定植记录是否存在
    const stmt = db.prepare('SELECT * FROM transplant_records WHERE id = ? AND source_id = ? AND source_type = ?');
    stmt.bind([recordId, id, 'seedling']);
    let record: any = null;
    if (stmt.step()) {
      record = stmt.getAsObject();
    }
    stmt.free();

    if (!record || Object.keys(record).length === 0) {
      return res.status(404).json({ success: false, error: '定植记录不存在' });
    }

    const now = new Date().toISOString();
    db.run('UPDATE transplant_records SET status = ?, update_time = ? WHERE id = ?', [status, now, recordId]);
    saveDatabase();

    res.json({ success: true, data: { id: recordId, status } });
    // 2026-07-22：追溯修复 - 写入 audit_log
    writeAuditLog({
      businessType: 'seedling.transplant',
      businessId: recordId,
      action: 'update',
      operatorName: (req as any).user?.name,
      opinion: `更新定植记录状态 ${status}`,
    });
  } catch (error) {
    console.error('更新定植记录状态失败:', error);
    res.status(500).json({ success: false, error: '更新定植记录状态失败' });
  }
});

/**
 * 获取育苗的定植记录列表
 * GET /seedlings/:id/transplant-records
 */
router.get('/transplant-records', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 获取该育苗的定植记录
    const countSql = 'SELECT COUNT(*) FROM transplant_records WHERE source_id = ? AND source_type = ?';
    const countParams = [id, 'seedling'];
    const total = execCount(db, countSql, countParams);

    let sql = 'SELECT * FROM transplant_records WHERE source_id = ? AND source_type = ? ORDER BY transplant_date DESC, create_time DESC';
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ' + Number(limit) + ' OFFSET ' + offset;

    const items = queryToObjects(db, sql, [id, 'seedling']);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取定植记录失败:', error);
    res.status(500).json({ success: false, error: '获取定植记录失败' });
  }
});

/**
 * 添加打印记录
 * POST /seedlings/:id/print
 */
router.post('/print', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      print_type,
      print_title,
      printer_name,
      paper_size,
      copies,
      print_status,
      error_message,
      data,
      create_by
    } = req.body;

    // 验证育苗记录是否存在
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let seedling = null;
    if (stmt.step()) {
      seedling = stmt.getAsObject();
    }
    stmt.free();

    if (!seedling || Object.keys(seedling).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    // 生成打印记录ID和OID
    const newId = `PR${Date.now()}`;
    const newOid = `PR${Date.now()}${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 插入打印记录
    db.run(`
      INSERT INTO print_records (
        id, oid, print_type, print_title, related_id, related_code, related_type,
        printer_name, paper_size, copies, print_status, error_message, data,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      newOid,
      print_type || 'seedling_label',
      print_title || '育苗标签打印',
      id,
      (seedling as any).seedling_code,
      'seedling',
      printer_name,
      paper_size || 'A6',
      copies || 1,
      print_status || 'success',
      error_message,
      data ? JSON.stringify(data) : null,
      create_by,
      now,
      now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, oid: newOid } });
    // 2026-07-22：追溯修复 - 写入 audit_log
    writeAuditLog({
      businessType: 'seedling.print',
      businessId: id,
      action: 'print',
      operatorName: (req as any).user?.name,
      opinion: `打印定植标签`,
    });
  } catch (error) {
    console.error('添加打印记录失败:', error);
    res.status(500).json({ success: false, error: '添加打印记录失败' });
  }
});

/**
 * 获取育苗的打印记录列表
 * GET /seedlings/:id/print-records
 */
router.get('/print-records', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 获取该育苗的打印记录
    const countSql = 'SELECT COUNT(*) FROM print_records WHERE related_id = ? AND related_type = ?';
    const countParams = [id, 'seedling'];
    const total = execCount(db, countSql, countParams);

    let sql = 'SELECT * FROM print_records WHERE related_id = ? AND related_type = ? ORDER BY create_time DESC';
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ' + Number(limit) + ' OFFSET ' + offset;

    const items = queryToObjects(db, sql, [id, 'seedling']);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取打印记录失败:', error);
    res.status(500).json({ success: false, error: '获取打印记录失败' });
  }
});

/**
 * 获取可用定植数量
 * GET /api/seedlings/:id/available-count
 */
router.get('/available-count', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    const survivalQuantity = item.survival_quantity || 0;
    // 2026-06-28：业务规则变更，种植管理不再从育苗取苗，"可用定植"改为"可用苗数"：
    // 可用苗数 = 累计产出 - 累计损耗 - 采收入库累计（不含已定植，业务上已停止统计）
    const expanded = item.expanded_plant_count || 0;
    const seedlingLoss = item.seedling_loss_count || 0;
    const harvestStocked = item.harvest_stocked_count || 0;
    const availableCount = expanded - seedlingLoss - harvestStocked;

    res.json({ success: true, data: Math.max(0, availableCount) });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取可用数量失败' });
  }
});

/**
 * 增加已定植数量
 * POST /api/seedlings/:id/increase-planted
 */
router.post('/increase-planted', (req: Request, res: Response) => {
  // 2026-06-28：业务规则变更 — 种植管理不再从育苗管理页面获取种苗（统一从内部种源）。
  // 此接口保留 route 不删（避免旧调用 404），但写入 DB 的逻辑已停用，仅返回成功。
  res.json({ success: true, data: { auto_planted_count: 0 }, deprecated: true });
});

/**
 * 获取所有标签编号
 * GET /api/seedlings/:id/all-label-numbers
 */
router.get('/all-label-numbers', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    const survivalQuantity = item.survival_quantity || 0;
    const seedlingCode = item.seedling_code || item.id;
    const labelNumbers: string[] = [];

    for (let i = 1; i <= survivalQuantity; i++) {
      labelNumbers.push(`${seedlingCode}-${String(i).padStart(4, '0')}`);
    }

    res.json({ success: true, data: labelNumbers });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取标签编号失败' });
  }
});

/**
 * 获取栽种履历
 * GET /api/seedlings/:id/transplant-history
 */
router.get('/transplant-history', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 从定植记录表获取所有相关的栽种履历
    const sql = `
      SELECT * FROM transplant_records
      WHERE source_id = ? AND source_type = 'seedling'
      ORDER BY transplant_date DESC, create_time DESC
    `;
    const items = queryToObjects(db, sql, [id]);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取栽种履历失败' });
  }
});

/**
 * 获取指定标签编号的履历
 * GET /api/seedlings/:id/transplant-history/:labelNumber
 */
router.get('/transplant-history/:labelNumber', (req: Request, res: Response) => {
  try {
    const { id, labelNumber } = req.params;
    const db = getDatabase();

    // 查找该标签编号的定植记录
    const sql = `
      SELECT * FROM transplant_records
      WHERE source_id = ? AND source_type = 'seedling' AND transplant_quantity > 0
      ORDER BY transplant_date DESC, create_time DESC
    `;
    const items = queryToObjects(db, sql, [id]);

    // 过滤或模拟该标签编号的履历（实际应根据标签追踪表查询）
    const history = items.length > 0 ? items[0] : null;

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取标签履历失败' });
  }
});

/**
 * 添加栽种履历条目
 * POST /api/seedlings/:id/transplant-history/:labelNumber
 */
router.post('/transplant-history/:labelNumber', (req: Request, res: Response) => {
  try {
    const { id, labelNumber } = req.params;
    const {
      to_area,
      to_location,
      operator_id,
      operator_name,
      remarks,
      create_by
    } = req.body;

    const db = getDatabase();

    // 验证育苗记录是否存在
    const stmt = db.prepare('SELECT * FROM seedlings WHERE id = ?');
    stmt.bind([id]);
    let seedling: any = null;
    if (stmt.step()) {
      seedling = stmt.getAsObject();
    }
    stmt.free();

    if (!seedling || Object.keys(seedling).length === 0) {
      return res.status(404).json({ success: false, error: '育苗记录不存在' });
    }

    // 生成履历ID
    const newId = `TH${Date.now()}`;
    const now = new Date().toISOString();

    // 写入 transplant_history 表（2026-07-14：表已通过 schema.ts 创建）
    try {
      db.run(`
        INSERT INTO transplant_history (
          id, seedling_id, label_number, to_area, to_location,
          operator_id, operator_name, remarks, create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId, id, labelNumber, to_area || '', to_location || '',
        operator_id || '', operator_name || '', remarks || '',
        create_by || '', now, now
      ]);
      saveDatabase();
    } catch (err) {
      console.error('[transplant_history] INSERT 失败:', err);
      return res.status(500).json({ success: false, error: '栽种履历写入失败' });
    }

    res.status(201).json({
      success: true,
      data: {
        id: newId,
        seedlingId: id,
        labelNumber,
        toArea: to_area,
        toLocation: to_location,
        operatorId: operator_id,
        operatorName: operator_name,
        remarks,
        createBy: create_by,
        createTime: now
      }
    });
  } catch (error) {
    console.error('添加栽种履历失败:', error);
    res.status(500).json({ success: false, error: '添加栽种履历失败' });
  }
});

/**
 * 更新标签状态
 * PUT /api/seedlings/:id/transplant-history/:labelNumber/status
 */
router.put('/transplant-history/:labelNumber/status', (req: Request, res: Response) => {
  try {
    const { id, labelNumber } = req.params;
    const { status } = req.body;
    const db = getDatabase();

    if (!status) {
      return res.status(400).json({ success: false, error: '缺少 status 参数' });
    }

    // 2026-07-14：修复空操作 bug — 原代码仅 return {success:true} 不执行任何更新
    const stmt = db.prepare('UPDATE transplant_history SET status = ?, update_time = ? WHERE seedling_id = ? AND label_number = ?');
    stmt.bind([status, new Date().toISOString(), id, labelNumber]);
    stmt.step();
    stmt.free();
    saveDatabase();

    res.json({ success: true, message: '标签状态已更新' });
  } catch (error) {
    console.error('[seedling] 更新标签状态失败:', error);
    res.status(500).json({ success: false, error: '更新标签状态失败' });
  }
});

/**
 * GET /api/seedlings/:id/history
 * 2026-06-27: 育苗实体历史（audit_logs + inbound + transaction UNION）
 */

export default router;