/**
 * 供应商 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

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
 * 供应商被引用统计（2026-09-28 审计修复：删除前守卫）
 *
 * 引用方式两类：① `supplier_id`（结构化，4 张表）② 供应商名称文本（materials / inbound_records）
 * 此前 DELETE 无任何检查，删除后 id 型引用立即悬空、名称型引用与新主数据永久不一致。
 */
function countSupplierReferences(db: any, id: string, name: string): Array<{ table: string; label: string; count: number }> {
  const tables: Array<{ table: string; column: string; label: string }> = [
    { table: 'seed_sources', column: 'supplier_id', label: '种源记录' },
    { table: 'inventory_stock', column: 'supplier_id', label: '作物库存' },
    { table: 'inventory_inbound_records', column: 'supplier_id', label: '库存入库单' },
    { table: 'purchase_plans', column: 'supplier_id', label: '采购计划' },
    { table: 'material_costs', column: 'supplier_id', label: '物料成本' },
  ];
  const out: Array<{ table: string; label: string; count: number }> = [];
  for (const t of tables) {
    try {
      const r = db.exec(`SELECT COUNT(*) FROM ${t.table} WHERE ${t.column} = ?`, [id]);
      const n = r.length > 0 && r[0].values.length > 0 ? Number(r[0].values[0][0]) || 0 : 0;
      if (n > 0) out.push({ table: t.table, label: t.label, count: n });
    } catch { /* 表不存在则跳过（历史环境） */ }
  }
  if (name) {
    const byName: Array<{ table: string; label: string }> = [
      { table: 'materials', label: '物料主数据' },
      { table: 'inbound_records', label: '物料入库单' },
    ];
    for (const t of byName) {
      try {
        const r = db.exec(`SELECT COUNT(*) FROM ${t.table} WHERE supplier = ?`, [name]);
        const n = r.length > 0 && r[0].values.length > 0 ? Number(r[0].values[0][0]) || 0 : 0;
        if (n > 0) out.push({ table: t.table, label: t.label, count: n });
      } catch { /* 跳过 */ }
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

    db.run(
      `INSERT INTO suppliers (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values as never[]
    );

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

    const now = new Date().toISOString();
    db.run(
      `UPDATE suppliers SET ${keys.map((k) => `${k} = ?`).join(', ')}, update_time = ? WHERE id = ?`,
      [...Object.values(fields), now, id] as never[]
    );

    // 2026-09-28：校验影响行数（sql.js 对 0 行命中不报错，此前恒返回成功 → "假成功"）
    const modified = typeof db.getRowsModified === 'function' ? db.getRowsModified() : 1;
    if (modified === 0) {
      return res.status(404).json({ success: false, error: '供应商不存在或未发生变更' });
    }

    saveDatabase();
    res.json({ success: true, data: selectSupplierById(db, id) });
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
