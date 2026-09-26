/**
 * 物料申请 API 路由
 * 提供物料申请的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 生成物料申请编码
 * 格式: MR + YYYYMMDD + - + 3位流水号 (如 MR20260607-001), 共 14 字符
 * 流水号按当日自增（查询当日 MAX+1，禁止随机数）
 */
function generateMaterialRequestCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 2026-08-10：流水号 3 位 → 4 位。格式：MR + 8位日期 + - + 4位序号 = 15 字符
  const db = getDatabase();
  const pattern = `MR${dateStr}-____`;
  const stmt = db.prepare(`
    SELECT request_code FROM material_requests
    WHERE request_code LIKE ? AND LENGTH(request_code) = 15
    ORDER BY request_code DESC LIMIT 1
  `);
  stmt.bind([pattern]);
  let maxSerial = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { request_code: string };
    maxSerial = parseInt(row.request_code.slice(-4), 10) || 0;
  }
  stmt.free();

  const seq = String(maxSerial + 1).padStart(4, '0');
  return `MR${dateStr}-${seq}`;
}

/**
 * 获取物料申请列表
 * GET /api/material-requests
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { request_type, status, approval_status, department_name, applicant_name, warehouse_name, priority } = req.query;
    const db = getDatabase();

    // 2026-09-26 P0 修复：默认 limit=50 会静默截断列表（前端不做服务端分页拉取），
    // 超过 50 条申请单永远不可见。改为默认全量（上限 10000）+ page/limit 非法值防护（NaN 会使 OFFSET 失效）
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(Math.max(1, Number(req.query.limit) || 10000), 10000);

    let sql = 'SELECT * FROM material_requests WHERE 1=1';
    const params: (string | number)[] = [];

    if (request_type) {
      sql += ' AND request_type LIKE ?';
      params.push(`%${request_type}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (approval_status) {
      sql += ' AND approval_status = ?';
      params.push(approval_status as string);
    }

    if (department_name) {
      sql += ' AND department_name LIKE ?';
      params.push(`%${department_name}%`);
    }

    if (applicant_name) {
      sql += ' AND applicant_name LIKE ?';
      params.push(`%${applicant_name}%`);
    }

    if (warehouse_name) {
      sql += ' AND warehouse_name LIKE ?';
      params.push(`%${warehouse_name}%`);
    }

    if (priority) {
      sql += ' AND priority = ?';
      params.push(priority as string);
    }

    const countSql = sql;
    sql += ' ORDER BY apply_date DESC, create_time DESC';

    const total = execCount(db, countSql, params);

    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const items = queryToObjects(db, sql, params);

    // 解析 attachments 和 materials JSON 字段（兼容双重编码历史数据：解析结果非数组则置空）
    const result = items.map((item: Record<string, unknown>) => {
      let attachments: unknown = [];
      let materials: unknown = [];
      try { attachments = item.attachments ? JSON.parse(item.attachments as string) : []; } catch { attachments = []; }
      try { materials = item.materials ? JSON.parse(item.materials as string) : []; } catch { materials = []; }
      return {
        ...item,
        attachments: Array.isArray(attachments) ? attachments : [],
        materials: Array.isArray(materials) ? materials : [],
      };
    });

    res.json({ success: true, data: result, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('获取物料申请列表失败:', error);
    res.status(500).json({ success: false, error: '获取物料申请列表失败' });
  }
});

/**
 * 物料历史领用价 — GET /api/material-requests/material-price-history?materialCode=xxx
 * 注意：必须注册在 GET /:id 之前，否则 "material-price-history" 会被当作 :id 捕获
 */
router.get('/material-price-history', (req: Request, res: Response) => {
  try {
    const code = String(req.query.materialCode || '');
    if (!code) {
      return res.status(400).json({ success: false, error: '缺少物料编码' });
    }
    const db = getDatabase();
    const results = db.exec(
      'SELECT materials, apply_date FROM material_requests WHERE materials LIKE ? ORDER BY apply_date DESC, create_time DESC LIMIT 20',
      [`%"materialCode":"${code}"%`]
    );
    const prices: number[] = [];
    if (results.length > 0) {
      for (const row of results[0].values) {
        let mats: any[] = [];
        try { mats = JSON.parse(String(row[0] || '[]')); } catch { mats = []; }
        if (!Array.isArray(mats)) continue;
        for (const m of mats) {
          if ((m.materialCode || m.code) === code) {
            const p = Number(m.unitPrice);
            if (p > 0 && !prices.includes(p)) prices.push(p);
          }
        }
      }
    }
    res.json({ success: true, data: { prices: prices.slice(0, 3) } });
  } catch (error) {
    console.error('获取历史领用价失败:', error);
    res.status(500).json({ success: false, error: '获取历史领用价失败' });
  }
});

/**
 * 获取单个物料申请详情
 * GET /api/material-requests/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM material_requests WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '物料申请不存在' });
    }

    // 解析 attachments 和 materials JSON 字段
    const result = {
      ...item,
      attachments: item.attachments ? JSON.parse(item.attachments as string) : [],
      materials: item.materials ? JSON.parse(item.materials as string) : [],
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取物料申请详情失败:', error);
    res.status(500).json({ success: false, error: '获取物料申请详情失败' });
  }
});

/**
 * 创建物料申请
 * POST /api/material-requests
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id,
      request_code,
      request_title,
      request_type,
      department_id,
      department_name,
      applicant_id,
      applicant_name,
      apply_date,
      expected_date,
      warehouse_id,
      warehouse_name,
      plant_area,
      production_batch_code,
      total_amount,
      priority,
      status,
      approval_status,
      remarks,
      attachments,
      materials,
      create_by,
      reviewer,
    } = req.body;

    // 2026-09-26 P0 修复：业务日期/时间禁止 toISOString()（UTC）——北京时间 0-8 点创建的
    // 单据 apply_date 会落在前一天，导致统计按月错档（dateUtil 铁律）
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const localNow = `${localDateStr} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    let requestCode = request_code || generateMaterialRequestCode();

    // 2026-09-26 改进批次一：解析 materials（前端传字符串或数组；此前直接 JSON.stringify(字符串)
    // 会产生双重编码，靠启动迁移反复兜底——此处根治）
    let materialsArr: any[] = [];
    if (Array.isArray(materials)) {
      materialsArr = materials;
    } else if (typeof materials === 'string') {
      try {
        const parsed = JSON.parse(materials);
        materialsArr = Array.isArray(parsed) ? parsed : [];
      } catch { materialsArr = []; }
    }

    const db = getDatabase();

    // 2026-09-26 改进批次一：
    // 1) 库存软校验——超库存允许提交，但行标记 stockInsufficient + 响应返回警示清单
    // 2) total_amount 兜底重算（前端此前恒传 0，金额列全失真）
    const stockWarnings: string[] = [];
    let computedTotal = Number(total_amount) || 0;
    for (const m of materialsArr) {
      const mCode = m.materialCode || m.code || '';
      const mQty = Number(m.requestedQuantity) || 0;
      const mPrice = Number(m.unitPrice) || 0;
      computedTotal += mQty * mPrice;
      if (!mCode || mQty <= 0) continue;
      // 可用库存 = 批次剩余总量（有批次时）或 materials 主表量（无批次物料）
      const batchRows = db.exec('SELECT SUM(remaining_quantity) AS s FROM batch_inventory WHERE material_code = ?', [mCode]);
      const batchSum = batchRows.length > 0 && batchRows[0].values.length > 0 ? Number(batchRows[0].values[0][0]) || 0 : 0;
      const mainRows = db.exec('SELECT quantity FROM materials WHERE code = ?', [mCode]);
      const mainQty = mainRows.length > 0 && mainRows[0].values.length > 0 ? Number(mainRows[0].values[0][0]) || 0 : 0;
      const available = batchSum > 0 ? batchSum : mainQty;
      if (mQty > available) {
        m.stockInsufficient = true;
        stockWarnings.push(`${m.materialName || mCode}：申请 ${mQty}${m.unit || ''}，可用库存 ${available}${m.unit || ''}`);
      } else {
        m.stockInsufficient = false;
      }
    }
    // 2026-08-10 修复：id 默认等于 request_code（前端只传 request_code，避免 id 与 code 存不同值）
    let newId = id || requestCode;
    // 2026-08-10 修复：自动验重 —— 极端并发下前端拿到的列表可能落后于后端实际状态，
    //   再次确认 code 不重复；若重复则循环递增生成新 code（PRIMARY KEY 冲突会直接 500）
    const checkExists = (id: string) => {
      // sql.js 的 stmt.bind() 不会自动 reset，循环里复用同一 stmt 会失效 —— 每次重新 prepare
      const stmt = db.prepare('SELECT 1 FROM material_requests WHERE id = ? LIMIT 1');
      stmt.bind([id]);
      const exists = stmt.step();
      stmt.free();
      return exists;
    };
    for (let safety = 0; safety < 100; safety++) {
      if (!checkExists(newId)) break;
      // code 重复 —— 解析尾部序号 +1 重新生成（仅适用于 MR+日期+序号 格式）
      const m = newId.match(/^(MR\d{8}-)(\d+)$/);
      if (!m) break;
      const nextSerial = String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
      newId = m[1] + nextSerial;
      requestCode = newId;
    }

    console.log('【DEBUG】准备创建物料申请:', { newId, requestCode, request_title, request_type });

    // 检查表是否存在
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='material_requests'");
      if (!tableCheck.step()) {
        console.error('【DEBUG】material_requests 表不存在!');
        tableCheck.free();
        res.status(500).json({ success: false, error: '数据库表不存在' });
        return;
      }
      tableCheck.free();
      console.log('【DEBUG】material_requests 表存在');
    } catch (e) {
      console.error('【DEBUG】检查表失败:', e);
    }

    try {
      db.run(`
        INSERT INTO material_requests (
          id, request_code, request_title, request_type,
          department_id, department_name,
          applicant_id, applicant_name,
          apply_date, expected_date,
          warehouse_id, warehouse_name,
          plant_area, production_batch_code,
          total_amount, priority, status, approval_status,
          remarks, reviewer, attachments, materials, create_by,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        requestCode,
        request_title || null,
        request_type || null,
        department_id || null,
        department_name || null,
        applicant_id || null,
        applicant_name || null,
        apply_date || localDateStr,
        expected_date || null,
        warehouse_id || null,
        warehouse_name || null,
        plant_area || null,
        production_batch_code || null,
        computedTotal,
        priority || 'medium',
        status || 'draft',
        approval_status || 'pending',
        remarks || null,
        reviewer || null,
        JSON.stringify(attachments || []),
        JSON.stringify(materialsArr),
        create_by || null,
        localNow,
        localNow,
      ]);

      saveDatabase();
      res.status(201).json({
        success: true,
        data: { id: newId, request_code: requestCode, total_amount: computedTotal, stock_warnings: stockWarnings },
      });
    } catch (dbError) {
      console.error('【DEBUG】数据库INSERT失败:', dbError);
      res.status(500).json({ success: false, error: '创建物料申请失败: ' + (dbError instanceof Error ? dbError.message : String(dbError)) });
    }
  } catch (error) {
    console.error('【DEBUG】创建物料申请失败:', error);
    res.status(500).json({ success: false, error: '创建物料申请失败' });
  }
});

/**
 * 撤回审批 — POST /api/material-requests/:id/withdraw
 * 2026-09-26 改进批次二：pending 申请单可撤回（审批单改 cancelled + 申请单回 draft/pending）
 */
router.post('/:id/withdraw', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    // 查该申请单的待审批审批单（business_link JSON 内嵌 requestId，两种键名兼容）
    const rows = db.exec(
      `SELECT id FROM approvals WHERE status = 'pending' AND (business_link LIKE ? OR business_link LIKE ?) ORDER BY created_at DESC LIMIT 1`,
      [`%"requestId":"${id}"%`, `%"request_id":"${id}"%`]
    );
    if (rows.length === 0 || rows[0].values.length === 0) {
      return res.status(400).json({ success: false, error: '未找到待审批的审批单，无法撤回' });
    }
    const approvalId = String(rows[0].values[0][0]);
    const d = new Date();
    const padN = (n: number) => String(n).padStart(2, '0');
    const now = `${d.getFullYear()}-${padN(d.getMonth() + 1)}-${padN(d.getDate())} ${padN(d.getHours())}:${padN(d.getMinutes())}:${padN(d.getSeconds())}`;

    db.run("UPDATE approvals SET status = 'cancelled', updated_at = ? WHERE id = ?", [now, approvalId]);
    db.run("UPDATE material_requests SET status = 'draft', approval_status = 'pending', update_time = ? WHERE id = ?", [now, id]);
    saveDatabase();
    res.json({ success: true, data: { id, approvalId } });
  } catch (error) {
    console.error('撤回领料申请失败:', error);
    res.status(500).json({ success: false, error: '撤回领料申请失败' });
  }
});

/**
 * 申请单操作历史 — GET /api/material-requests/:id/logs
 * 数据源：operation_logs（审计中间件自动记录全部写操作）
 */
router.get('/:id/logs', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    // 2026-09-26：auditTrail 的 resource_id 取路径最后一段——创建类请求（POST /material-requests）
    // 无路径 id → resource_id=null；/withdraw 子路径 → resource_id='withdraw'。
    // 因此按三路匹配：resource_id / 描述中含该单号路径 / 请求体含 request_code（创建时的 new_value）
    const results = db.exec(
      `SELECT id, user_id, username, action, module, resource_type, resource_id, description, created_at
       FROM operation_logs
       WHERE resource_id = ?
          OR description LIKE ?
          OR new_value LIKE ?
       ORDER BY created_at DESC LIMIT 50`,
      [id, `%/material-requests/${id}%`, `%"request_code":"${id}"%`]
    );
    const logs: Record<string, unknown>[] = [];
    if (results.length > 0) {
      const cols = results[0].columns;
      for (const row of results[0].values) {
        const item: Record<string, unknown> = {};
        row.forEach((v: unknown, i: number) => { item[cols[i]] = v; });
        logs.push(item);
      }
    }
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('获取申请单操作历史失败:', error);
    res.status(500).json({ success: false, error: '获取申请单操作历史失败' });
  }
});

/**
 * 申请单审批进度 — GET /api/material-requests/:id/approval
 * 返回对应审批单（approvers 审批链 + records 审批记录）
 */
router.get('/:id/approval', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const rows = db.exec(
      `SELECT id, status, approvers, records, created_at, updated_at FROM approvals
       WHERE business_link LIKE ? OR business_link LIKE ? ORDER BY created_at DESC LIMIT 1`,
      [`%"requestId":"${id}"%`, `%"request_id":"${id}"%`]
    );
    if (rows.length === 0 || rows[0].values.length === 0) {
      return res.json({ success: true, data: null });
    }
    const cols = rows[0].columns;
    const raw: Record<string, unknown> = {};
    rows[0].values[0].forEach((v: unknown, i: number) => { raw[cols[i]] = v; });
    const parseJson = (v: unknown): unknown => {
      if (Array.isArray(v)) return v;
      if (typeof v !== 'string' || !v) return [];
      let parsed: unknown = v;
      for (let i = 0; i < 3; i++) {
        if (typeof parsed !== 'string') break;
        try { parsed = JSON.parse(parsed); } catch { return []; }
      }
      return parsed;
    };
    raw.approvers = parseJson(raw.approvers);
    raw.records = parseJson(raw.records);
    res.json({ success: true, data: raw });
  } catch (error) {
    console.error('获取申请单审批进度失败:', error);
    res.status(500).json({ success: false, error: '获取申请单审批进度失败' });
  }
});

/**
 * 更新物料申请
 * PUT /api/material-requests/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // 2026-09-26 P0 修复：业务时间用本地时区（禁止 toISOString UTC）
    const d = new Date();
    const padN = (n: number) => String(n).padStart(2, '0');
    const now = `${d.getFullYear()}-${padN(d.getMonth() + 1)}-${padN(d.getDate())} ${padN(d.getHours())}:${padN(d.getMinutes())}:${padN(d.getSeconds())}`;
    const db = getDatabase();

    // 检查物料申请是否存在
    const stmt = db.prepare('SELECT status, approval_status FROM material_requests WHERE id = ?');
    stmt.bind([id]);
    let request: Record<string, unknown> | null = null;
    if (stmt.step()) {
      request = stmt.getAsObject();
    }
    stmt.free();

    if (!request) {
      return res.status(404).json({ success: false, error: '物料申请不存在' });
    }

    // 不允许更新已审批通过的申请
    if (request.status === 'approved' || request.approval_status === 'approved') {
      return res.status(400).json({ success: false, error: '已审批通过的物料申请不允许修改' });
    }

    // 2026-09-26 P0 修复（SQL 注入）：列名白名单校验。
    // 此前 Object.keys(updates) 直接拼进 UPDATE SET 子句，仅排除 id/request_code/create_time，
    // 任意列名（甚至 "status=1, remarks" 之类结构破坏 payload）都能改写 SQL。白名单 = 建表全部可写列。
    // 2026-09-26 回归修复：前端 store 无条件发送 update_time，此前白名单未含该列导致
    //   所有前端编辑/作废全部 400「包含非法更新字段: update_time」——update_time 允许传入但
    //   由本路由统一覆盖（本地时区 now），不参与动态 SET
    const ALLOWED_UPDATE_COLUMNS = new Set([
      'request_title', 'request_type', 'department_id', 'department_name',
      'applicant_id', 'applicant_name', 'apply_date', 'expected_date',
      'warehouse_id', 'warehouse_name', 'plant_area', 'production_batch_code',
      'total_amount', 'priority', 'status', 'approval_status',
      'remarks', 'attachments', 'materials', 'reviewer', 'create_by',
      'update_time',
    ]);
    const illegalKeys = Object.keys(updates).filter(k => !ALLOWED_UPDATE_COLUMNS.has(k));
    if (illegalKeys.length > 0) {
      return res.status(400).json({ success: false, error: `包含非法更新字段: ${illegalKeys.join(', ')}` });
    }
    const updateKeys = Object.keys(updates).filter(k => ALLOWED_UPDATE_COLUMNS.has(k) && k !== 'update_time');
    if (updateKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const fields = updateKeys.map(k => `${k} = ?`).join(', ');

    const values = updateKeys
      .map(k => {
        // 处理 JSON 数组/对象字段序列化
        if (k === 'attachments' || k === 'materials' || k === 'plant_area') {
          const val = updates[k];
          if (typeof val === 'string') return val; // 已是 JSON 字符串
          return JSON.stringify(val ?? (k === 'attachments' ? [] : k === 'materials' ? [] : '[]'));
        }
        return updates[k];
      });
    values.push(now, id);

    db.run(`UPDATE material_requests SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新物料申请失败:', error);
    res.status(500).json({ success: false, error: '更新物料申请失败' });
  }
});

/**
 * 删除物料申请
 * DELETE /api/material-requests/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查物料申请是否存在
    const stmt = db.prepare('SELECT status, approval_status FROM material_requests WHERE id = ?');
    stmt.bind([id]);
    let request: Record<string, unknown> | null = null;
    if (stmt.step()) {
      request = stmt.getAsObject();
    }
    stmt.free();

    if (!request) {
      return res.status(404).json({ success: false, error: '物料申请不存在' });
    }

    // 2026-09-26 用户要求：已审批的申请单不允许删除；已有出库记录的也不允许删除
    // （此前无任何限制，已出库申请单删除后 material_executes 的文本引用成孤儿）
    if (request.status === 'approved' || request.approval_status === 'approved') {
      return res.status(400).json({ success: false, error: '已审批通过的物料申请不允许删除' });
    }
    const dispatchCheck = db.exec('SELECT dispatch_status FROM material_requests WHERE id = ?', [id]);
    const dispatchStatus = dispatchCheck.length > 0 && dispatchCheck[0].values.length > 0 ? dispatchCheck[0].values[0][0] : null;
    if (dispatchStatus === 'complete' || dispatchStatus === 'partial') {
      return res.status(400).json({ success: false, error: '该申请单已有出库记录，不允许删除' });
    }

    db.run('DELETE FROM material_requests WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除物料申请失败:', error);
    res.status(500).json({ success: false, error: '删除物料申请失败' });
  }
});

export default router;
