/**
 * 作物管理通用回收站服务
 *
 * 职责：
 * - archiveBeforeDelete：删除前归档（快照 + 删除人/时间 + 来源页面）
 * - restoreRecycleItem：按实体处理器恢复（事务；失败保持 pending 并记录原因）
 * - listRecycleItems / getRecycleItem / getRecycleStats：回收站列表
 * - purgeRecycleItem：彻底删除（管理员，审计留痕）
 *
 * 业务差异全部在 registry 的 handler 中，本服务不认识具体表结构。
 */
import { getDatabase, saveDatabase } from '../db';
import { formatLocalDateISO } from '../utils/dateUtil';
import { writeAuditLog } from './auditLog.service';
import { getRecycleHandler } from './recycleBin/registry';
import type { RecycleCapture, RecycleOperator } from './recycleBin/types';

export interface ArchiveOptions {
  operator?: RecycleOperator;
  sourcePage?: string;
  module?: string;
}

export interface ListOptions {
  entityType?: string;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/** 生成回收站编号：RCY-YYYYMMDD-NNNN（按本地日期自增） */
function generateRecycleId(): string {
  const db = getDatabase();
  const ymd = formatLocalDateISO().replace(/-/g, '');
  const prefix = `RCY-${ymd}-`;
  const rows = db.exec(
    `SELECT id FROM recycle_bin WHERE id LIKE '${prefix}%' ORDER BY id DESC LIMIT 1`,
  );
  const last = rows[0]?.values?.[0]?.[0] ? String(rows[0].values[0][0]) : '';
  const serial = last ? (parseInt(last.slice(prefix.length), 10) || 0) + 1 : 1;
  return `${prefix}${String(serial).padStart(4, '0')}`;
}

/**
 * 删除前归档：抓取快照并写入回收站（不执行删除）
 * 返回回收站记录 ID；实体未注册/记录不存在时返回 null（调用方按需决定是否阻断）
 */
export function archiveBeforeDelete(
  entityType: string,
  entityId: string,
  options: ArchiveOptions = {},
): string | null {
  const handler = getRecycleHandler(entityType);
  if (!handler) {
    console.warn(`[recycle-bin] 未注册的实体类型: ${entityType}，删除不会进入回收站`);
    return null;
  }
  const db = getDatabase();
  const capture: RecycleCapture | null = handler.capture(db, entityId);
  if (!capture) return null;

  const id = generateRecycleId();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO recycle_bin (
      id, module, entity_type, entity_id, entity_code, display_name,
      snapshot, dependencies, restore_info, delete_mode, source_page,
      deleted_by, deleted_by_id, deleted_at, restore_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      id,
      options.module || 'crop',
      entityType,
      entityId,
      capture.entityCode || null,
      capture.displayName || null,
      JSON.stringify(capture.snapshot),
      capture.dependencies ? JSON.stringify(capture.dependencies) : null,
      capture.restoreInfo ? JSON.stringify(capture.restoreInfo) : null,
      handler.deleteMode,
      options.sourcePage || null,
      options.operator?.name || null,
      options.operator?.id || null,
      now,
      now,
    ],
  );
  return id;
}

/** 批量归档；返回与入参顺序一致的回收站 ID 列表（未归档为 null） */
export function archiveBatchBeforeDelete(
  entityType: string,
  entityIds: string[],
  options: ArchiveOptions = {},
): Array<string | null> {
  return entityIds.map((id) => archiveBeforeDelete(entityType, id, options));
}

/** 删除失败时标记归档失败，避免用户看到"已删除"的假记录 */
export function markArchiveFailed(recycleId: string | null, error: unknown): void {
  if (!recycleId) return;
  try {
    const db = getDatabase();
    db.run(`UPDATE recycle_bin SET restore_status = 'failed', restore_error = ? WHERE id = ?`, [
      error instanceof Error ? error.message : String(error),
      recycleId,
    ]);
  } catch (e) {
    console.error('[recycle-bin] 标记归档失败时出错:', e);
  }
}

function mapRecord(row: Record<string, any>) {
  return {
    id: row.id,
    module: row.module,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityCode: row.entity_code,
    displayName: row.display_name,
    snapshot: row.snapshot,
    dependencies: row.dependencies,
    restoreInfo: row.restore_info,
    deleteMode: row.delete_mode,
    sourcePage: row.source_page,
    deletedBy: row.deleted_by,
    deletedById: row.deleted_by_id,
    deletedAt: row.deleted_at,
    restoreStatus: row.restore_status,
    restoredBy: row.restored_by,
    restoredAt: row.restored_at,
    restoreError: row.restore_error,
    createdAt: row.created_at,
  };
}

/** 列表查询（默认只返回本模块、未彻底删除的记录） */
export function listRecycleItems(options: ListOptions = {}) {
  const db = getDatabase();
  const where: string[] = [`module = 'crop'`];
  const params: any[] = [];

  if (options.entityType) {
    where.push('entity_type = ?');
    params.push(options.entityType);
  }
  if (options.status) {
    where.push('restore_status = ?');
    params.push(options.status);
  } else {
    where.push(`restore_status != 'purged'`);
  }
  if (options.keyword) {
    where.push('(entity_code LIKE ? OR display_name LIKE ?)');
    params.push(`%${options.keyword}%`, `%${options.keyword}%`);
  }
  if (options.startDate) {
    where.push('deleted_at >= ?');
    params.push(`${options.startDate}T00:00:00.000Z`);
  }
  if (options.endDate) {
    where.push('deleted_at <= ?');
    params.push(`${options.endDate}T23:59:59.999Z`);
  }

  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(options.pageSize) || 20));
  const whereSql = where.join(' AND ');

  const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM recycle_bin WHERE ${whereSql}`);
  countStmt.bind(params);
  const total = countStmt.step() ? Number(countStmt.getAsObject().total || 0) : 0;
  countStmt.free();

  const stmt = db.prepare(
    `SELECT * FROM recycle_bin WHERE ${whereSql} ORDER BY deleted_at DESC, id DESC LIMIT ? OFFSET ?`,
  );
  stmt.bind([...params, pageSize, (page - 1) * pageSize]);
  const rows: ReturnType<typeof mapRecord>[] = [];
  while (stmt.step()) rows.push(mapRecord(stmt.getAsObject() as Record<string, any>));
  stmt.free();

  return { items: rows, total, page, pageSize };
}

/** 详情 */
export function getRecycleItem(id: string) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM recycle_bin WHERE id = ?');
  stmt.bind([id]);
  const row = stmt.step() ? (stmt.getAsObject() as Record<string, any>) : null;
  stmt.free();
  return row ? mapRecord(row) : null;
}

/** 各实体待恢复数量（菜单角标 / 统计卡片） */
export function getRecycleStats() {
  const db = getDatabase();
  const rows = db.exec(
    `SELECT entity_type, COUNT(*) AS count FROM recycle_bin
     WHERE module = 'crop' AND restore_status = 'pending'
     GROUP BY entity_type`,
  );
  // 用数组而不是对象：全局 camelCase 响应中间件会把对象 key（如 seed_source）转成 seedSource，
  // 导致前端按 entity_type 取值失败。
  const byType: Array<{ entityType: string; count: number }> = [];
  let total = 0;
  for (const row of rows[0]?.values || []) {
    const entityType = String(row[0]);
    const count = Number(row[1]) || 0;
    byType.push({ entityType, count });
    total += count;
  }
  return { total, byType };
}

/** 恢复一条记录（事务；失败回滚并记录原因） */
export async function restoreRecycleItem(id: string, operator: RecycleOperator) {
  const db = getDatabase();
  const record = getRecycleItem(id);
  if (!record) throw new Error('回收站记录不存在');
  if (record.restoreStatus === 'restored') throw new Error('该记录已恢复，请勿重复操作');
  if (record.restoreStatus === 'purged') throw new Error('该记录已彻底删除，无法恢复');

  const handler = getRecycleHandler(record.entityType);
  if (!handler) throw new Error(`未注册的实体类型：${record.entityType}`);
  if (handler.restoreMode === 'view_only') throw new Error('该类型记录仅支持查看，不支持恢复');

  const snapshot = JSON.parse(record.snapshot || '{}');
  const dependencies = record.dependencies ? JSON.parse(record.dependencies) : [];
  const restoreInfo = record.restoreInfo ? JSON.parse(record.restoreInfo) : undefined;
  const now = new Date().toISOString();

  db.run('BEGIN');
  try {
    const result = await handler.restore(db, snapshot, dependencies, operator, now, restoreInfo);
    db.run(
      `UPDATE recycle_bin SET restore_status = 'restored', restored_by = ?, restored_at = ?, restore_error = NULL WHERE id = ?`,
      [operator.name || null, now, id],
    );
    db.run('COMMIT');
    saveDatabase();
    writeAuditLog({
      businessType: 'recycle_bin.restore',
      businessId: record.entityId,
      action: 'restore',
      operatorName: operator.name,
      opinion: `从回收站恢复 ${handler.label} ${record.entityCode || record.entityId}（${id}）`,
    });
    return { id, entityId: result.id, warnings: result.warnings || [] };
  } catch (error) {
    try { db.run('ROLLBACK'); } catch (rollbackError) {
      console.error('[recycle-bin] ROLLBACK 失败:', rollbackError);
    }
    const message = error instanceof Error ? error.message : String(error);
    try {
      db.run(`UPDATE recycle_bin SET restore_error = ? WHERE id = ?`, [message, id]);
      saveDatabase();
    } catch { /* 保持原错误 */ }
    throw error;
  }
}

/** 彻底删除回收站记录（仅管理员；不触碰业务数据） */
export function purgeRecycleItem(id: string, operator: RecycleOperator): void {
  const db = getDatabase();
  const record = getRecycleItem(id);
  if (!record) throw new Error('回收站记录不存在');
  db.run(`UPDATE recycle_bin SET restore_status = 'purged', purge_at = ? WHERE id = ?`, [
    new Date().toISOString(), id,
  ]);
  saveDatabase();
  writeAuditLog({
    businessType: 'recycle_bin.purge',
    businessId: record.entityId,
    action: 'delete',
    operatorName: operator.name,
    opinion: `彻底删除回收站记录 ${id}（${record.entityType} ${record.entityCode || ''}）`,
  });
}
