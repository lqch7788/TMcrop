/**
 * 库存入库记录数据访问层 (Repository)
 * 负责 inventory_inbound_records 表的数据库 SQL 操作
 *
 * 2026-07-07 新建：配合 generateInboundRecordId 实现入库记录主键 4 位自增，
 * 替代旧的 Math.random() 随机（违反项目 [[code-generation-contract-rule]] 铁律）。
 *
 * 主键格式：INB-YYYYMMDD-NNNN（共 17 字符）
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

/** 库存入库记录 */
export interface InventoryInboundRecord {
  id?: string;
  record_type?: string;
  record_date?: string;
  source_module?: string;
  source_id?: string;
  source_code?: string;
  stock_type?: string;
  source_type?: string;
  crop_code?: string;
  crop_name?: string;
  variety_name?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_amount?: number;
  supplier_id?: string;
  supplier_name?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  business_id?: string;
  notes?: string;
  create_by?: string;
  create_time?: string;
  update_time?: string;
}

/**
 * 入库记录 Repository 类
 */
export class InventoryInboundRepository {
  /**
   * 获取当日 inboundRecordId（INB 主键）最大 4 位序号
   * @param dateStr YYYYMMDD
   * @returns 当日最大 4 位序号（0 表示当日尚无记录）
   */
  async getInboundIdMaxSerial(dateStr: string): Promise<number> {
    const db = getDatabase();
    // INB-YYYYMMDD-NNNN = 17 字符（3 + 1 + 8 + 1 + 4）
    // GLOB '[0-9][0-9][0-9][0-9]' 严格过滤掉旧 random 数据（修复前生成的 INB-...）
    const pattern = `INB-${dateStr}-____`;
    const expectedLength = 3 + 1 + 8 + 1 + 4; // 17
    const stmt = db.prepare(`
      SELECT id FROM inventory_inbound_records
      WHERE id LIKE ?
        AND LENGTH(id) = ?
        AND SUBSTR(id, -4) GLOB '[0-9][0-9][0-9][0-9]'
      ORDER BY SUBSTR(id, -4) DESC LIMIT 1
    `);
    stmt.bind([pattern, expectedLength]);
    let maxSerial = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject() as { id: string };
      const tail = row.id.slice(-4);
      const n = parseInt(tail, 10);
      maxSerial = isNaN(n) ? 0 : n;
    }
    stmt.free();
    return maxSerial;
  }

  /**
   * 根据 recordId（主键）查询
   * 2026-07-07：用于 generateInboundRecordId 二次查重
   */
  async findByRecordId(recordId: string): Promise<InventoryInboundRecord | null> {
    const db = getDatabase();
    const sql = `SELECT * FROM inventory_inbound_records WHERE id = ?`;
    const items = queryToObjects<InventoryInboundRecord>(db, sql, [recordId]);
    return items.length > 0 ? items[0] : null;
  }

  /**
   * 列出所有入库记录（带筛选）
   */
  async findAll(filters: {
    sourceModule?: string;
    sourceId?: string;
    stockType?: string;
    limit?: number;
  } = {}): Promise<InventoryInboundRecord[]> {
    const db = getDatabase();
    let sql = `SELECT * FROM inventory_inbound_records WHERE 1=1`;
    const params: unknown[] = [];
    if (filters.sourceModule) {
      sql += ` AND source_module = ?`;
      params.push(filters.sourceModule);
    }
    if (filters.sourceId) {
      sql += ` AND source_id = ?`;
      params.push(filters.sourceId);
    }
    if (filters.stockType) {
      sql += ` AND stock_type = ?`;
      params.push(filters.stockType);
    }
    sql += ` ORDER BY create_time DESC`;
    if (filters.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }
    return queryToObjects<InventoryInboundRecord>(db, sql, params);
  }

  /**
   * 创建入库记录
   */
  async create(data: Partial<InventoryInboundRecord>): Promise<InventoryInboundRecord> {
    const db = getDatabase();
    const newId = data.id; // 必传，由 generateInboundRecordId 生成
    if (!newId) {
      throw new Error('id 必传（请使用 generateInboundRecordId 生成 4 位自增 ID）');
    }
    const now = new Date().toISOString();
    db.run(`
      INSERT INTO inventory_inbound_records (
        id, record_type, record_date,
        source_module, source_id, source_code,
        stock_type, source_type,
        crop_code, crop_name, variety_name,
        quantity, unit, unit_price, total_amount,
        supplier_id, supplier_name,
        warehouse_id, warehouse_name,
        business_id, notes,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      data.record_type || 'inbound',
      data.record_date || now.slice(0, 10),
      data.source_module || null,
      data.source_id || null,
      data.source_code || null,
      data.stock_type || null,
      data.source_type || null,
      data.crop_code || null,
      data.crop_name || null,
      data.variety_name || null,
      data.quantity || 0,
      data.unit || null,
      data.unit_price || 0,
      data.total_amount || 0,
      data.supplier_id || null,
      data.supplier_name || null,
      data.warehouse_id || null,
      data.warehouse_name || null,
      data.business_id || null,
      data.notes || null,
      data.create_by || null,
      now,
      now,
    ]);
    saveDatabase();
    return { ...data, id: newId, create_time: now, update_time: now } as InventoryInboundRecord;
  }
}

// 导出单例
export const inventoryInboundRepository = new InventoryInboundRepository();