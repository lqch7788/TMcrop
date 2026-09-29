/**
 * 供应商 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { formatLocalDateISO } from '../utils/dateUtil';

const router = Router();

// ========== 格式验证函数（对标 iAGS purchaserManagement 第613-670行）==========
const VALIDATION = {
  mobilePhone: (v: string) => !v || /^1[3|4|5|7|8][0-9]{9}$/.test(v),
  workPhone: (v: string) => !v || /^(\d{3,4}-)\d{7,8}$/.test(v) || /^\(\d{3,4}\)\d{7,8}$/.test(v),
  fax: (v: string) => !v || /^(\d{3,4}-)\d{7,8}$/.test(v) || /^\(\d{3,4}\)\d{7,8}$/.test(v) || /^1[3|4|5|7|8][0-9]{9}$/.test(v),
  bankCard: (v: string) => !v || /^([1-9])(\d{14}|\d{17,18})$/.test(v),
};

/**
 * 可写列白名单（2026-09-28 审计修复）
 *
 * 背景：原 PUT 实现把 `req.body` 的**键名**直接拼进 SET 子句
 * （`Object.keys(updates).map(k => \`${k} = ?\`)`），值虽参数化、键名不参数化 →
 * 实测可用构造键名写入任意 SQL 表达式（例如把别的行数据写进本行），
 * 亦可 `--` 注释掉后半段实现整表改写。与项目内其它 16 个路由同口径：显式白名单。
 */
const SUPPLIER_WRITABLE_COLUMNS = new Set([
  'supplier_code', 'supplier_name', 'contact_person', 'contact_phone',
  'mobile_phone', 'work_phone', 'fax', 'address', 'supplier_type',
  'supplier_attribute', 'status', 'country', 'province', 'city',
  'bank_name', 'bank_card_number', 'organization', 'create_date', 'remarks',
  // 2026-09-28 批次B 合规风控：三类强制资质证照（证号 + 有效期至）
  'pesticide_license_no', 'pesticide_license_expiry',
  'seed_filing_no', 'seed_filing_expiry',
  'fertilizer_reg_no', 'fertilizer_reg_expiry',
  // 2026-09-28 批次C 经营决策
  'is_internal', 'settlement_type', 'credit_days', 'rating',
]);

/** 从请求体挑出白名单列（trim 字符串、丢弃未知键） */
function pickWritableColumns(body: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (!SUPPLIER_WRITABLE_COLUMNS.has(k)) continue;
    picked[k] = typeof v === 'string' ? v.trim() : v;
  }
  return picked;
}

/**
 * 供应商被引用统计（2026-09-28 建，2026-09-29 审计补全引用面）
 *
 * 引用方式两类：① `supplier_id` 结构化外键 ② 供应商名称文本快照
 * 此前 id 名单只有 5 张表、名称名单只有 2 张，漏掉的表删除后引用会静默悬空。
 * 本次按 DB 实测列补全（括号内为生产库非空行数，2026-09-29）：
 *   - harvest_records.supplier_id(14)        采收记录的供货商
 *   - seed_sources.original_supplier_id(6)   种源"原供应商"（换供应商场景）
 *   - energy_costs.supplier_name(38)         能源成本**只有名称、无 id**，必须按名称匹配
 *   - crop_orders.supplier_name / production_plans.supplier_name（当前 0 行，补齐防未来悬空）
 * 同一张表若已按 id 命中则不再重复按名称计数（id 为准，避免同表报两条）。
 */
function countSupplierReferences(db: any, id: string, name: string): Array<{ table: string; label: string; count: number }> {
  const idRefs: Array<{ table: string; column: string; label: string }> = [
    { table: 'seed_sources', column: 'supplier_id', label: '种源记录' },
    { table: 'inventory_stock', column: 'supplier_id', label: '作物库存' },
    { table: 'inventory_inbound_records', column: 'supplier_id', label: '库存入库单' },
    { table: 'purchase_plans', column: 'supplier_id', label: '采购计划' },
    { table: 'material_costs', column: 'supplier_id', label: '物料成本' },
    { table: 'harvest_records', column: 'supplier_id', label: '采收记录' },
    { table: 'seed_sources', column: 'original_supplier_id', label: '种源原供应商' },
  ];
  const nameRefs: Array<{ table: string; column: string; label: string }> = [
    { table: 'materials', column: 'supplier', label: '物料主数据' },
    { table: 'inbound_records', column: 'supplier', label: '物料入库单' },
    { table: 'energy_costs', column: 'supplier_name', label: '能源成本' },
    { table: 'harvest_records', column: 'supplier_name', label: '采收记录' },
    { table: 'crop_orders', column: 'supplier_name', label: '作物订单' },
    { table: 'production_plans', column: 'supplier_name', label: '生产计划' },
    { table: 'seed_sources', column: 'original_supplier_name', label: '种源原供应商' },
  ];

  const out: Array<{ table: string; label: string; count: number }> = [];
  const countBy = (table: string, column: string, value: string): number => {
    try {
      const r = db.exec(`SELECT COUNT(*) FROM ${table} WHERE ${column} = ?`, [value]);
      return r.length > 0 && r[0].values.length > 0 ? Number(r[0].values[0][0]) || 0 : 0;
    } catch { return 0; } // 表/列缺失（历史环境）视为无引用
  };

  for (const t of idRefs) {
    const n = countBy(t.table, t.column, id);
    if (n > 0) out.push({ table: t.table, label: t.label, count: n });
  }
  if (name) {
    for (const t of nameRefs) {
      // 同表已按 id 命中 → 跳过，避免同一批数据重复计数
      if (out.some(o => o.table === t.table)) continue;
      const n = countBy(t.table, t.column, name);
      if (n > 0) out.push({ table: t.table, label: t.label, count: n });
    }
  }
  return out;
}

/** 按 id 取整条记录（SQL 只写一次） */
function selectSupplierById(db: any, id: string): Record<string, unknown> | null {
  const stmt = db.prepare('SELECT * FROM suppliers WHERE id = ?');
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row && Object.keys(row).length > 0 ? (row as Record<string, unknown>) : null;
}

router.get('/', (req: Request, res: Response) => {
  try {
    const { supplier_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM suppliers WHERE 1=1';
    const params: any[] = [];

    if (supplier_name) {
      sql += ' AND supplier_name LIKE ?';
      params.push(`%${supplier_name}%`);
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
    res.status(500).json({ success: false, error: '获取供应商失败' });
  }
});

/**
 * 生成供应商编码 — GET /api/suppliers/generate-code?big=SP&mid=01
 *
 * 2026-09-28 审计修复：编码生成从前端搬回服务端。
 * 前端原实现用 `Math.floor(Math.random() * 99) + 1` 出 3 位流水（违反项目《业务编码生成契约规则》：
 * 禁 Math.random、须按前缀自增、跨端一致），序列空间仅 001-099 且从不查重
 * （`supplier_code` 无唯一约束）→ 撞码后 `id = code` 的设计还会主键冲突 → 500 被提示成"网络故障"。
 * 这里按 `SU_{大类}{中类}{3位流水}` 取同前缀最大值 +1，并校验生成结果未被占用。
 *
 * ⚠️ 必须声明在 `/:id` 之前，否则会被当作 id 匹配。
 */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const big = String(req.query.big || '').trim().toUpperCase();
    const mid = String(req.query.mid || '').trim();
    if (!/^[A-Z]{2}$/.test(big) || !/^\d{2}$/.test(mid)) {
      return res.status(400).json({ success: false, error: '请提供合法的 big（2 位大写字母）与 mid（2 位数字）' });
    }
    const prefix = `SU_${big}${mid}`;
    const db = getDatabase();
    const rows = db.exec('SELECT supplier_code FROM suppliers WHERE supplier_code LIKE ?', [`${prefix}%`]);
    let maxSeq = 0;
    if (rows.length > 0) {
      for (const v of rows[0].values) {
        const code = String(v[0] || '');
        const seq = parseInt(code.slice(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq && seq < 1000) maxSeq = seq;
      }
    }
    const nextSeq = maxSeq + 1;
    if (nextSeq > 999) {
      return res.status(409).json({ success: false, error: `${prefix} 段位流水已达上限 999，请先在编码规则页扩展该分类` });
    }
    const code = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    // 兜底查重（历史脏数据可能产生非连续流水）
    const dup = db.exec('SELECT 1 FROM suppliers WHERE supplier_code = ? LIMIT 1', [code]);
    if (dup.length > 0 && dup[0].values.length > 0) {
      return res.status(409).json({ success: false, error: `生成的编码 ${code} 已存在，请重试或人工指定` });
    }
    res.json({ success: true, data: { code } });
  } catch (error) {
    console.error('生成供应商编码失败:', error);
    res.status(500).json({ success: false, error: '生成供应商编码失败' });
  }
});

/**
 * 供应商经营统计数据源（2026-09-28 批次C）
 *
 * 全部按 `supplier_id` 外键聚合（批次A-2 起各业务表落库主数据 id）。
 * ⚠️ 批次A-2 之前的历史行只存供应商名称文本、supplier_id 为空，不在此统计内——
 * 界面需注明口径，避免用户以为"数据丢了"。
 */
const STATS_SOURCES: Array<{ key: string; label: string; table: string; amountCol: string; dateCol: string }> = [
  { key: 'purchasePlan', label: '采购计划', table: 'purchase_plans', amountCol: 'total_amount', dateCol: 'create_time' },
  { key: 'materialCost', label: '物料成本', table: 'material_costs', amountCol: 'total_amount', dateCol: 'cost_date' },
  { key: 'inventoryInbound', label: '库存入库单', table: 'inventory_inbound_records', amountCol: 'total_amount', dateCol: 'record_date' },
  { key: 'seedSource', label: '种源采购', table: 'seed_sources', amountCol: 'total_amount', dateCol: 'purchase_date' },
];

/**
 * 供应商经营统计 — GET /api/suppliers/:id/stats
 *
 * 2026-09-28 批次C：按供应商维度汇总各业务表的单据数与金额，供详情弹窗展示。
 * 表缺失（历史环境）时该项记 0，不整体失败（Fail Loud 体现在返回体里每项都显式给出）。
 */
router.get('/:id/stats', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const existing = selectSupplierById(db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: '供应商不存在' });
    }

    const result: Record<string, { label: string; count: number; amount: number; lastDate: string }> = {};
    let totalAmount = 0;
    let lastTransactionDate = '';

    for (const src of STATS_SOURCES) {
      let entry = { label: src.label, count: 0, amount: 0, lastDate: '' };
      try {
        const rows = queryToObjects(
          db,
          `SELECT COUNT(*) AS cnt, COALESCE(SUM(${src.amountCol}), 0) AS amt, MAX(${src.dateCol}) AS last_date
           FROM ${src.table} WHERE supplier_id = ?`,
          [id]
        );
        const r = (rows[0] || {}) as Record<string, unknown>;
        entry = {
          label: src.label,
          count: Number(r.cnt ?? 0) || 0,
          amount: Number(r.amt ?? 0) || 0,
          lastDate: String(r.lastDate ?? '').slice(0, 10),
        };
      } catch { /* 表不存在：保留 0 值 */ }
      result[src.key] = entry;
      totalAmount += entry.amount;
      if (entry.lastDate > lastTransactionDate) lastTransactionDate = entry.lastDate;
    }

    // 物料入库单（inbound_records 无金额列，只统计单数；该表用 camelCase 的 supplierId）
    let materialInboundCount = 0;
    try {
      const rows = queryToObjects(db, 'SELECT COUNT(*) AS cnt FROM inbound_records WHERE supplierId = ?', [id]);
      materialInboundCount = Number((rows[0] as Record<string, unknown>)?.cnt ?? 0) || 0;
    } catch { /* 表不存在 */ }

    res.json({
      success: true,
      data: {
        ...result,
        materialInbound: { label: '物料入库单', count: materialInboundCount, amount: 0, lastDate: '' },
        totalAmount,
        lastTransactionDate,
      },
    });
  } catch (error) {
    console.error('获取供应商统计失败:', error);
    res.status(500).json({ success: false, error: '获取供应商统计失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM suppliers WHERE id = ?');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '供应商不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取供应商详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const db = getDatabase();

    // 2026-09-28 审计修复：必填校验（此前空编码/空名称可直接落库——NOT NULL 只拦 NULL 不拦空串）
    const fields = pickWritableColumns(body);
    const code = String(fields.supplier_code || '').trim();
    const name = String(fields.supplier_name || '').trim();
    if (!code) return res.status(400).json({ success: false, error: '供应商编码不能为空' });
    if (!name) return res.status(400).json({ success: false, error: '供应商名称不能为空' });

    // 2026-09-28：建档日期未提供时取服务端当天。前端表单已不再让用户填该字段
    // （提交时自动带当天），这里是数据完整性兜底——避免建档日期为 NULL 的供应商。
    if (fields.create_date === undefined) {
      fields.create_date = formatLocalDateISO();
    }

    // 2026-09-28 审计修复：唯一性校验（此前无唯一索引也无应用层查重 → 可产生重码/重名）
    const dupCode = db.exec('SELECT id FROM suppliers WHERE supplier_code = ? LIMIT 1', [code]);
    if (dupCode.length > 0 && dupCode[0].values.length > 0) {
      return res.status(409).json({ success: false, error: `供应商编码 ${code} 已存在，请重新生成或修改` });
    }
    const dupName = db.exec('SELECT id FROM suppliers WHERE supplier_name = ? LIMIT 1', [name]);
    if (dupName.length > 0 && dupName[0].values.length > 0) {
      return res.status(409).json({ success: false, error: `供应商名称「${name}」已存在，请勿重复建档` });
    }

    const newId = String(body.id || `SUP${Date.now()}`);
    const existsId = db.exec('SELECT 1 FROM suppliers WHERE id = ? LIMIT 1', [newId]);
    if (existsId.length > 0 && existsId[0].values.length > 0) {
      return res.status(409).json({ success: false, error: `供应商 id ${newId} 已被占用，请勿使用重复编码建档` });
    }

    const now = new Date().toISOString();
    const columns = ['id', ...Object.keys(fields), 'create_by', 'create_by_id', 'create_time', 'update_time'];
    // 2026-09-28 审计修复：审计字段取登录用户（此前只信 body，17 行 create_by 全为 NULL）
    const reqUser = (req as unknown as { user?: { name?: string; userId?: string; oid?: string } }).user;
    const values: unknown[] = [
      newId, ...Object.values(fields),
      reqUser?.name || body.create_by || null,
      reqUser?.userId || reqUser?.oid || null,
      now, now,
    ];

    try {
      db.run(
        `INSERT INTO suppliers (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        values as never[]
      );
    } catch (insertErr) {
      // 2026-09-29 审计修复：上面的查重是 check-then-insert（非原子），并发建档时
      // 唯一索引会抛错 —— 此前被外层 catch 吞成 500「创建供应商失败」，
      // 用户以为是系统故障而非"编码/名称已被占用"。现翻译为 409 + 明确原因。
      const msg = insertErr instanceof Error ? insertErr.message : String(insertErr);
      if (/UNIQUE constraint failed/i.test(msg)) {
        const which = /supplier_code/i.test(msg) ? `供应商编码 ${code}` : `供应商名称「${name}」`;
        return res.status(409).json({ success: false, error: `${which}已存在（并发建档冲突），请刷新后重试` });
      }
      throw insertErr;
    }

    saveDatabase();
    // 项目铁律：写端点必须返回完整记录（此前只返回 { id }，前端只能靠乐观拼行）
    res.status(201).json({ success: true, data: selectSupplierById(db, newId) });
  } catch (error) {
    console.error('创建供应商失败:', error);
    res.status(500).json({ success: false, error: '创建供应商失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 2026-09-28 审计修复：列白名单（此前键名直接拼 SET，实测可注入任意 SQL 表达式/整表改写）
    const fields = pickWritableColumns(req.body || {});
    const keys = Object.keys(fields);
    if (keys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const existing = selectSupplierById(db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: '供应商不存在' });
    }

    // 必填字段不允许被改成空
    if ('supplier_code' in fields && !String(fields.supplier_code || '').trim()) {
      return res.status(400).json({ success: false, error: '供应商编码不能为空' });
    }
    if ('supplier_name' in fields && !String(fields.supplier_name || '').trim()) {
      return res.status(400).json({ success: false, error: '供应商名称不能为空' });
    }
    // 2026-09-29 审计修复：阻止把「供应类型」改成空串。
    // 该字段是资质合规判定的唯一入口（REQUIRED_QUALIFICATION_BY_TYPE 按 PP/SP/FE 查表），
    // 置空后 evaluateSupplierQualification 落表为空 → 状态由「未登记/已过期」变为「不适用」，
    // 资质徽章与筛选同时失效（前端编辑弹窗的"请选择类型"空选项两次点击即可触发）。
    // 全库存量供应商均有类型（实测 0 行为空），故拒空不会误伤。
    if ('supplier_type' in fields && !String(fields.supplier_type || '').trim()) {
      return res.status(400).json({
        success: false,
        error: '供应类型不能为空（该字段决定农药/种子/肥料的资质校验，清空会使合规检查失效）',
      });
    }

    // 2026-09-28：编码/名称唯一性（排除自身）
    if (fields.supplier_code !== undefined) {
      const dup = db.exec('SELECT id FROM suppliers WHERE supplier_code = ? AND id <> ? LIMIT 1', [String(fields.supplier_code), id]);
      if (dup.length > 0 && dup[0].values.length > 0) {
        return res.status(409).json({ success: false, error: `供应商编码 ${fields.supplier_code} 已被其它供应商使用` });
      }
    }
    if (fields.supplier_name !== undefined) {
      const dup = db.exec('SELECT id FROM suppliers WHERE supplier_name = ? AND id <> ? LIMIT 1', [String(fields.supplier_name), id]);
      if (dup.length > 0 && dup[0].values.length > 0) {
        return res.status(409).json({ success: false, error: `供应商名称「${fields.supplier_name}」已被其它供应商使用` });
      }
    }

    // 2026-09-29 审计修复：供应商改名必须级联更新按名称引用的下游单据。
    // 背景：materials.supplier 与 inbound_records.supplier 是**纯名称字符串**、无 supplierId 兜底
    // （全库仅这两张表如此）。改名不级联 → 历史单据与主数据脱钩；
    // 更严重的是删除守卫 countSupplierReferences 按名称匹配，改名后立刻查不到引用 →
    // 供应商被删而历史单据永久悬空。
    const oldName = String((existing as { supplier_name?: string }).supplier_name || '');
    const newName = fields.supplier_name !== undefined ? String(fields.supplier_name || '') : oldName;
    const renamed = oldName && newName && oldName !== newName;

    const now = new Date().toISOString();
    db.run('BEGIN');
    let cascade: Record<string, number> = {};
    try {
      db.run(
        `UPDATE suppliers SET ${keys.map((k) => `${k} = ?`).join(', ')}, update_time = ? WHERE id = ?`,
        [...Object.values(fields), now, id] as never[]
      );

      // 2026-09-28：校验影响行数（sql.js 对 0 行命中不报错，此前恒返回成功 → "假成功"）
      const modified = typeof db.getRowsModified === 'function' ? db.getRowsModified() : 1;
      if (modified === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ success: false, error: '供应商不存在或未发生变更' });
      }

      if (renamed) {
        // sql.js 的 db.run 不返回影响行数，须紧邻调用 getRowsModified()（读的是最近一条语句）
        const rowsModified = (): number => (typeof db.getRowsModified === 'function' ? db.getRowsModified() : -1);
        db.run('UPDATE materials SET supplier = ?, lastUpdateTime = ? WHERE supplier = ?', [newName, now, oldName]);
        cascade.materials = rowsModified();
        db.run('UPDATE inbound_records SET supplier = ? WHERE supplier = ?', [newName, oldName]);
        cascade.inbound_records = rowsModified();
        // 有 supplier_id 关联的其它表（种源/采购/库存等）保留旧名称快照不影响关联，
        // 但数量必须报出来，不静默跳过（Fail Loud）
        const snapshotTables = ['seed_sources', 'harvest_records', 'purchase_plans', 'material_costs',
          'energy_costs', 'inventory_stock', 'inventory_inbound_records'];
        for (const t of snapshotTables) {
          try {
            const r = db.exec(`SELECT COUNT(*) FROM ${t} WHERE supplier_name = ? OR supplier = ?`, [oldName, oldName]);
            const n = r.length > 0 && r[0].values.length > 0 ? Number(r[0].values[0][0]) || 0 : 0;
            if (n > 0) cascade[t] = n;
          } catch { /* 表/列缺失则跳过（历史环境） */ }
        }
      }
      db.run('COMMIT');
    } catch (e) {
      try { db.run('ROLLBACK'); } catch { /* 回滚失败不掩盖原异常 */ }
      console.error('更新供应商失败（已回滚）:', e);
      return res.status(500).json({ success: false, error: '更新供应商失败：' + (e instanceof Error ? e.message : String(e)) });
    }

    saveDatabase();
    const staleSnapshot = renamed
      ? Object.entries(cascade).filter(([t]) => t !== 'materials' && t !== 'inbound_records' && cascade[t] > 0)
      : [];
    res.json({
      success: true,
      data: selectSupplierById(db, id),
      ...(renamed ? {
        renamed: { from: oldName, to: newName, cascade, staleSnapshot: staleSnapshot.map(([table, count]) => ({ table, count })) },
        message: staleSnapshot.length > 0
          ? `供应商已改名，物料/入库单名称已同步；另有 ${staleSnapshot.length} 张关联表仍保留旧名称快照（不影响关联，因它们按 supplier_id 关联）`
          : '供应商已改名，物料与入库单中的名称已同步',
      } : {}),
    });
  } catch (error) {
    console.error('更新供应商失败:', error);
    res.status(500).json({ success: false, error: '更新供应商失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const existing = selectSupplierById(db, id);
    if (!existing) {
      return res.status(404).json({ success: false, error: '供应商不存在' });
    }

    // 2026-09-28 审计修复：引用守卫——被业务单据引用时禁止删除（此前零校验，删完 id 型引用直接悬空）
    const refs = countSupplierReferences(db, id, String(existing.supplier_name || ''));
    if (refs.length > 0) {
      const detail = refs.map((r) => `${r.label} ${r.count} 条`).join('、');
      return res.status(409).json({
        success: false,
        error: `该供应商已被 ${detail} 引用，不能删除；如不再合作请把状态改为「暂停/终止」`,
        data: { references: refs },
      });
    }

    db.run('DELETE FROM suppliers WHERE id = ?', [id]);
    const modified = typeof db.getRowsModified === 'function' ? db.getRowsModified() : 1;
    if (modified === 0) {
      return res.status(404).json({ success: false, error: '供应商不存在' });
    }
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除供应商失败:', error);
    res.status(500).json({ success: false, error: '删除供应商失败' });
  }
});

export default router;
