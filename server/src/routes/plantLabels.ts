/**
 * 种植标签管理 API 路由
 * plant_labels — 标签 CRUD + 批量入库 + 扫码查询
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

// 2026-08-19：POST /generate-batch（补充生成）已删除 — 与标签打印 batch 模式（/batch-create）功能重复，
//   标签生成统一走标签打印 → /batch-create 入库

/** GET / — 标签列表（支持 planting_id / seedling_id 筛选 + 分页） */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { planting_id, seedling_id, seed_source_id, page = '1', limit = '100' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const conditions: string[] = [];
    const params: any[] = [];

    if (planting_id) { conditions.push('planting_id = ?'); params.push(planting_id); }
    if (seedling_id) { conditions.push('seedling_id = ?'); params.push(seedling_id); }
    if (seed_source_id) { conditions.push('seed_source_id = ?'); params.push(seed_source_id); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = db.exec(`SELECT COUNT(*) as cnt FROM plant_labels ${whereClause}`, params)[0]?.values[0]?.[0] ?? 0;
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM plant_labels ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({
      success: true,
      data: items,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(Number(total) / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /query-by-label — 按标签编号/名称/区域查询植株信息 */
router.get('/query-by-label', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { label_code, area_name, plant_name, planting_id, page = '1', limit = '100' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const conditions: string[] = [];
    const params: any[] = [];

    if (label_code) { conditions.push('label_code LIKE ?'); params.push(`%${label_code}%`); }
    if (area_name) {
      conditions.push('(move_in_area_name LIKE ? OR move_out_area_name LIKE ?)');
      params.push(`%${area_name}%`, `%${area_name}%`);
    }
    if (plant_name) { conditions.push('plant_name LIKE ?'); params.push(`%${plant_name}%`); }
    if (planting_id) { conditions.push('planting_id = ?'); params.push(planting_id); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = db.exec(`SELECT COUNT(*) as cnt FROM plant_labels ${whereClause}`, params)[0]?.values[0]?.[0] ?? 0;
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM plant_labels ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data: items,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(Number(total) / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /by-number/:labelNumber — 扫码查询（必须在 /:id 之前注册） */
router.get('/by-number/:labelNumber', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { labelNumber } = req.params;
    const label = queryToObjects(db,
      `SELECT * FROM plant_labels WHERE label_number = ?`, [labelNumber]
    );
    if (label.length === 0) {
      res.status(404).json({ success: false, error: '标签不存在' });
      return;
    }
    const resumes = queryToObjects(db,
      `SELECT * FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC LIMIT 20`,
      [label[0].id]
    );
    res.json({ success: true, data: { label: label[0], resumes } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /:id — 单条标签 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db, `SELECT * FROM plant_labels WHERE id = ?`, [req.params.id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '标签不存在' }); return; }
    res.json({ success: true, data: items[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * 2026-08-19：标签完整详情 SQL（planting → seedling → seed_source 优先级）
 * 与 GET /:id/detail 共享，避免 SQL 重复
 * 注：planting/seedling 实际列名为 planting_code/seedling_code，日期列分别是 planting_date/seedling_date，数量是 planting_quantity/seedling_quantity
 */
const LABEL_DETAIL_SQL = `
  SELECT
    pl.id              AS label_id,
    pl.label_number    AS label_number,
    pl.quantity        AS quantity,
    pl.mark_ids        AS mark_ids,
    pl.move_in_area_name AS move_in_area_name,
    pl.move_in_date    AS move_in_date,
    pl.move_out_area_name AS move_out_area_name,
    pl.move_out_date   AS move_out_date,
    pl.status          AS status,
    pl.create_time     AS create_time,
    COALESCE(planting.id, seedling.id, seed.id)            AS record_id,
    COALESCE(planting.planting_code, seedling.seedling_code, seed.source_code) AS record_code,
    COALESCE(planting.crop_name, seedling.crop_name, seed.crop_name)         AS crop_name,
    COALESCE(planting.crop_variety, seedling.crop_variety, seed.crop_variety) AS crop_variety,
    COALESCE(planting.crop_code, seedling.crop_code, seed.crop_code)         AS crop_code,
    COALESCE(planting.area_name, seedling.area_name, NULL)                  AS area_name,
    COALESCE(planting.planting_date, seedling.seedling_date, seed.purchase_date) AS planting_date,
    COALESCE(planting.planting_quantity, seedling.seedling_quantity, seed.quantity) AS planting_count,
    COALESCE(planting.supplement_count, seedling.replant_count, 0)            AS supplement_count,
    COALESCE(planting.loss_count, seedling.loss_count, 0)                    AS loss_count,
    CASE
      WHEN planting.id IS NOT NULL THEN 'planting'
      WHEN seedling.id IS NOT NULL THEN 'seedling'
      WHEN seed.id    IS NOT NULL THEN 'seed_source'
      ELSE NULL
    END AS source_module
  FROM plant_labels pl
  LEFT JOIN plantings    planting ON planting.id = pl.planting_id
  LEFT JOIN seedlings    seedling ON seedling.id = pl.seedling_id
  LEFT JOIN seed_sources seed     ON seed.id     = pl.seed_source_id
  WHERE pl.id = ?
`;

/** 标签详情 + QR URL 的后处理（共享给 /:id/detail 和 /reprint）
 *  注意：queryToObjects 自动 snake_case → camelCase，所以这里用 r.plantingCount / r.sourceModule
 */
function enrichLabelDetail(r: Record<string, any>, req: Request) {
  const plantingCount = Number(r.plantingCount) || 0;
  const supplementCount = Number(r.supplementCount) || 0;
  const lossCount = Number(r.lossCount) || 0;
  const currentSurviving = Math.max(0, plantingCount + supplementCount - lossCount);
  // QR URL 用前端 base URL：优先 env > Origin header > req.host
  const originHeader = (req.headers.origin || '').trim();
  const envBase = (process.env.FRONTEND_BASE_URL || '').trim();
  const origin = envBase || originHeader || `${req.protocol}://${req.get('host')}`;
  const moduleRoute = r.sourceModule === 'planting' ? 'planting'
                    : r.sourceModule === 'seedling' ? 'seedling'
                    : r.sourceModule === 'seed_source' ? 'seed-source'
                    : '';
  const qrUrl = `${origin}/crop/${moduleRoute}?labelNumber=${encodeURIComponent(String(r.labelNumber || ''))}`;
  return { ...r, currentSurviving, qrUrl };
}

/**
 * 2026-08-19：GET /:id/detail — 标签完整详情（含关联作物/区域/批号/数量等）
 * 用于补印预览：复刻 PrintLabelModal 的字段，渲染 QR Code + 标签详情。
 *
 * 返回字段（与 Planting/Seedling/SeedSource 主数据视图对齐）：
 *   - 标签自身：labelNumber, labelId, quantity, markIds, moveIn/Out
 *   - 关联作物（按优先级 planting → seedling → seed_source 取首个非空）
 *   - QR Code URL：扫码跳转对应主页 + 自动开标签管理弹窗
 */
router.get('/:id/detail', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const labelId = parseInt(String(req.params.id), 10);
    if (!labelId || isNaN(labelId)) {
      res.status(400).json({ success: false, error: 'id 必填且为整数' });
      return;
    }

    const items = queryToObjects(db, LABEL_DETAIL_SQL, [labelId]);
    if (items.length === 0) {
      res.status(404).json({ success: false, error: '标签不存在' });
      return;
    }
    res.json({ success: true, data: enrichLabelDetail(items[0] as Record<string, any>, req) });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /:id — 删除标签（同时删除履历） */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const exist = queryToObjects(db, `SELECT id FROM plant_labels WHERE id = ?`, [id]);
    if (exist.length === 0) { res.status(404).json({ success: false, error: '标签不存在' }); return; }
    db.run(`DELETE FROM plant_label_resume WHERE label_id = ?`, [id]);
    db.run(`DELETE FROM plant_labels WHERE id = ?`, [id]);
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /batch-create — 前端批量入库（保留前端编号规则 + quantity 字段）
 * 批量多行 VALUES 语法（5000 条 < 1s）
 */
router.post('/batch-create', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { labels } = req.body;
    if (!Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({ success: false, error: 'labels 数组为必填项' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const validItems: any[] = [];
    for (const item of labels) {
      if (!item.labelNumber) continue;
      validItems.push(item);
    }

    if (validItems.length === 0) {
      res.status(400).json({ success: false, error: '没有有效标签' });
      return;
    }

    // 2026-06-28：检测重复 — 在 INSERT 之前查 DB，找出已存在的 label_number
    // 防御层 1：DB UNIQUE 约束（fixMissingSchema 已加 idx_plant_labels_label_number_unique）
    // 防御层 2：这里预先检测，让前端拿到清晰的"哪些已存在"信息
    const labelNumbers = validItems.map((it) => it.labelNumber);
    const placeholders = labelNumbers.map(() => '?').join(',');
    const existingResult = db.exec(
      `SELECT label_number FROM plant_labels WHERE label_number IN (${placeholders})`,
      labelNumbers
    );
    const existingSet = new Set<string>();
    if (existingResult[0]?.values) {
      for (const row of existingResult[0].values) {
        existingSet.add(String(row[0]));
      }
    }

    // 过滤掉已存在的（不插入），告知前端已跳过的标签
    const toInsert = validItems.filter((it) => !existingSet.has(it.labelNumber));
    const skipped = validItems.filter((it) => existingSet.has(it.labelNumber));

    if (toInsert.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          inserted: 0,
          skipped: skipped.length,
          skippedLabelNumbers: skipped.map((s) => s.labelNumber),
          insertedIds: [],
          message: `所有 ${skipped.length} 个标签编号已存在，已跳过`,
        },
      });
      return;
    }

    const rows: string[] = [];
    const params: any[] = [];
    for (const item of toInsert) {
      // 2026-08-19：兜底 — 前端未传 moveInAreaName/moveInDate 时，从关联主表自动补
      //   （种植 → plantings.area_name/planting_date；育苗 → seedlings.area_name/seedling_date；
      //     种源 → seed_sources.supplier_name/purchase_date）
      let moveInAreaName = item.moveInAreaName || null;
      let moveInDate = item.moveInDate || null;
      if (!moveInAreaName || !moveInDate) {
        try {
          if (item.plantingId) {
            const src = db.exec('SELECT area_name, planting_date FROM plantings WHERE id = ?', [String(item.plantingId)]);
            const row = src[0]?.values?.[0];
            if (row) {
              if (!moveInAreaName) moveInAreaName = row[0] || null;
              if (!moveInDate) moveInDate = row[1] || null;
            }
          } else if (item.seedlingId) {
            const src = db.exec('SELECT area_name, seedling_date FROM seedlings WHERE id = ?', [String(item.seedlingId)]);
            const row = src[0]?.values?.[0];
            if (row) {
              if (!moveInAreaName) moveInAreaName = row[0] || null;
              if (!moveInDate) moveInDate = row[1] || null;
            }
          } else if (item.seedSourceId) {
            const src = db.exec('SELECT supplier_name, purchase_date FROM seed_sources WHERE id = ?', [String(item.seedSourceId)]);
            const row = src[0]?.values?.[0];
            if (row) {
              if (!moveInAreaName) moveInAreaName = row[0] || null;
              if (!moveInDate) moveInDate = row[1] || null;
            }
          }
        } catch {
          // 兜底查询失败不影响入库（保持原值）
        }
      }
      rows.push('(?, ?, ?, ?, ?, ?, ?, ?)');
      params.push(
        item.labelNumber,
        item.plantingId || null,
        item.seedlingId || null,
        item.seedSourceId || null,
        moveInAreaName,
        moveInDate,
        item.quantity ?? 1,
        now
      );
    }

    db.run(
      `INSERT INTO plant_labels (label_number, planting_id, seedling_id, seed_source_id, move_in_area_name, move_in_date, quantity, create_time)
       VALUES ${rows.join(', ')}`,
      params
    );

    // 多行 INSERT 后无法用 last_insert_rowid，用 MAX(id) 推算
    const maxResult = db.exec('SELECT MAX(id) as max_id FROM plant_labels');
    const maxId = Number(maxResult[0]?.values[0]?.[0]) || 0;
    const insertedIds: number[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      insertedIds.push(maxId - i);
    }

    saveDatabase();
    res.status(201).json({
      success: true,
      data: {
        inserted: rows.length,
        skipped: skipped.length,
        skippedLabelNumbers: skipped.map((s) => s.labelNumber),
        insertedIds,
      },
    });
  } catch (error) {
    console.error('[plantLabels] 批量入库失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * 2026-08-17：PATCH /:id/patch — 补录现有属性（iAGS 标记01 截图核心）
 *
 * 仿 iAGS shareSaveMoveMarkData 的「修改+条件追加」机制：
 *   - 读当前 plant_labels.mark_ids / move_in_area_name / move_out_area_name
 *   - 对比每个字段，仅当新值 ≠ 当前值时 UPDATE 标签表 + INSERT 履历行
 *   - 这样不会重复产生空履历（iAGS 截图 1 第6 步验收）
 *
 * Body: {
 *   mark_ids: ['pm-mark_growth_excellent', 'pm-mark_event_pest'],  // 主+次标记（dictionaries.id 字符串数组）
 *   to_area_name: '西区-B区',                                       // 移出位置（修改 move_out_area_name）
 *   mark_date: '2026-08-17',                                       // 标记日期（独立于 operation_date）
 *   operation_date: '2026-08-17',                                  // 履历日期（用户填的；默认今天）
 *   operator_name: '陆启闯',
 *   reason: '补录标记',
 * }
 */
router.post('/:id/patch', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const labelId = parseInt(req.params.id, 10);
    const { mark_ids, to_area_name, mark_date, operation_date, operator_name, reason, image_base64 } = req.body;

    // 2026-08-19：照片（JSON 数组，最多 5 张），单张兼容旧 base64 字符串
    const photoJson = typeof image_base64 === 'string' && image_base64 ? image_base64 : null;

    // 2026-08-19：mark_name 拼接字典 label（而非字典 id），与 /assign 行为一致
    let markNameForLog = '补录标记';
    if (Array.isArray(mark_ids) && mark_ids.length > 0) {
      try {
        const placeholders = mark_ids.map(() => '?').join(',');
        const dictRows = queryToObjects(
          db,
          `SELECT id, dict_label FROM dictionaries
           WHERE category_code = 'plant_mark_status' AND status = 'active' AND id IN (${placeholders})`,
          mark_ids
        );
        const dictMap = new Map(dictRows.map((r) => [String(r.id), String(r.dictLabel)]));
        // 保持原 mark_ids 顺序拼接，找不到的 fallback 用原 id
        markNameForLog = mark_ids.map((id: string) => dictMap.get(String(id)) || String(id)).join('、');
      } catch {
        // 字典查不动 → 用原 id（兜底）
        markNameForLog = mark_ids.join('、');
      }
    }

    if (!labelId || isNaN(labelId)) {
      res.status(400).json({ success: false, error: 'label_id 必填且为整数' });
      return;
    }

    const label = db.exec('SELECT id, label_number, mark_ids, move_out_area_name FROM plant_labels WHERE id = ?', [labelId]);
    if (label.length === 0 || label[0].values.length === 0) {
      res.status(404).json({ success: false, error: '标签不存在' });
      return;
    }
    const [, , curMarkIds, curMoveOutArea] = label[0].values[0];

    const newMarkIdsCsv = Array.isArray(mark_ids) && mark_ids.length > 0 ? mark_ids.join(',') : '';
    const newMoveOut = typeof to_area_name === 'string' ? to_area_name.trim() : '';

    const markChanged = (newMarkIdsCsv !== (curMarkIds || ''));
    const moveChanged = (newMoveOut !== (curMoveOutArea || ''));

    if (!markChanged && !moveChanged) {
      // 没有任何变化：不 UPDATE、不 INSERT 履历（iAGS 条件追加模式）
      res.json({ success: true, data: { changed: false, mark_changed: false, move_changed: false, reason: '字段无变化，未写入' } });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const opDate = operation_date || new Date().toISOString().split('T')[0];
    const resumeDate = mark_date || opDate;

    // 2026-08-19：mark + 位置合并为 1 条履历（用户期望"一次补录 = 一条记录"）
    // UPDATE 仍按字段分别执行（plant_labels 字段独立），但履历只插一行
    const changes: string[] = [];
    if (markChanged) {
      db.run('UPDATE plant_labels SET mark_ids = ? WHERE id = ?', [newMarkIdsCsv, labelId]);
      changes.push('mark');
    }
    if (moveChanged) {
      db.run('UPDATE plant_labels SET move_out_area_name = ?, move_out_date = ? WHERE id = ?', [newMoveOut, opDate, labelId]);
      changes.push('move');
    }
    // 写 1 条合并履历（mark 字段和 from/to 字段按需填 NULL）
    db.run(
      `INSERT INTO plant_label_resume (
        label_id, operation_type,
        mark_id, mark_name, mark_color,
        from_area_name, to_area_name,
        operation_date, reason, image_base64
       ) VALUES (?, 'patch', NULL, ?, NULL, ?, ?, ?, ?, ?)`,
      [
        labelId,
        markChanged ? markNameForLog : null,           // 只有 mark 变化时填 mark_name
        moveChanged ? (curMoveOutArea || null) : null, // 移出前位置（from）
        moveChanged ? newMoveOut : null,                // 移出后位置（to）
        opDate,
        reason || '属性补录',
        photoJson,
      ]
    );

    // mark_date 单独记录（与 mark 一起）
    if (markChanged && mark_date) {
      // 标记日期用 operation_date 字段记录
      // 实际 mark_date 字段已存在于 resume.operation_date（与 mark 同时变）
      // 此处预留扩展空间
    }

    saveDatabase();
    res.json({
      success: true,
      data: {
        changed: true,
        changes,
        mark_changed: markChanged,
        move_changed: moveChanged,
      },
    });
  } catch (error) {
    console.error('[plantLabels] PATCH 失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * 2026-08-19 重构：POST /reprint — 补印标签（重打 N 份相同标签号）
 * 真正的业务含义：实物标签丢失/污损/需要多份时，**重打 N 份同一标签号 A** 的副本
 * （不再是生成 A-R1/R2/R3 新标签号，那是批量生成场景，归 PrintLabelModal）
 *
 * 逻辑：
 *   - 读源标签（source_label_id）
 *   - 不创建新 plant_labels（DB 唯一记录，N 份实物副本不占 DB 行）
 *   - INSERT 1 条 print_records（related_type='plant_label'，copies=N 记录打印份数）
 *   - INSERT 1 条 plant_label_resume（operation_type='reprint'，reason 含份数）
 *   - 返回源标签完整详情（含 JOIN 关联作物 + QR URL），前端用于打印预览
 *
 * Body: {
 *   source_label_id: 4,
 *   copy_count: 3,           // 打印份数（1-50）
 *   mark_date: '2026-08-19', // 可选，默认今天
 *   operator_name: '陆启闯',
 * }
 */
router.post('/reprint', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { source_label_id, copy_count, mark_date, operator_name } = req.body;

    const sourceId = parseInt(String(source_label_id), 10);
    const copies = parseInt(String(copy_count), 10);

    if (!sourceId || isNaN(sourceId)) {
      res.status(400).json({ success: false, error: 'source_label_id 必填且为整数' });
      return;
    }
    if (!copies || copies < 1 || copies > 50) {
      res.status(400).json({ success: false, error: 'copy_count 必须在 1-50 之间' });
      return;
    }

    // 读源标签（验证存在）
    const srcStmt = db.prepare(`SELECT id, label_number FROM plant_labels WHERE id = ?`);
    srcStmt.bind([sourceId]);
    if (!srcStmt.step()) {
      srcStmt.free();
      res.status(404).json({ success: false, error: '源标签不存在' });
      return;
    }
    const srcRow = srcStmt.getAsObject() as Record<string, unknown>;
    srcStmt.free();
    const srcLabelNumber = String(srcRow.label_number || '');

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const reprintDate = mark_date || new Date().toISOString().split('T')[0];

    // 事务：写 1 条 print_records + 1 条 plant_label_resume（不创建新 plant_labels）
    db.run('BEGIN TRANSACTION');
    try {
      const printOid = `pr-${srcLabelNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.run(
        `INSERT INTO print_records (oid, print_type, related_type, related_id, copies, create_by, create_time)
         VALUES (?, ?, 'plant_label', ?, ?, ?, ?)`,
        [printOid, `reprint-${srcLabelNumber}`, sourceId, copies, operator_name || 'system', now]
      );
      db.run(
        `INSERT INTO plant_label_resume (label_id, operation_type, operation_date, operator_name, reason)
         VALUES (?, 'reprint', ?, ?, ?)`,
        [sourceId, reprintDate, operator_name || 'system', `补印 ${copies} 份`]
      );
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }

    saveDatabase();

    // 返回源标签完整详情（含关联作物 + QR URL），前端打印预览直接渲染
    const srcDetailRows = queryToObjects(db, LABEL_DETAIL_SQL, [sourceId]);
    const sourceLabelDetail = srcDetailRows.length > 0
      ? enrichLabelDetail(srcDetailRows[0] as Record<string, any>, req)
      : null;

    res.status(201).json({
      success: true,
      data: {
        source_label_id: sourceId,
        source_label_number: srcLabelNumber,
        // 2026-08-19 重命名：copies 替代 reprinted（更清晰）
        copies,
        // 不再有 new_label_ids/new_label_numbers（DB 不创建新标签）
        source_label_detail: sourceLabelDetail,
      },
    });
  } catch (error) {
    console.error('[plantLabels] 补印失败:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
