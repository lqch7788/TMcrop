/**
 * 回收站处理器通用工具：按主键读取原行、按快照原样重建行。
 * 说明：快照统一保存数据库原始 snake_case 行，恢复时按列写回，避免字段映射漂移。
 */
import type { Database } from 'sql.js';

/** 读取单行（不存在返回 null） */
export function readRow(db: Database, table: string, id: unknown): Record<string, unknown> | null {
  if (id === undefined || id === null) return null;
  const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
  stmt.bind([id as string]);
  const row = stmt.step() ? (stmt.getAsObject() as Record<string, unknown>) : null;
  stmt.free();
  return row;
}

/** 查询多行（参数化，表名由调用方常量传入） */
export function readRows(db: Database, sql: string, params: unknown[]): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
  stmt.free();
  return rows;
}

/** 按快照原样插入一行（列名取自快照 key，undefined 转为 null） */
export function insertRow(db: Database, table: string, row: Record<string, unknown>): void {
  const cols = Object.keys(row).filter((c) => row[c] !== undefined);
  if (cols.length === 0) throw new Error(`恢复失败：${table} 快照为空`);
  const placeholders = cols.map(() => '?').join(', ');
  db.run(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
    cols.map((c) => (row[c] === undefined ? null : row[c])) as any[],
  );
}

/** 判断某行是否已存在（恢复前冲突检查） */
export function rowExists(db: Database, table: string, id: unknown): boolean {
  const stmt = db.prepare(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`);
  stmt.bind([id as string]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

/** 解析 JSON 字段；失败返回 null（不抛错，由调用方决定阻断或跳过） */
export function parseJson(value: unknown): any {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** 写种源库存流水（恢复时重新扣减种源使用，与删除时的退款流水对称） */
export async function insertSourceTransaction(
  db: Database,
  params: {
    sourceId: string;
    delta: number;          // 正=入库，负=出库
    balanceBefore: number;
    balanceAfter: number;
    businessId: string;
    businessCode: string;
    operatorId?: string;
    operatorName?: string;
    remark: string;
    now: string;
  },
): Promise<void> {
  if (Math.abs(params.delta) <= 0.0001) return;
  const { generateTransactionId } = require('../inventory.service');
  const ymd = params.now.slice(0, 10).replace(/-/g, '');
  const txId = await generateTransactionId(ymd);
  const transactionId = await generateTransactionId(ymd);
  db.run(
    `INSERT INTO inventory_transaction (
      id, transaction_id, instance_id, stock_type, transaction_type, quantity,
      balance_before, balance_after, business_id, business_type, business_code,
      operator_id, operator_name, operate_date, remarks, create_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seedling', ?, ?, ?, ?, ?, ?)`,
    [
      txId, transactionId, `seed_source:${params.sourceId}`, 'seed',
      params.delta > 0 ? 'inbound' : 'outbound', params.delta,
      params.balanceBefore, params.balanceAfter,
      params.businessId, params.businessCode,
      params.operatorId || '', params.operatorName || 'system',
      params.now.slice(0, 10), params.remark, params.now,
    ] as any[],
  );
}
