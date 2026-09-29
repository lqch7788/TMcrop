/**
 * 生产退料 API 路由
 *
 * 2026-09-28 深度审核修复（P0/P1 全量）：
 *  - 库存联动 fail loud（undo 批次未命中 / 解析失败 一律抛错回滚，不再静默跳过）
 *  - 状态判断改以 statusClass 英文枚举为权威，补齐"已驳回"漏检
 *  - POST/PUT 增加退料数据闭环校验（来源单号必须存在 + 累计退料不超实发量）
 *  - POST/PUT 返回完整记录（前端 store 不再写入残缺对象）
 *  - 时区统一 nowLocalTimestamp（此前 UTC 导致 0:00-8:00 显示昨天）
 *  - DELETE 归档快照（永久可追溯）
 *  - 分页参数钳制 + LIKE 通配符转义 + limit 上限
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { nowLocalTimestamp } from '../lib/timeUtils';
import { writeStockTransaction, parseBatchAllocations } from './materialExecute';
import { archiveDeletedDocument } from '../db/deletedDocumentsArchive';

const router = Router();

// ==================== 状态字典 ====================

/** statusClass（英文枚举）→ 中文 status 展示文案 */
const STATUS_CLASS_TO_TEXT: Record<string, string> = {
  draft: '草稿',       // 2026-09-28 撤回态
  pending: '待审批',
  approved: '已审批',
  rejected: '已驳回',
  completed: '已完成',
  voided: '已作废',
};

/** 中文 status → statusClass（含审批联动写入的历史别名） */
const STATUS_TEXT_TO_CLASS: Record<string, string> = {
  '草稿': 'draft',     // 2026-09-28 撤回态
  '待审批': 'pending',
  '已审批': 'approved',
  '已批准': 'approved',
  '已驳回': 'rejected',
  '已拒绝': 'rejected',
  '已完成': 'completed',
  '已作废': 'voided',
  '已取消': 'cancelled',
};

/**
 * 有效态 statusClass 白名单：这些状态代表退料已实际入库、占用库存额度。
 * 2026-09-28 审批流接入：**审批通过后才恢复库存**（此前含 'pending'，
 * 导致"待审批"的退料单就已把库存加回仓库，驳回时还要回滚）。
 * 现语义：pending = 未入库（不占库存）→ approved/completed = 已入库（占库存）。
 */
const ACTIVE_STATUS_CLASSES = new Set(['approved', 'completed']);

/**
 * 有效态中文 status 白名单（历史数据 statusClass 缺失时的兜底判断，2026-09-29 由黑名单改为白名单）
 * 只认明确表示"退料已入库、库存已恢复"的文案，认不出的一律按未恢复处理（fail-closed）。
 */
const ACTIVE_STATUS_TEXTS = new Set(['已审批', '已批准', '已完成']);

/**
 * 状态规范化：保证 status（中文）与 statusClass（英文）语义一致。
 * statusClass 为权威字段，已知时反推中文；否则从中文字段反推。
 * 2026-09-28 修复：此前两字段可各自独立更新，允许出现
 * status='已批准' + statusClass='rejected' 的矛盾组合。
 */
function normalizeStatusPair(status: unknown, statusClass: unknown): { status: string; statusClass: string } {
  const s = String(status || '').trim();
  const c = String(statusClass || '').trim().toLowerCase();
  if (c && STATUS_CLASS_TO_TEXT[c]) return { status: STATUS_CLASS_TO_TEXT[c], statusClass: c };
  if (s && STATUS_TEXT_TO_CLASS[s]) return { status: s, statusClass: STATUS_TEXT_TO_CLASS[s] };
  return { status: s || '待审批', statusClass: c || 'pending' };
}

/**
 * PUT 场景的状态规范化：**只依据用户本次提交的字段**推导，未提交的一侧才回落到旧值。
 * 2026-09-28 修复：此前把 oldStatusClass 当作权威参与推导，导致只改 status='已审批' 时
 * 被旧的 statusClass='pending' 反推覆盖回「待审批」，状态变更静默失效。
 */
function normalizeStatusUpdate(
  incoming: { status?: unknown; statusClass?: unknown },
  old: { status: string; statusClass: string }
): { status: string; statusClass: string } {
  const hasStatus = incoming.status !== undefined;
  const hasClass = incoming.statusClass !== undefined;
  if (hasStatus && !hasClass) {
    const s = String(incoming.status || '').trim();
    // 中文状态 → 反推英文枚举；未收录的未知值保留旧 statusClass（不臆测）
    return STATUS_TEXT_TO_CLASS[s]
      ? { status: s, statusClass: STATUS_TEXT_TO_CLASS[s] }
      : { status: s, statusClass: old.statusClass };
  }
  if (!hasStatus && hasClass) {
    const c = String(incoming.statusClass || '').trim().toLowerCase();
    return STATUS_CLASS_TO_TEXT[c]
      ? { status: STATUS_CLASS_TO_TEXT[c], statusClass: c }
      : { status: old.status, statusClass: c };
  }
  // 两者都显式提供：以 statusClass 为准，消除矛盾组合
  return normalizeStatusPair(incoming.status, incoming.statusClass);
}

/**
 * 退料单是否处于"库存已恢复"的有效态。
 * 2026-09-28 修复：此前只比对中文黑名单且漏掉 '已驳回'，导致被驳回的退料单
 * 仍被判定为有效态并错误恢复库存（账实不符）。
 * 2026-09-29 修复（fail-open → fail-closed）：statusClass 缺失时的兜底原为
 * `!INACTIVE_STATUS_TEXTS.has(s)`（黑名单），而黑名单不含 '待审批' → 待审批的历史行
 * 会被判为"库存已恢复"→ `applyReturnStockOnApproval` 走幂等跳过分支，
 * 出现"审批通过但库存从未恢复"的账实不符。现改为**中文白名单**，认不出即视为非有效态。
 */
function isReturnStockActive(statusClass: unknown, status: unknown): boolean {
  const cls = String(statusClass || '').trim().toLowerCase();
  if (ACTIVE_STATUS_CLASSES.has(cls)) return true;
  if (cls) return false; // 已知但不在白名单（rejected/cancelled/voided 等）→ 非有效态
  // statusClass 缺失（历史数据）→ 只认明确表示"已恢复库存"的中文文案
  const s = String(status || '').trim();
  return ACTIVE_STATUS_TEXTS.has(s);
}

/** 安全解析 materials JSON（损坏数据不炸整个接口） */
function parseMaterialsJson(raw: unknown): any[] {
  try {
    const parsed = JSON.parse(String(raw || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 取当前登录用户名（操作人/删除人） */
function currentUserName(req: Request): string {
  const u = (req as unknown as { user?: { name?: string; username?: string } }).user || {};
  return String(u.name || u.username || '').trim();
}

/** 落盘并显式报告失败（sql.js 显式落盘是唯一持久化路径，失败必须让用户知道） */
function persistOrThrow(): void {
  try {
    saveDatabase();
  } catch (e) {
    console.error('[生产退料] 数据库落盘失败:', e);
    throw new Error('数据已保存到内存但落盘失败，请重试或联系管理员（数据可能在重启后丢失）');
  }
}

// ==================== 数据闭环校验 ====================

/**
 * 退料数据闭环校验（铁律：只能基于已出库单据退料，且累计退料量不超实发量）
 *  ① 退料量必须 > 0、物料编码必填
 *  ② 来源领料单号必填且存在于 material_executes
 *  ③ 物料必须在该出库单明细内，且 (来源单号, 物料编码) 累计退料量 ≤ 实发量
 * @param excludeReturnId 编辑场景排除自身，避免把自己的旧数量重复计入
 */
function validateReturnClosedLoop(db: any, materials: any[], excludeReturnId?: string): void {
  if (!Array.isArray(materials) || materials.length === 0) {
    throw new Error('退料单至少需要一条物料明细');
  }

  // ① 明细基础校验
  for (const m of materials) {
    const code = String(m.materialCode || m.code || '').trim();
    const qty = Number(m.returnQuantity ?? m.quantity ?? 0) || 0;
    if (!code) throw new Error('退料明细缺少物料编码');
    if (qty <= 0) throw new Error(`物料 ${code} 的退料数量必须大于 0（当前 ${qty}）`);
  }

  // ② 来源领料单存在性 + 已出库状态 + 明细缓存
  const executeCache = new Map<string, any[]>();
  for (const m of materials) {
    const srcCode = String(m.sourceApplicationCode || '').trim();
    if (!srcCode) {
      throw new Error(`物料 ${m.materialCode || ''} 缺少来源领料单号（退料必须基于已出库单据）`);
    }
    if (executeCache.has(srcCode)) continue;
    const rows = queryToObjects(
      db,
      'SELECT code, materials, execute_status, execute_status_class FROM material_executes WHERE code = ?',
      [srcCode]
    ) as any[];
    if (rows.length === 0) throw new Error(`来源领料单 ${srcCode} 不存在，无法退料`);
    // 只有实际出库过的单据才能退料（草稿/待出库/已取消无出库事实）
    // 2026-09-29 修复（fail-open → fail-closed）：原判据 `if (execClass && ...)` 在
    // execute_status_class 为空时**整体跳过校验** —— 已取消/待出库的脏数据单据也能被退料。
    // 现改为：statusClass 为空时从中文 execute_status 兜底推导；仍推导不出则一律拒绝。
    const rawClass = String(rows[0].executeStatusClass || '').trim().toLowerCase();
    const rawStatusText = String(rows[0].executeStatus || '').trim();
    const execClass = rawClass || (
      rawStatusText === '已出库' ? 'completed'
        : rawStatusText === '部分出库' ? 'partial'
          : rawStatusText === '待出库' ? 'pending_out'
            : rawStatusText === '已取消' ? 'cancelled'
              : ''
    );
    if (execClass !== 'completed' && execClass !== 'partial') {
      throw new Error(
        `来源领料单 ${srcCode} 当前状态为「${rawStatusText || rawClass || '未知'}」，没有实际出库记录，无法退料`
      );
    }
    executeCache.set(srcCode, parseMaterialsJson(rows[0].materials));
  }

  // ③ 累计退料量（统计所有"有效态"退料单，排除自身）
  let sql = 'SELECT id, status, statusClass, materials FROM material_returns';
  const params: any[] = [];
  if (excludeReturnId) { sql += ' WHERE id != ?'; params.push(excludeReturnId); }
  const accumulated = new Map<string, number>();
  for (const row of queryToObjects(db, sql, params) as any[]) {
    if (!isReturnStockActive(row.statusClass, row.status)) continue;
    for (const m of parseMaterialsJson(row.materials)) {
      const key = `${String(m.sourceApplicationCode || '').trim()}||${String(m.materialCode || '').trim()}`;
      accumulated.set(key, (accumulated.get(key) || 0) + (Number(m.returnQuantity ?? m.quantity ?? 0) || 0));
    }
  }

  for (const m of materials) {
    const srcCode = String(m.sourceApplicationCode || '').trim();
    const code = String(m.materialCode || m.code || '').trim();
    const qty = Number(m.returnQuantity ?? m.quantity ?? 0) || 0;
    const execMats = executeCache.get(srcCode) || [];
    const line = execMats.find((em: any) => String(em.materialCode || em.code || '').trim() === code);
    if (!line) throw new Error(`物料 ${code} 不在来源领料单 ${srcCode} 的明细中，无法退料`);
    const allowed = Number(line.actualQuantity ?? line.quantity ?? 0) || 0;
    const used = accumulated.get(`${srcCode}||${code}`) || 0;
    if (used + qty > allowed) {
      throw new Error(
        `物料 ${code} 累计退料量 ${used + qty} 超过来源领料单 ${srcCode} 的实发量 ${allowed}（已退 ${used}，本次 ${qty}）`
      );
    }
  }
}

// ==================== 库存联动 ====================

/**
 * 退料库存联动（事务内调用）：direction='in' 退料入库 / 'undo' 撤销退料回收库存
 * 2026-09-27 审计修复：此前退料路由完全不碰库存与流水（只写单据），退料后物料缺还原。
 * 2026-09-28 修复：所有静默跳过路径改为显式抛错（fail loud）——主表与批次账必须同步，
 * 任一批次无法命中即整体回滚，杜绝"主表减了批次账没减"的永久性漂移。
 * 2026-09-28 审批流接入：export 供 approvalLinkage 在"审批通过"时触发入库。
 */
export function applyReturnStock(
  db: any,
  materials: any[],
  returnId: string | number,
  returnCode: string,
  operatorInfo: { operator?: string },
  direction: 'in' | 'undo'
): void {
  const now = nowLocalTimestamp();
  const operatorName = String(operatorInfo?.operator || '').trim() || '仓库';
  let seq = 0;
  for (const m of materials) {
    const code = String(m.materialCode || m.code || '');
    // 退料量字段：表单存 returnQuantity（历史数据兜底 quantity）
    const qty = Number(m.returnQuantity ?? m.quantity ?? 0) || 0;
    if (!code || qty <= 0) continue;

    // 主表按 code 定位库存行（2026-09-28 修复：多行同 code 时显式报错，
    // 此前 ORDER BY id LIMIT 1 静默只更新第一行，导致同 code 其余行库存永久分裂）
    const mainRows = db.exec('SELECT id, quantity FROM materials WHERE code = ? ORDER BY id ASC', [code]);
    if (mainRows.length === 0 || mainRows[0].values.length === 0) {
      throw new Error(`物料 ${code} 不存在，无法${direction === 'in' ? '退料入库' : '撤销退料'}`);
    }
    if (mainRows[0].values.length > 1) {
      throw new Error(
        `物料 ${code} 在库存主表存在 ${mainRows[0].values.length} 条重复记录，无法确定退料目标行，请先在物料主数据中清理重复编码`
      );
    }
    const mainId = mainRows[0].values[0][0];
    const mainQty = Number(mainRows[0].values[0][1]) || 0;
    if (direction === 'undo' && mainQty < qty) {
      throw new Error(`物料 ${code} 当前库存 ${mainQty} 不足以回收退料量 ${qty}（库存已被后续使用），无法撤销`);
    }

    // 主表：退料 +qty / 撤销 -qty（按主键更新）
    db.run(
      'UPDATE materials SET quantity = quantity + ?, lastUpdateTime = ? WHERE id = ?',
      [direction === 'in' ? qty : -qty, now, mainId]
    );

    // 批次账：退料行 batchNo 可能是出库时 FEFO 写回的显示串
    // （如 "B20260415(5袋),EQ20260125(2卷)"）。按显示串解析出子批次，逐批恢复。
    const allocs = parseBatchAllocations(m);
    const batchTargets: Array<{ batchNo: string; qty: number }> = [];
    if (allocs.length > 0 && allocs[0].batchNo) {
      // 子批次恢复量按本次退料量截断（显示串合计是出库时各批扣减量，可能大于本次退料量）
      let remaining = qty;
      for (const a of allocs) {
        if (remaining <= 0) break;
        const take = Math.min(a.qty, remaining);
        batchTargets.push({ batchNo: a.batchNo, qty: take });
        remaining -= take;
      }
    }
    if (batchTargets.length === 0) {
      let rawBatchNo = String(m.batchNo || '').trim();
      // 2026-09-28 修复：显示串（含括号/逗号的多批合并串）未被标准正则解析时（如全角括号），
      // 剥离括号片段取干净批次名兜底——绝不把整串写成批次号污染 batch_inventory。
      if (/[(),，（）]/.test(rawBatchNo)) {
        const cleaned = rawBatchNo
          .replace(/[（(][^）)]*[）)]/g, '')
          .replace(/[,，]/g, '')
          .trim();
        console.warn(`[生产退料] 批次串 "${rawBatchNo}" 未按标准格式解析，降级取批次名 "${cleaned || '默认批次'}"`);
        rawBatchNo = cleaned;
      }
      batchTargets.push({ batchNo: rawBatchNo || '默认批次', qty });
    }

    for (const target of batchTargets) {
      const batchNo = target.batchNo;
      const targetQty = target.qty;
      const bRows = db.exec('SELECT remaining_quantity FROM batch_inventory WHERE material_code = ? AND batch_no = ?', [code, batchNo]);
      const hasBatch = bRows.length > 0 && bRows[0].values.length > 0;
      if (hasBatch) {
        const batchRemaining = Number(bRows[0].values[0][0]) || 0;
        if (direction === 'undo' && batchRemaining < targetQty) {
          throw new Error(`物料 ${code} 批次 ${batchNo} 余量 ${batchRemaining} 不足以回收退料量 ${targetQty}`);
        }
        db.run(
          'UPDATE batch_inventory SET remaining_quantity = remaining_quantity + ?, update_time = ? WHERE material_code = ? AND batch_no = ?',
          [direction === 'in' ? targetQty : -targetQty, now, code, batchNo]
        );
        // 2026-09-28 修复：UPDATE 影响 0 行说明 WHERE 未命中（批次号带空格等），必须 fail loud
        if (typeof db.getRowsModified === 'function' && db.getRowsModified() === 0) {
          throw new Error(`物料 ${code} 批次 ${batchNo} 更新未命中，批次账恢复失败`);
        }
      } else if (direction === 'in') {
        db.run(
          `INSERT INTO batch_inventory (id, material_code, material_name, batch_no, production_date, expiry_date, unit, total_quantity, remaining_quantity, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`bi-return-${code}-${Date.now()}-${seq}`, code, String(m.materialName || ''), batchNo, '', '', String(m.unit || ''), targetQty, targetQty, now, now]
        );
      } else {
        // 2026-09-28 修复：undo 且批次不存在 → 主表已扣减但批次账无法回补，必须整体回滚
        throw new Error(`撤销退料时批次未命中：物料 ${code} 批次 ${batchNo}（退料单 ${returnCode}），库存无法回补`);
      }
    }

    // 流水（按行总退料量记一笔，余额链以主表为准）
    writeStockTransaction(db, ++seq, direction === 'in' ? 'material_return_in' : 'material_return_undo',
      returnId, returnCode, code, qty, {
        operatorName,
        balanceBefore: mainQty,
        balanceAfter: direction === 'in' ? mainQty + qty : mainQty - qty,
        remark: direction === 'in' ? `生产退料 ${returnCode}｜退料人 ${operatorName}` : `撤销退料 ${returnCode}`,
        businessType: 'material_return',
      });
  }
}

/**
 * 审批通过时恢复退料库存（2026-09-28 审批流接入，供 approvalLinkage 调用）
 * 幂等：若该单已在有效态（approved/completed，说明此前已恢复过）则跳过，重复回调不会重复加库存。
 * 调用方需保证已开启事务（任一物料恢复失败时整体回滚）。
 */
export function applyReturnStockOnApproval(
  db: any,
  returnIdOrCode: string | number,
  actorName: string
): { changed: boolean; message?: string } {
  const rows = queryToObjects(
    db,
    'SELECT id, code, status, statusClass, materials FROM material_returns WHERE id = ? OR code = ?',
    [returnIdOrCode, returnIdOrCode]
  ) as any[];
  if (rows.length === 0) return { changed: false, message: '退料单不存在' };
  const rec = rows[0];
  // 已在有效态 → 此前已恢复库存，幂等跳过（防重复审批回调重复加库存）
  if (isReturnStockActive(rec.statusClass, rec.status)) return { changed: false };
  const materials = parseMaterialsJson(rec.materials);
  if (materials.length === 0) return { changed: false, message: '退料单无物料明细' };
  applyReturnStock(db, materials, rec.id, String(rec.code || ''), { operator: actorName }, 'in');
  return { changed: true };
}

/**
 * 审批被取消/驳回时回滚退料库存（2026-09-28 对称补充）
 * 场景：审批先通过（库存已恢复）→ 后续被取消/驳回 → 必须把库存回滚，否则账实不符。
 * 幂等：若该单当前不在有效态（库存本就未恢复）则跳过。
 */
export function revertReturnStockOnApproval(
  db: any,
  returnIdOrCode: string | number,
  actorName: string
): { changed: boolean; message?: string } {
  const rows = queryToObjects(
    db,
    'SELECT id, code, status, statusClass, materials FROM material_returns WHERE id = ? OR code = ?',
    [returnIdOrCode, returnIdOrCode]
  ) as any[];
  if (rows.length === 0) return { changed: false, message: '退料单不存在' };
  const rec = rows[0];
  // 非有效态 → 库存本就未恢复，无需回滚
  if (!isReturnStockActive(rec.statusClass, rec.status)) return { changed: false };
  const materials = parseMaterialsJson(rec.materials);
  if (materials.length === 0) return { changed: false, message: '退料单无物料明细' };
  applyReturnStock(db, materials, rec.id, String(rec.code || ''), { operator: actorName }, 'undo');
  return { changed: true };
}

// ==================== 路由 ====================

/** 转义 LIKE 通配符（用户输入 % _ \ 不再被当作匹配符） */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, '\\$&');
}

// GET /api/material-returns - 获取退料列表
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, applicant, department } = req.query;
    // 2026-09-28 修复：分页参数钳制（此前 Number('abc') → NaN 直接 bind 进 SQL，且 limit 无上限）
    const pageNum = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const db = getDatabase();
    let sql = 'SELECT * FROM material_returns WHERE 1=1';
    const params: (string | number)[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status as string); }
    // 2026-09-28 修复：通配符转义
    if (applicant) { sql += " AND applicant LIKE ? ESCAPE '\\'"; params.push(`%${escapeLike(String(applicant))}%`); }
    if (department) { sql += " AND department LIKE ? ESCAPE '\\'"; params.push(`%${escapeLike(String(department))}%`); }
    const countSql = sql;
    sql += ' ORDER BY create_time DESC';
    const total = execCount(db, countSql, params);
    const offset = (pageNum - 1) * limitNum;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    const items = queryToObjects(db, sql, params);
    // 解析 materials JSON 字段（损坏数据不炸整个列表）
    const result = items.map((item: Record<string, unknown>) => ({
      ...item,
      materials: parseMaterialsJson(item.materials),
    }));
    res.json({ success: true, data: result, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    console.error('获取退料列表失败:', error);
    res.status(500).json({ success: false, error: '获取退料列表失败' });
  }
});

// GET /api/material-returns/:id - 获取单条退料详情
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const rows = queryToObjects(db, 'SELECT * FROM material_returns WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: '退料记录不存在' });
    }
    const item: Record<string, unknown> = { ...(rows[0] as Record<string, unknown>) };
    item.materials = parseMaterialsJson(item.materials);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取退料详情失败:', error);
    res.status(500).json({ success: false, error: '获取退料详情失败' });
  }
});

/** 读取单条完整记录（含 materials 解析），供 POST/PUT 返回完整数据 */
function fetchFullRecord(db: any, id: string | number): Record<string, unknown> | null {
  const rows = queryToObjects(db, 'SELECT * FROM material_returns WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const rec: Record<string, unknown> = { ...(rows[0] as Record<string, unknown>) };
  rec.materials = parseMaterialsJson(rec.materials);
  return rec;
}

// POST /api/material-returns - 创建退料记录（事务内：校验 + 落库 + 恢复库存 + 流水）
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, code, date, type, applicant, department, warehouseLocation,
      remark, operator, reviewer, reviewDate, rejectReason, materials } = req.body;
    // 2026-09-28 修复：id 加随机后缀防同毫秒并发主键冲突
    const newId = id || `TL${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // 2026-09-28 修复：时区统一为本地时间（此前 UTC 导致 0:00-8:00 记录显示昨天）
    const now = nowLocalTimestamp();
    const db = getDatabase();
    const matList = Array.isArray(materials) ? materials : [];
    const returnCode = String(code || newId);
    // 状态规范化：status 与 statusClass 保证语义一致
    const { status, statusClass } = normalizeStatusPair(req.body.status, req.body.statusClass);
    const operatorName = currentUserName(req);

    db.run('BEGIN');
    try {
      // 退料数据闭环校验（来源单号必须存在 + 累计退料不超实发，数量必须 > 0）
      validateReturnClosedLoop(db, matList);

      db.run(`
        INSERT INTO material_returns (
          id, code, date, type, applicant, department, warehouseLocation, status, statusClass,
          remark, operator, reviewer, reviewDate, rejectReason, materials, create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId, code, date || null, type || null, applicant || null, department || null,
        warehouseLocation || null, status, statusClass,
        remark || null, operator || null, reviewer || null, reviewDate || null,
        rejectReason || null, JSON.stringify(matList), operatorName || null, now, now,
      ]);
      if (isReturnStockActive(statusClass, status)) {
        applyReturnStock(db, matList, newId, returnCode, { operator: operatorName || applicant }, 'in');
      }
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[生产退料] 创建失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '创建退料失败' });
    }
    persistOrThrow();
    // 2026-09-28 修复：返回完整记录（此前只返 {id, code}，前端 store 写入残缺对象）
    const fullRecord = fetchFullRecord(db, newId);
    res.status(201).json({ success: true, data: fullRecord || { id: newId, code } });
  } catch (error) {
    console.error('创建退料失败:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '创建退料失败' });
  }
});

// PUT /api/material-returns/:id - 更新退料记录
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = nowLocalTimestamp();
    const db = getDatabase();

    // 列名白名单（防止任意列名拼接进 SET 子句）
    const ALLOWED_COLUMNS = new Set([
      'code', 'date', 'type', 'applicant', 'department', 'warehouseLocation', 'status', 'statusClass',
      'remark', 'operator', 'reviewer', 'reviewDate', 'rejectReason', 'materials', 'create_by', 'update_time',
    ]);
    const illegalKeys = Object.keys(updates).filter(k => !ALLOWED_COLUMNS.has(k));
    if (illegalKeys.length > 0) {
      return res.status(400).json({ success: false, error: `包含非法更新字段: ${illegalKeys.join(', ')}` });
    }

    // 读旧行（库存联动需要旧状态/旧明细/旧单号）
    const preRows = queryToObjects(db, 'SELECT code, applicant, status, statusClass, materials FROM material_returns WHERE id = ?', [id]);
    if (preRows.length === 0) {
      return res.status(404).json({ success: false, error: '退料记录不存在' });
    }
    const preRow = preRows[0] as any;
    const oldCode = String(preRow.code || '');
    const oldApplicant = String(preRow.applicant || '');
    const oldStatus = String(preRow.status || '');
    const oldStatusClass = String(preRow.statusClass || '');
    const oldMaterials = parseMaterialsJson(preRow.materials);

    const updateKeys = Object.keys(updates).filter(k => ALLOWED_COLUMNS.has(k));
    if (updateKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    // 2026-09-29 审计修复（P1-3）：已恢复库存的退料单禁止编辑明细。
    // 此前只有前端 handleEdit 拦 `status !== '待审批'`，后端无任何守卫 ——
    // 直调 PUT 即可修改已审批退料单的数量并立即生效（事务内 undo 旧 + in 新），
    // 而审批记录仍显示"已审批" → **审批可被完全绕过**（先小额走免审批通过，再改成大额）。
    // 现与 materialRequest 的 approved 守卫对齐：仅允许非有效态（草稿/待审批/已驳回）编辑明细；
    // 作废由 VoidModal → 状态流转完成，不走本端点的明细编辑。
    if (isReturnStockActive(oldStatusClass, oldStatus) && updates.materials !== undefined) {
      return res.status(400).json({
        success: false,
        error: `该退料单当前状态为「${oldStatus}」，库存已恢复，不允许修改明细。如需调整请先作废后再重新提交`,
      });
    }

    // 2026-09-28 修复：状态字段规范化，保证 status/statusClass 一致
    // （仅依据本次提交的字段推导，未提交的一侧才回落旧值）
    if (updates.status !== undefined || updates.statusClass !== undefined) {
      const norm = normalizeStatusUpdate(updates, { status: oldStatus, statusClass: oldStatusClass });
      updates.status = norm.status;
      updates.statusClass = norm.statusClass;
      if (!updateKeys.includes('status')) updateKeys.push('status');
      if (!updateKeys.includes('statusClass')) updateKeys.push('statusClass');
    }

    const materialsChanged = updates.materials !== undefined;
    const statusChanged = String(updates.status ?? oldStatus) !== oldStatus;
    const oldActive = isReturnStockActive(oldStatusClass, oldStatus);
    const newMaterials: any[] = materialsChanged
      ? (Array.isArray(updates.materials) ? updates.materials : [])
      : oldMaterials;
    // 上面的规范化已写入 updates（未提交时回落旧值），此处直接读取
    const newStatus = String(updates.status ?? oldStatus);
    const newStatusClass = String(updates.statusClass ?? oldStatusClass);
    const newActive = isReturnStockActive(newStatusClass, newStatus);

    // 2026-09-28 修复：明细实际未变化时不触发无谓的 undo→in（避免脏写两条流水 + 批次漂移）
    const materialsReallyChanged = materialsChanged
      && JSON.stringify(oldMaterials) !== JSON.stringify(newMaterials);

    const fields = updateKeys.map(k => `${k} = ?`).join(', ');
    const values = updateKeys.map(k => k === 'materials' ? JSON.stringify(updates[k] || []) : updates[k]);

    db.run('BEGIN');
    try {
      if (materialsReallyChanged || statusChanged) {
        if (oldActive) {
          applyReturnStock(db, oldMaterials, id, oldCode, { operator: oldApplicant }, 'undo');
        }
        if (newActive) {
          // 明细变化时重新校验闭环（排除自身，避免旧数量被重复计入）
          if (materialsReallyChanged) {
            validateReturnClosedLoop(db, newMaterials, String(id));
          }
          applyReturnStock(db, newMaterials, id, String(updates.code || oldCode),
            { operator: currentUserName(req) || oldApplicant }, 'in');
        }
      }
      values.push(now, id);
      db.run(`UPDATE material_returns SET ${fields}, update_time = ? WHERE id = ?`, values);
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[生产退料] 更新失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '更新退料失败' });
    }
    persistOrThrow();
    const fullRecord = fetchFullRecord(db, id);
    res.json({ success: true, data: fullRecord || { id } });
  } catch (error) {
    console.error('更新退料失败:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '更新退料失败' });
  }
});

/**
 * 单条删除的共享实现（调用方必须已开启事务）。
 * 归档快照 + 回收库存 + 删除行；任一步失败由调用方 ROLLBACK。
 */
function deleteReturnInternal(db: any, id: string | number, deletedBy: string, reason: string): void {
  const preRows = queryToObjects(db, 'SELECT * FROM material_returns WHERE id = ?', [id]);
  if (preRows.length === 0) {
    throw new Error(`退料记录 ${id} 不存在`);
  }
  const oldRow = preRows[0] as any;
  const oldCode = String(oldRow.code || '');
  const oldStatus = String(oldRow.status || '');
  const oldStatusClass = String(oldRow.statusClass || '');
  const oldMaterials = parseMaterialsJson(oldRow.materials);

  // 2026-09-29 审计修复（P1-10）：删除前必须清理关联审批单。
  // 此前删除退料单只归档+回收库存，approvals 表留下指向不存在单据的孤儿 business_link
  // （审批中心仍显示该单、点进去打不开）；若为**待审批**单，审批人点"通过"时
  // 联动查不到业务单据，会走到硬失败回滚，白跑一轮。与 DELETE /materials/inbound/:id 同策略：
  // pending → 拒绝删除；终态 → 标记 cancelled 留痕（不物理删，保留审计链）。
  let linkedApprovals: Array<{ id: string; status: string }> = [];
  try {
    linkedApprovals = queryToObjects(
      db,
      `SELECT id, status FROM approvals
       WHERE (json_extract(business_link, '$.requestId') = ? OR json_extract(business_link, '$.requestCode') = ?)
         AND status NOT IN ('cancelled')`,
      [String(id), oldCode]
    ) as Array<{ id: string; status: string }>;
  } catch {
    // business_link 非 JSON 或表缺失（历史环境）→ 不做守卫，避免阻塞删除
    linkedApprovals = [];
  }
  const pendingApproval = linkedApprovals.find((a) => String(a.status) === 'pending');
  if (pendingApproval) {
    throw new Error(`该退料单存在待审批单 ${pendingApproval.id}，请先在「物料审批」驳回/撤销后再删除`);
  }
  for (const ap of linkedApprovals) {
    db.run("UPDATE approvals SET status = 'cancelled', updated_at = ? WHERE id = ?", [new Date().toISOString(), ap.id]);
  }

  // 2026-09-28 修复：删除前归档整行快照（永久可追溯，不随 operation_logs 180 天清理丢失）
  archiveDeletedDocument({
    docType: 'material_return',
    docId: String(id),
    docCode: oldCode,
    snapshot: { ...oldRow, materials: oldMaterials },
    deletedBy,
    reason,
  });
  // 有效态退料单删除 → 回收此前恢复的库存（非有效态从未恢复，无需回收）
  if (isReturnStockActive(oldStatusClass, oldStatus)) {
    applyReturnStock(db, oldMaterials, id, oldCode,
      { operator: deletedBy || String(oldRow.applicant || '') }, 'undo');
  }
  db.run('DELETE FROM material_returns WHERE id = ?', [id]);
}

/** 解析删除原因（过滤 "[object Object]" 脏值，前端已防御此处兜底防直调 API） */
function parseDeleteReason(req: Request): string {
  const raw = String((req.query.reason as string) || '');
  return raw === '[object Object]' ? '' : raw;
}

// DELETE /api/material-returns/:id - 删除退料记录（事务内：归档快照 + 回收已恢复的库存）
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const deletedBy = currentUserName(req);
    const reason = parseDeleteReason(req);

    db.run('BEGIN');
    try {
      deleteReturnInternal(db, id, deletedBy, reason);
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[生产退料] 删除失败已回滚:', e);
      const msg = e instanceof Error ? e.message : '删除退料失败';
      return res.status(msg.includes('不存在') ? 404 : 400).json({ success: false, error: msg });
    }
    persistOrThrow();
    res.json({ success: true, data: { id, archived: true } });
  } catch (error) {
    console.error('删除退料失败:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '删除退料失败' });
  }
});

// POST /api/material-returns/batch-delete - 批量删除（单事务：全部成功或全部回滚）
// 2026-09-28 新增：此前前端用 Promise.all 并发逐条删除，任一条失败会导致"部分已删、部分未删"的状态分裂
router.post('/batch-delete', (req: Request, res: Response) => {
  try {
    const ids: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要删除的退料单 id 列表' });
    }
    const db = getDatabase();
    const deletedBy = currentUserName(req);
    const reason = String(req.body?.reason || '');

    db.run('BEGIN');
    try {
      for (const id of ids) {
        deleteReturnInternal(db, String(id), deletedBy, reason);
      }
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[生产退料] 批量删除失败已回滚:', e);
      return res.status(400).json({
        success: false,
        error: `批量删除已全部回滚（未删除任何记录）：${e instanceof Error ? e.message : '删除失败'}`,
      });
    }
    persistOrThrow();
    res.json({ success: true, data: { ids, archived: true } });
  } catch (error) {
    console.error('批量删除退料失败:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '批量删除退料失败' });
  }
});

export default router;
