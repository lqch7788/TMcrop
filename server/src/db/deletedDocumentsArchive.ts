/**
 * 删除单据归档（2026-09-27 审计方案：删除后仍可追溯）
 *
 * 背景：
 *  - operation_logs 默认 180 天自动清理（cron 每日 4 点），且出库单删除快照不稳定
 *    （同一请求内联动 SQL 会挤掉删除行快照）→ 不能作为永久审计载体
 *  - 已发料出库单已改为"作废"（cancelled，本体保留，见 materialExecute DELETE）；
 *    本表承接"允许物理删除"的场景：
 *      · 待出库单（pending_out，未扣库存、无业务影响）
 *      · 申请单（草稿/待审批/被驳回/已作废，均无库存影响、无出库引用）
 *
 * 设计：删除时整行快照 JSON 永久留存（不参与日志清理），提供按单号/类型/日期查询。
 * 建表为 GREEN 级幂等操作（启动白名单允许执行，见 index.ts）。
 */
import { getDatabase } from './index';

export interface ArchivedDocument {
  docType: 'material_request' | 'material_execute' | 'material_return';
  docId: string;
  docCode: string;
  /** 删除前整行数据（含物料明细） */
  snapshot: Record<string, unknown>;
  deletedBy?: string;
  reason?: string;
}

/** GREEN 级幂等建表 + 索引（启动时调用） */
export function ensureDeletedDocumentsArchiveSchema(): void {
  const db = getDatabase();
  db.run(`
    CREATE TABLE IF NOT EXISTS deleted_documents_archive (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      doc_code TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      deleted_by TEXT,
      deleted_at TEXT NOT NULL,
      reason TEXT
    )
  `);
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_deleted_docs_code ON deleted_documents_archive(doc_code)',
    'CREATE INDEX IF NOT EXISTS idx_deleted_docs_type_time ON deleted_documents_archive(doc_type, deleted_at DESC)',
  ];
  for (const sql of indexes) {
    try { db.run(sql); } catch { /* 索引已存在 */ }
  }
  // 2026-09-27：material_executes 补 remarks 列（作废原因写入用；表原本没有该列）
  try {
    db.run('ALTER TABLE material_executes ADD COLUMN remarks TEXT');
  } catch { /* 列已存在 */ }
}

/** 写入一条归档（调用方负责放在事务内；落盘由调用方统一 saveDatabase） */
export function archiveDeletedDocument(doc: ArchivedDocument): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `ARC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.run(
    `INSERT INTO deleted_documents_archive
       (id, doc_type, doc_id, doc_code, snapshot, deleted_by, deleted_at, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      doc.docType,
      String(doc.docId),
      doc.docCode,
      JSON.stringify(doc.snapshot),
      doc.deletedBy || null,
      now,
      doc.reason || null,
    ]
  );
}

export interface DeletedDocumentRow {
  id: string;
  docType: string;
  docId: string;
  docCode: string;
  snapshot: Record<string, unknown>;
  deletedBy: string | null;
  deletedAt: string;
  reason: string | null;
}

/** 查询归档（按单号/类型/日期过滤；单号支持模糊匹配） */
export function queryDeletedDocuments(params: {
  code?: string;
  type?: string;
  from?: string;
  to?: string;
  limit?: number;
}): DeletedDocumentRow[] {
  const db = getDatabase();
  const where: string[] = [];
  const bindings: (string | number)[] = [];
  if (params.code) {
    where.push('doc_code LIKE ?');
    bindings.push(`%${params.code}%`);
  }
  if (params.type) {
    where.push('doc_type = ?');
    bindings.push(params.type);
  }
  if (params.from) {
    where.push('deleted_at >= ?');
    bindings.push(params.from);
  }
  if (params.to) {
    // 含当天：to 传日期字符串时补 23:59:59 边界
    where.push('deleted_at <= ?');
    bindings.push(params.to.length === 10 ? `${params.to}T23:59:59.999Z` : params.to);
  }
  const limit = Math.min(Math.max(1, Number(params.limit) || 100), 500);
  const whereSql = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  const stmt = db.prepare(
    `SELECT id, doc_type, doc_id, doc_code, snapshot, deleted_by, deleted_at, reason
     FROM deleted_documents_archive${whereSql}
     ORDER BY deleted_at DESC LIMIT ?`
  );
  stmt.bind([...bindings, limit]);
  const rows: DeletedDocumentRow[] = [];
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>;
    let snapshot: Record<string, unknown> = {};
    try {
      const p = JSON.parse(String(r.snapshot || '{}'));
      snapshot = p && typeof p === 'object' ? p : {};
    } catch { snapshot = {}; }
    rows.push({
      id: String(r.id),
      docType: String(r.doc_type),
      docId: String(r.doc_id),
      docCode: String(r.doc_code),
      snapshot,
      deletedBy: r.deleted_by ? String(r.deleted_by) : null,
      deletedAt: String(r.deleted_at),
      reason: r.reason ? String(r.reason) : null,
    });
  }
  stmt.free();
  return rows;
}
