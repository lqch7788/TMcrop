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
   * 创建流水记录
   */
  async create(data: Partial<InventoryTransaction>): Promise<InventoryTransaction> {
    const db = getDatabase();
    const newId = data.id || `TXN-${Date.now()}`;
    const now = new Date().toISOString();
    const transactionId = data.transaction_id || `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

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
