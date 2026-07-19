/**
 * 库存流水数据访问层 (Repository)
 * 负责 inventory_transaction 表的数据库 SQL 操作
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

/** 库存流水记录 */
export interface InventoryTransaction {
  id?: string;
  transaction_id?: string;
  instance_id?: string;
  stock_type?: string;
  transaction_type?: string;
  quantity?: number;
  balance_before?: number;
  balance_after?: number;
  business_id?: string;
  business_type?: string;
  business_code?: string;
  operator_id?: string;
  operator_name?: string;
  operate_date?: string;
  remarks?: string;
  create_time?: string;
}

/**
 * 库存流水 Repository 类
 */
export class InventoryTransactionRepository {
  /**
   * 获取当日 transactionId 最大 4 位序号
   * 2026-06-08 V2.1 重构：流水 ID 改用 4 位自增（TRX + YYYYMMDD + NNNN），
   * 替代旧的 Math.random() 4 字符 base36 随机。
   * @param dateStr YYYYMMDD
   * @returns 当日最大 4 位序号（0 表示当日尚无记录）
   */
  async getTransactionIdMaxSerial(dateStr: string): Promise<number> {
    const db = getDatabase();
    // LIKE 模式: TRX(3) + '-' + 日期(8) + '-' + 4位序号 = 17 字符
    //   TRX-20260608-0001
    //   ↑3  ↑1  ↑8     ↑1  ↑4   = 17
    // 2026-06-08 修复：GLOB '[0-9][0-9][0-9][0-9]' 过滤 base36 旧数据（修复前生成），
    // 否则 base36 tail 永远"赢"字符串排序，parseInt 出 NaN → 0 → 永远 serial=1 → 撞 0001
    const pattern = `TRX-${dateStr}-____`;
    const expectedLength = 17;
    const stmt = db.prepare(`
      SELECT transaction_id FROM inventory_transaction
      WHERE transaction_id LIKE ?
        AND LENGTH(transaction_id) = ?
        AND SUBSTR(transaction_id, -4) GLOB '[0-9][0-9][0-9][0-9]'
      ORDER BY SUBSTR(transaction_id, -4) DESC LIMIT 1
    `);
    stmt.bind([pattern, expectedLength]);
    let maxSerial = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject() as { transaction_id: string };
      const tail = row.transaction_id.slice(-4);
      const n = parseInt(tail, 10);
      maxSerial = isNaN(n) ? 0 : n;
    }
    stmt.free();
    return maxSerial;
  }

  /**
   * 2026-07-19 P1：按 transaction_id 查重（generateTransactionId 并发保护用）
   */
  async findByTransactionId(transactionId: string): Promise<InventoryTransaction | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inventory_transaction WHERE transaction_id = ? LIMIT 1');
    stmt.bind([transactionId]);
    const row: any = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row ? (row as unknown as InventoryTransaction) : null;
  }

  /**
   * 创建流水记录
   */
  async create(data: Partial<InventoryTransaction>): Promise<InventoryTransaction> {
    const db = getDatabase();
    // 2026-07-15：删 Date.now() 兜底分支（违反"业务 ID 禁 Date.now"铁律）
    // service / route 层必传 id 和 transaction_id（4位自增格式），否则直接抛错
    const newId = data.id;
    const now = new Date().toISOString();
    if (!newId) {
      throw new Error('id 必传（请使用 generateTransactionId 生成 4 位自增 ID）');
    }
    const transactionId = data.transaction_id;
    if (!transactionId) {
      throw new Error('transaction_id 必传（请使用 generateTransactionId 生成 4 位自增 ID）');
    }

    db.run(`
      INSERT INTO inventory_transaction (
        id, transaction_id, instance_id, stock_type, transaction_type,
        quantity, balance_before, balance_after,
        business_id, business_type, business_code,
        operator_id, operator_name, operate_date, remarks, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      transactionId,
      data.instance_id || null,
      data.stock_type || null,
      data.transaction_type || null,
      data.quantity || 0,
      data.balance_before || 0,
      data.balance_after || 0,
      data.business_id || null,
      data.business_type || null,
      data.business_code || null,
      data.operator_id || null,
      data.operator_name || null,
      data.operate_date || now.slice(0, 10),
      data.remarks || null,
      now
    ]);

    saveDatabase();

    return {
      id: newId,
      transaction_id: transactionId,
      ...data,
      balance_before: data.balance_before || 0,
      create_time: now
    } as InventoryTransaction;
  }

  /**
   * 根据 instanceId 查询流水
   */
  async findByInstanceId(instanceId: string): Promise<InventoryTransaction[]> {
    const db = getDatabase();
    const sql = `SELECT * FROM inventory_transaction WHERE instance_id = ? ORDER BY create_time DESC`;
    return queryToObjects<InventoryTransaction>(db, sql, [instanceId]);
  }

  /**
   * 根据 businessId 查询流水
   */
  async findByBusinessId(businessId: string): Promise<InventoryTransaction[]> {
    const db = getDatabase();
    const sql = `SELECT * FROM inventory_transaction WHERE business_id = ? ORDER BY create_time DESC`;
    return queryToObjects<InventoryTransaction>(db, sql, [businessId]);
  }
}

// 导出单例
export const inventoryTransactionRepository = new InventoryTransactionRepository();
