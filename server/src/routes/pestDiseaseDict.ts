/**
 * 病虫害字典 API 路由
 * V12.0 新增
 * 2026-07-16 审核加固：错误脱敏（handleError）+ images 服务端校验
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 统一错误处理（5xx 脱敏 — 不向客户端泄露 SQLite 错误原文/表结构）
 */
function handleError(res: Response, error: unknown, logTag: string, fallback: string): void {
  console.error(`[pestDiseaseDict:${logTag}]`, error);
  res.status(500).json({ success: false, error: fallback });
}

/**
 * images 服务端校验（2026-07-16 审核修复：零校验可存外链 URL 跟踪信标）
 * - 仅接受 data:image/(png|jpeg|jpg|webp|gif);base64,... 格式
 * - 单张 base64 最长 ~1.4MB（1MB 原图膨胀 1.37x）
 * - 最多 5 张
 */
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_B64_LEN = 1_500_000;
function sanitizeImages(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const valid = raw
    .slice(0, 5)
    .filter((s): s is string =>
      typeof s === 'string' && s.length <= MAX_IMAGE_B64_LEN && IMAGE_DATA_URL_RE.test(s)
    );
  return valid.length > 0 ? JSON.stringify(valid) : null;
}

/** GET /api/pest-disease-dict/next-code — 获取下一个可用编码 */
router.get('/next-code', (req: Request, res: Response) => {
  const { type } = req.query;
  if (!type || !['pest', 'disease'].includes(type as string)) {
    return res.status(400).json({ error: 'type must be pest or disease' });
  }

  const prefix = type === 'pest' ? 'PD-P-' : 'PD-D-';
  const db = getDatabase();

  // 2026-07-16：自动查重 — 取 MAX 后，逐个查直到找到不冲突的编码
  // 防并发 / 防手动插空缺 / 补跳号，最多重试 20 次
  const stmt = db.prepare(
    `SELECT MAX(dict_code) AS max_code FROM pest_disease_dict WHERE dict_type = ? AND dict_code LIKE ?`
  );
  // 2026-07-16 审核修复：String(type) 显式转换（ParsedQs union 类型 → bind 类型报错）
  stmt.bind([String(type), `${prefix}%`]);
  let lastCode = '';
  if (stmt.step()) {
    const row = stmt.getAsObject() as { max_code: string | null };
    lastCode = String(row.max_code || '');
  }
  stmt.free();

  let nextNum = 1;
  if (lastCode) {
    const match = lastCode.match(/PD-[PD]-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  // 自动查重：候选 nextNum 可能因手动插号/并发预留而冲突
  // 逐个查直到找到 0 冲突的最小编码
  const checkStmt = db.prepare(
    `SELECT 1 FROM pest_disease_dict WHERE dict_code = ? LIMIT 1`
  );
  let candidateNum = nextNum;
  const MAX_RETRIES = 20;
  try {
    for (let i = 0; i < MAX_RETRIES; i++) {
      const candidate = `${prefix}${candidateNum.toString().padStart(4, '0')}`;
      checkStmt.bind([candidate]);
      const exists = checkStmt.step();
      checkStmt.reset();
      if (!exists) {
        // 找到空闲编码，返回（前端 INSERT 时 dict_code 还有 UNIQUE 约束兜底）
        res.json({ nextCode: candidate });
        return;
      }
      candidateNum++;
    }
    // 重试耗尽仍冲突（极罕见）
    res.status(500).json({ error: `生成编码冲突，已重试 ${MAX_RETRIES} 次仍冲突，请联系管理员` });
  } finally {
    // 2026-07-16 审核修复：checkStmt 必须 free（原成功/失败路径都泄漏 wasm 语句对象）
    checkStmt.free();
  }
});

/** 生成字典编码 PD-P-/PD-D-+4位流水号 */
function generateDictCode(db: any, dictType: string): string {
  const prefix = dictType === 'pest' ? 'PD-P-' : 'PD-D-';
  const allCodes = queryToObjects<{ dict_code: string }>(db,
    `SELECT dict_code FROM pest_disease_dict WHERE dict_type = ?`, [dictType],
  );
  let maxSeq = 0;
  for (const row of allCodes) {
    const code = row.dict_code || '';
    if (code.startsWith(prefix)) {
      const seq = parseInt(code.split('-').pop() || '0', 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

/** GET /api/pest-disease-dict — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // 2026-08-15 审核修复：前端筛选栏传 targetCrops/status（camelCase 参数名），
    // 原后端只读 dictType/dict_name/keyword，导致「适用作物」「状态」筛选静默失效
    const { dictType, dict_name, keyword, targetCrops, status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(10000, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    if (dictType) { conditions.push('dict_type = ?'); params.push(dictType); }
    if (dict_name) { conditions.push("dict_name LIKE '%' || ? || '%'"); params.push(dict_name); }
    if (keyword) { conditions.push("(dict_name LIKE '%' || ? || '%' OR dict_code LIKE '%' || ? || '%')"); params.push(keyword, keyword); }
    if (targetCrops) { conditions.push("target_crops LIKE '%' || ? || '%'"); params.push(targetCrops); }
    if (status) { conditions.push('status = ?'); params.push(status); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM pest_disease_dict ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM pest_disease_dict ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

/** POST /api/pest-disease-dict — 新增 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body;
    if (!body.dict_name || !body.dict_type) {
      res.status(400).json({ success: false, error: '病虫害名称和类型为必填项' });
      return;
    }
    // 如果提供了 dictCode 则使用，否则自动生成
    const code = body.dict_code || generateDictCode(db, body.dict_type);
    // 2026-07-17 审核修复：本地时间戳替代 toISOString()（UTC 跨天错位 — 项目已有教训 utc-timezone-id-bug）
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const id = `pdd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // 2026-07-16：images 字段 — 走 sanitizeImages 校验（格式白名单 + 大小上限 + 最多 5 张）
    const imagesJson = sanitizeImages(body.images);

    db.run(`INSERT INTO pest_disease_dict (
      id, dict_code, dict_name, dict_type, target_crops, description, status, create_time, images
    ) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, code, body.dict_name, body.dict_type, body.target_crops || null,
       body.description || null, body.status || 'active', now, imagesJson]
    );

    const items = queryToObjects(db, `SELECT * FROM pest_disease_dict WHERE dict_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

/** GET /api/pest-disease-dict/:id — 详情 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const items = queryToObjects(db, `SELECT * FROM pest_disease_dict WHERE id = ?`, [id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }
    res.json({ success: true, data: items[0] });
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

/** PUT /api/pest-disease-dict/:id — 更新 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pest_disease_dict WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }

    // 2026-07-16：images 更新 — 数组走校验，null 清空，未传保留原值
    const newImages = Array.isArray(body.images) ? sanitizeImages(body.images) : (body.images === null ? null : undefined);

    db.run(`UPDATE pest_disease_dict SET dict_name=?, dict_type=?, target_crops=?,
      description=?, status=?, images=? WHERE id=?`,
      [body.dict_name ?? existing[0].dict_name, body.dict_type ?? existing[0].dict_type,
       body.target_crops ?? existing[0].target_crops, body.description ?? existing[0].description,
       body.status ?? existing[0].status,
       newImages === undefined ? existing[0].images : newImages,
       id]
    );
    const updated = queryToObjects(db, `SELECT * FROM pest_disease_dict WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

/** DELETE /api/pest-disease-dict/:id — 删除（需检查关联） */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 检查是否有关联药剂
    const related = db.prepare(
      'SELECT COUNT(*) as count FROM pesticide_pest_relation WHERE pest_id = ?'
    ).get([id]) as any;

    if (related.count > 0) {
      return res.status(400).json({ success: false, error: '该病虫害存在关联药剂，无法删除' });
    }

    db.run(`DELETE FROM pest_disease_dict WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

/** GET /api/pest-disease-dict/by-crop/:cropName — 根据作物获取适用病虫害 */
router.get('/by-crop/:cropName', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { cropName } = req.params;
    const items = queryToObjects(db,
      `SELECT * FROM pest_disease_dict WHERE target_crops LIKE ? ORDER BY dict_type, dict_name`,
      [`%${cropName}%`]
    );
    res.json({ success: true, data: items });
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

/** GET /api/pest-disease-dict/:id/relations — 获取病虫害关联的药剂列表 */
router.get('/:id/relations', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // 2026-07-17 审核修复：药剂库 2026-07-12 扁平化后新药剂存 pesticide_specs（ps- 前缀），
    // 老关联在 pesticide_library（pl- 前缀）— UNION 两表，否则新关联全部查不到（详情页空列表）
    const rows = queryToObjects(db, `
      SELECT pl.id, pl.pesticide_code, pl.pesticide_name, pl.pesticide_type
      FROM pesticide_library pl
      JOIN pesticide_pest_relation r ON pl.id = r.pesticide_id
      WHERE r.pest_id = ?
      UNION ALL
      SELECT ps.id, ps.pesticide_code, ps.pesticide_name, ps.pesticide_type
      FROM pesticide_specs ps
      JOIN pesticide_pest_relation r2 ON ps.id = r2.pesticide_id
      WHERE r2.pest_id = ?
    `, [id, id]);

    res.json({ success: true, data: rows });
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

/** POST /api/pest-disease-dict/:pestId/relations — 添加关联 */
router.post('/:pestId/relations', (req: Request, res: Response) => {
  try {
    const { pestId } = req.params;
    const { pesticideId } = req.body;

    if (!pesticideId) {
      return res.status(400).json({ success: false, error: 'pesticideId is required' });
    }

    const db = getDatabase();
    const id = `${pesticideId}_${pestId}`;

    try {
      db.run(`
        INSERT INTO pesticide_pest_relation (id, pesticide_id, pest_id)
        VALUES (?, ?, ?)
      `, [id, pesticideId, pestId]);
      saveDatabase();
      res.json({ success: true, id });
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ success: false, error: '该关联已存在' });
      }
      throw e;
    }
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

/** DELETE /api/pest-disease-dict/:pestId/relations/:pesticideId — 删除关联 */
router.delete('/:pestId/relations/:pesticideId', (req: Request, res: Response) => {
  try {
    const { pestId, pesticideId } = req.params;
    const db = getDatabase();

    db.prepare('DELETE FROM pesticide_pest_relation WHERE pest_id = ? AND pesticide_id = ?')
      .run([pestId, pesticideId]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    handleError(res, error, 'route', '操作失败，请稍后重试');
  }
});

export default router;
