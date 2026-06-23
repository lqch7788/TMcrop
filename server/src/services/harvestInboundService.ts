/**
 * 采收入库服务 (V13.0 - 按计划补全)
 * 管理 harvest_inbounds 表的完整 CRUD + 审批 + 统计 + 导出
 * 审批操作同步写入 audit_logs 审计日志
 */

import { getDatabase, saveDatabase } from '../db';

export interface HarvestInboundRecord {
  id: string; inboundCode: string; sourceType: string;
  sourceId: string; sourceCode: string; cropName: string;
  varietyName: string; inboundDate: string; quantity: number;
  unit: string; warehouseId: string; warehouseName: string;
  batchCode: string; status: string;
  auditorId?: string; auditorName?: string;
  auditOpinion?: string; auditTime?: string;
  operatorId: string; operatorName: string;
  remarks?: string; isDeleted: number;
  createdAt: string; updatedAt: string;
}

export interface HarvestInboundCreateInput {
  sourceType: string; sourceId: string; sourceCode: string;
  cropName: string; varietyName?: string; inboundDate: string;
  quantity: number; unit?: string; warehouseId: string;
  warehouseName?: string; batchCode?: string;
  operatorId: string; operatorName: string; remarks?: string;
}

export interface HarvestInboundUpdateInput {
  sourceType?: string; sourceId?: string; sourceCode?: string;
  cropName?: string; varietyName?: string; inboundDate?: string;
  quantity?: number; unit?: string; warehouseId?: string;
  warehouseName?: string; batchCode?: string;
  operatorId?: string; operatorName?: string; remarks?: string;
}

export interface HarvestInboundQuery {
  sourceType?: string; status?: string; cropName?: string;
  warehouseId?: string; inboundDateStart?: string;
  inboundDateEnd?: string; search?: string;
  page?: number; limit?: number;
}

export interface HarvestInboundStats {
  total: number; pending: number; approved: number;
  rejected: number; totalQuantity: number;
  bySourceType: Record<string, { count: number; quantity: number }>;
  byWarehouse: Record<string, { count: number; quantity: number }>;
}

const FIELD_MAP: Record<string, string> = {
  inbound_code: 'inboundCode',
  source_type: 'sourceType',
  source_id: 'sourceId',
  source_code: 'sourceCode',
  crop_name: 'cropName',
  variety_name: 'varietyName',
  inbound_date: 'inboundDate',
  warehouse_id: 'warehouseId',
  warehouse_name: 'warehouseName',
  batch_code: 'batchCode',
  auditor_id: 'auditorId',
  auditor_name: 'auditorName',
  audit_opinion: 'auditOpinion',
  audit_time: 'auditTime',
  operator_id: 'operatorId',
  operator_name: 'operatorName',
  is_deleted: 'isDeleted',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

function normalize(row: Record<string, any>): HarvestInboundRecord {
  const result: Record<string, any> = {};
  for (const [dbKey, jsKey] of Object.entries(FIELD_MAP)) {
    result[jsKey] = row[dbKey] ?? null;
  }
  result['id'] = row['id'];
  result['quantity'] = Number(row['quantity']) || 0;
  result['unit'] = row['unit'] || '公斤';
  result['status'] = row['status'] || 'pending';
  result['isDeleted'] = Number(row['is_deleted']) || 0;
  for (const k of Object.keys(row)) {
    if (!FIELD_MAP[k] && !(k in result)) result[k] = row[k];
  }
  return result as HarvestInboundRecord;
}

function denormalize(data: Record<string, any>): Record<string, any> {
  const reverse: Record<string, string> = {};
  for (const [dbKey, jsKey] of Object.entries(FIELD_MAP)) reverse[jsKey] = dbKey;
  const result: Record<string, any> = {};
  for (const [jsKey, value] of Object.entries(data)) {
    if (value === undefined) continue;
    result[reverse[jsKey] || jsKey] = value;
  }
  return result;
}

function queryToObjects(db: any, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function generateInboundCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'RK';
  const db = getDatabase();
  const countStmt = db.prepare(
    'SELECT COUNT(*) as cnt FROM harvest_inbounds WHERE inbound_code LIKE ?'
  );
  countStmt.bind([prefix + '-' + dateStr + '-%']);
  let seq = 1;
  if (countStmt.step()) seq = (Number(countStmt.getAsObject().cnt) || 0) + 1;
  countStmt.free();
  return prefix + '-' + dateStr + '-' + String(seq).padStart(3, '0');
}

export function getHarvestInbounds(query: HarvestInboundQuery): { data: HarvestInboundRecord[]; total: number } {
  const db = getDatabase();
  const conditions: string[] = ['is_deleted = 0'];
  const params: any[] = [];
  if (query.sourceType) { conditions.push('source_type = ?'); params.push(query.sourceType); }
  if (query.status) { conditions.push('status = ?'); params.push(query.status); }
  if (query.cropName) { conditions.push('crop_name LIKE ?'); params.push('%' + query.cropName + '%'); }
  if (query.warehouseId) { conditions.push('warehouse_id = ?'); params.push(query.warehouseId); }
  if (query.inboundDateStart) { conditions.push('inbound_date >= ?'); params.push(query.inboundDateStart); }
  if (query.inboundDateEnd) { conditions.push('inbound_date <= ?'); params.push(query.inboundDateEnd); }
  if (query.search) {
    conditions.push('(inbound_code LIKE ? OR crop_name LIKE ? OR source_code LIKE ?)');
    const s = '%' + query.search + '%';
    params.push(s, s, s);
  }
  const where = ' WHERE ' + conditions.join(' AND ');
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 50));
  const offset = (page - 1) * limit;
  const countSql = 'SELECT COUNT(*) as cnt FROM harvest_inbounds' + where;
  const countStmt = db.prepare(countSql);
  countStmt.bind(params);
  let total = 0;
  if (countStmt.step()) total = Number(countStmt.getAsObject().cnt) || 0;
  countStmt.free();
  const dataSql = 'SELECT * FROM harvest_inbounds' + where + ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const dataStmt = db.prepare(dataSql);
  dataStmt.bind([...params, limit, offset]);
  const rows: HarvestInboundRecord[] = [];
  while (dataStmt.step()) rows.push(normalize(dataStmt.getAsObject()));
  dataStmt.free();
  return { data: rows, total };
}

export function getHarvestInboundById(id: string): HarvestInboundRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM harvest_inbounds WHERE id = ? AND is_deleted = 0');
  stmt.bind([id]);
  let row: HarvestInboundRecord | null = null;
  if (stmt.step()) row = normalize(stmt.getAsObject());
  stmt.free();
  return row;
}

export function createHarvestInbound(input: HarvestInboundCreateInput): HarvestInboundRecord {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = 'HI' + Date.now().toString();
  const code = generateInboundCode();
  if (checkDuplicateCode(code)) {
    throw new Error('入库编号 ' + code + ' 已存在，请重试');
  }
  const data = denormalize(input as any);
  data['id'] = id;
  data['inbound_code'] = code;
  data['status'] = 'pending';
  data['unit'] = data['unit'] || '公斤';
  data['is_deleted'] = 0;
  data['created_at'] = now;
  data['updated_at'] = now;
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  db.run('INSERT INTO harvest_inbounds (' + columns + ') VALUES (' + placeholders + ')', Object.values(data));
  saveDatabase();
  const saved = getHarvestInboundById(id);
  if (!saved) throw new Error('创建入库记录后查询失败');
  return saved;
}

export function updateHarvestInbound(id: string, updates: HarvestInboundUpdateInput): HarvestInboundRecord {
  const db = getDatabase();
  const existing = getHarvestInboundById(id);
  if (!existing) throw new Error('入库记录不存在');
  if (existing.status !== 'pending') throw new Error('仅待审批状态的记录可以编辑');
  const data = denormalize(updates as any);
  delete data['status']; delete data['id']; delete data['inbound_code']; delete data['is_deleted'];
  if (Object.keys(data).length === 0) return existing;
  data['updated_at'] = new Date().toISOString();
  const setClauses = Object.keys(data).map(k => k + ' = ?');
  const values = Object.values(data);
  db.run('UPDATE harvest_inbounds SET ' + setClauses.join(', ') + ' WHERE id = ?', [...values, id]);
  saveDatabase();
  const updated = getHarvestInboundById(id);
  if (!updated) throw new Error('更新后查询失败');
  return updated;
}

export function deleteHarvestInbound(id: string): boolean {
  const db = getDatabase();
  const existing = getHarvestInboundById(id);
  if (!existing) throw new Error('入库记录不存在');
  db.run('UPDATE harvest_inbounds SET is_deleted = 1, updated_at = ? WHERE id = ?', [
    new Date().toISOString(), id,
  ]);
  saveDatabase();
  return true;
}

export function batchDeleteHarvestInbounds(ids: string[]): { deleted: number; failed: string[] } {
  let deleted = 0;
  const failed: string[] = [];
  for (const id of ids) {
    try {
      deleteHarvestInbound(id);
      deleted++;
    } catch (e: any) {
      failed.push(id + ': ' + (e.message || String(e)));
    }
  }
  return { deleted, failed };
}

export function approveHarvestInbound(
  id: string,
  auditorId: string,
  auditorName: string,
  opinion?: string
): HarvestInboundRecord {
  const db = getDatabase();
  const existing = getHarvestInboundById(id);
  if (!existing) throw new Error('入库记录不存在');
  if (existing.status !== 'pending') throw new Error('仅待审批状态的记录可以审批');
  const now = new Date().toISOString();
  db.run(
    'UPDATE harvest_inbounds SET status = ?, auditor_id = ?, auditor_name = ?, audit_opinion = ?, audit_time = ?, updated_at = ? WHERE id = ?',
    ['approved', auditorId, auditorName, opinion || '', now, now, id]
  );
  writeAuditLog({
    businessType: 'harvest_inbound',
    businessId: id,
    action: 'approve',
    operatorId: auditorId,
    operatorName: auditorName,
    opinion,
  });
  saveDatabase();
  const updated = getHarvestInboundById(id);
  if (!updated) throw new Error('审批后查询失败');
  return updated;
}

export function rejectHarvestInbound(
  id: string,
  auditorId: string,
  auditorName: string,
  opinion?: string
): HarvestInboundRecord {
  const db = getDatabase();
  const existing = getHarvestInboundById(id);
  if (!existing) throw new Error('入库记录不存在');
  if (existing.status !== 'pending') throw new Error('仅待审批状态的记录可以拒绝');
  const now = new Date().toISOString();
  db.run(
    'UPDATE harvest_inbounds SET status = ?, auditor_id = ?, auditor_name = ?, audit_opinion = ?, audit_time = ?, updated_at = ? WHERE id = ?',
    ['rejected', auditorId, auditorName, opinion || '', now, now, id]
  );
  writeAuditLog({
    businessType: 'harvest_inbound',
    businessId: id,
    action: 'reject',
    operatorId: auditorId,
    operatorName: auditorName,
    opinion,
  });
  saveDatabase();
  const updated = getHarvestInboundById(id);
  if (!updated) throw new Error('拒绝后查询失败');
  return updated;
}

export function getHarvestInboundStats(): HarvestInboundStats {
  const db = getDatabase();
  const rows = queryToObjects(
    db,
    'SELECT status, source_type, warehouse_id, warehouse_name, COUNT(*) as cnt, SUM(quantity) as qty FROM harvest_inbounds WHERE is_deleted = 0 GROUP BY status, source_type, warehouse_id'
  );
  const stats: HarvestInboundStats = {
    total: 0, pending: 0, approved: 0, rejected: 0, totalQuantity: 0,
    bySourceType: {}, byWarehouse: {},
  };
  for (const row of rows) {
    const cnt = Number(row.cnt) || 0;
    const qty = Number(row.qty) || 0;
    stats.total += cnt;
    stats.totalQuantity += qty;
    if (row.status === 'pending') stats.pending += cnt;
    else if (row.status === 'approved') stats.approved += cnt;
    else if (row.status === 'rejected') stats.rejected += cnt;
    if (row.source_type) {
      if (!stats.bySourceType[row.source_type]) stats.bySourceType[row.source_type] = { count: 0, quantity: 0 };
      stats.bySourceType[row.source_type].count += cnt;
      stats.bySourceType[row.source_type].quantity += qty;
    }
    if (row.warehouse_id) {
      const label = row.warehouse_name || row.warehouse_id;
      if (!stats.byWarehouse[label]) stats.byWarehouse[label] = { count: 0, quantity: 0 };
      stats.byWarehouse[label].count += cnt;
      stats.byWarehouse[label].quantity += qty;
    }
  }
  return stats;
}

export function exportHarvestInbounds(query: Omit<HarvestInboundQuery, 'page' | 'limit'>): HarvestInboundRecord[] {
  const result = getHarvestInbounds({ ...query, page: 1, limit: 10000 });
  return result.data;
}

export function checkDuplicateCode(code: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('SELECT 1 FROM harvest_inbounds WHERE inbound_code = ? LIMIT 1');
  stmt.bind([code]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

export function getPendingCount(): number {
  const db = getDatabase();
  const stmt = db.prepare(
    'SELECT COUNT(*) as cnt FROM harvest_inbounds WHERE status = ? AND is_deleted = 0'
  );
  stmt.bind(['pending']);
  let count = 0;
  if (stmt.step()) count = Number(stmt.getAsObject().cnt) || 0;
  stmt.free();
  return count;
}

function writeAuditLog(entry: {
  businessType: string; businessId: string; action: string;
  operatorId: string; operatorName: string; opinion?: string;
}): void {
  const db = getDatabase();
  const id = 'AL' + Date.now().toString();
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO audit_logs (id, business_type, business_id, action, operator_id, operator_name, opinion, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, entry.businessType, entry.businessId, entry.action, entry.operatorId, entry.operatorName, entry.opinion || '', now]
  );
}
