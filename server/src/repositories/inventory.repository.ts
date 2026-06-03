/**
 * 库存中心数据访问层 (Repository)
 * 负责 inventory_stock 表的数据库 SQL 操作
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

/** 库存记录查询参数 */
export interface InventoryStockQuery {
  stock_type?: string;
  warehouse_id?: string;
  crop_name?: string;
  business_id?: string;
  page?: number;
  limit?: number;
}

/** 库存记录 */
export interface InventoryStock {
  id?: string;
  instance_id?: string;
  stock_type?: string;
  business_id?: string;
  business_type?: string;
  business_code?: string;
  crop_id?: string;
  crop_name?: string;
  variety_id?: string;
  variety_name?: string;
  current_quantity?: number;
  frozen_quantity?: number;
  available_quantity?: number;
  unit?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  inbound_date?: string;
  source_type?: string;
  production_plan_code?: string;
  source_instance_id?: string;
  status?: string;
  version?: number;
  create_time?: string;
  update_time?: string;
  // V3 扩展字段（采收入库对接）
  crop_code?: string;          // 11 位品种库编码
  planting_mode?: string;       // 种植模式
  target_yield?: number;        // 目标产量
  grade?: string;               // 品质等级 A/B/C
  auditor?: string;             // 审核人
  remarks?: string;             // 备注
  greenhouse_name?: string;     // 采收区域
}

/**
 * 库存 Repository 类
 */
export class InventoryStockRepository {
  /**
   * 创建库存记录
   */
  async create(data: Partial<InventoryStock>): Promise<InventoryStock> {
    const db = getDatabase();
    const newId = data.id || `STK-${Date.now()}`;
    const now = new Date().toISOString();
    const instanceId = data.instance_id || `IPR-${now.slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    db.run(`
      INSERT INTO inventory_stock (
        id, instance_id, stock_type, business_id, business_type, business_code,
        crop_id, crop_name, variety_id, variety_name,
        current_quantity, frozen_quantity, available_quantity, unit,
        warehouse_id, warehouse_name, inbound_date, source_type,
        production_plan_code, source_instance_id, status, version,
        crop_code, planting_mode, target_yield, grade, auditor, remarks, greenhouse_name,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId,
      instanceId,
      data.stock_type || null,
      data.business_id || null,
      data.business_type || null,
      data.business_code || null,
      data.crop_id || null,
      data.crop_name || null,
      data.variety_id || null,
      data.variety_name || null,
      data.current_quantity || 0,
      data.frozen_quantity || 0,
      data.current_quantity || 0,  // available_quantity = current_quantity
      data.unit || null,
      data.warehouse_id || null,
      data.warehouse_name || null,
      data.inbound_date || now.slice(0, 10),
      data.source_type || null,
      data.production_plan_code || null,
      data.source_instance_id || null,
      data.status || 'in_stock',
      1,  // version
      // V3 扩展字段（采收 → 库存完整字段对接）
      data.crop_code || null,
      data.planting_mode || null,
      data.target_yield || 0,
      data.grade || null,
      data.auditor || null,
      data.remarks || null,
      data.greenhouse_name || null,
      now,
      now
    ]);

    saveDatabase();

    return {
      id: newId,
      instance_id: instanceId,
      ...data,
      current_quantity: data.current_quantity || 0,
      frozen_quantity: data.frozen_quantity || 0,
      available_quantity: data.current_quantity || 0,
      status: data.status || 'in_stock',
      version: 1,
      create_time: now,
      update_time: now
    } as InventoryStock;
  }

  /**
   * 根据 instanceId 查询
   */
  async findByInstanceId(instanceId: string): Promise<InventoryStock | null> {
    const db = getDatabase();
    const sql = `SELECT * FROM inventory_stock WHERE instance_id = ?`;
    const items = queryToObjects<InventoryStock>(db, sql, [instanceId]);
    return items.length > 0 ? items[0] : null;
  }

  /**
   * 根据 businessId 查询
   */
  async findByBusinessId(businessId: string): Promise<InventoryStock | null> {
    const db = getDatabase();
    const sql = `SELECT * FROM inventory_stock WHERE business_id = ?`;
    const items = queryToObjects<InventoryStock>(db, sql, [businessId]);
    return items.length > 0 ? items[0] : null;
  }

  /**
   * 查询库存列表（分页、筛选）
   */
  async findAll(query: InventoryStockQuery): Promise<{ data: InventoryStock[]; total: number }> {
    const db = getDatabase();
    const { stock_type, warehouse_id, crop_name, page = 1, limit = 50 } = query;

    let sql = `SELECT * FROM inventory_stock WHERE 1=1`;
    const params: any[] = [];

    if (stock_type) {
      sql += ` AND stock_type = ?`;
      params.push(stock_type);
    }

    if (warehouse_id) {
      sql += ` AND warehouse_id = ?`;
      params.push(warehouse_id);
    }

    if (crop_name) {
      sql += ` AND crop_name LIKE ?`;
      params.push(`%${crop_name}%`);
    }

    // 获取总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = queryToObjects<{ total: number }>(db, countSql, params);
    const total = countResult[0]?.total || 0;

    // 分页
    sql += ` ORDER BY create_time DESC`;
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects<InventoryStock>(db, sql, params);

    return { data: items, total };
  }

  /**
   * 更新库存数量（带乐观锁）
   */
  async updateQuantity(instanceId: string, newQuantity: number, version: number): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 乐观锁检查
    const existing = await this.findByInstanceId(instanceId);
    if (!existing) return false;
    if (existing.version !== version) {
      throw new Error(`乐观锁冲突：期望版本 ${version}，实际版本 ${existing.version}`);
    }

    db.run(`
      UPDATE inventory_stock
      SET current_quantity = ?, available_quantity = ?, version = version + 1, update_time = ?
      WHERE instance_id = ?
    `, [newQuantity, newQuantity, now, instanceId]);

    saveDatabase();
    return true;
  }

  /**
   * 更新冻结数量（带乐观锁）
   */
  async updateFrozenQuantity(instanceId: string, newFrozenQty: number, version: number): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 乐观锁检查
    const existing = await this.findByInstanceId(instanceId);
    if (!existing) return false;
    if (existing.version !== version) {
      throw new Error(`乐观锁冲突：期望版本 ${version}，实际版本 ${existing.version}`);
    }

    const availableQty = (existing.current_quantity ?? 0) - newFrozenQty;

    db.run(`
      UPDATE inventory_stock
      SET frozen_quantity = ?, available_quantity = ?, version = version + 1, update_time = ?
      WHERE instance_id = ?
    `, [newFrozenQty, availableQty, now, instanceId]);

    saveDatabase();
    return true;
  }

  /**
   * 根据 source_instance_id 查找所有下游库存实例
   */
  async findBySourceInstanceId(sourceInstanceId: string): Promise<InventoryStock[]> {
    const db = getDatabase();
    const sql = `SELECT * FROM inventory_stock WHERE source_instance_id = ? ORDER BY create_time DESC`;
    return queryToObjects<InventoryStock>(db, sql, [sourceInstanceId]);
  }

  /**
   * 统计库存（按 stockType 分组 + 总览）
   */
  async getStats(filters?: { stockType?: string }): Promise<{
    totalInstances: number;
    totalQuantity: number;
    byStockType: Record<string, { count: number; quantity: number }>;
    lowStockCount: number;
    expiringCount: number;
  }> {
    const db = getDatabase();
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';
    if (filters?.stockType) {
      whereClause += ' AND stock_type = ?';
      params.push(filters.stockType);
    }

    const totals = queryToObjects<{ totalInstances: number; totalQuantity: number }>(db,
      `SELECT COUNT(*) as totalInstances, COALESCE(SUM(current_quantity), 0) as totalQuantity
       FROM inventory_stock ${whereClause}`, params);
    const totalInstances = totals[0]?.totalInstances ?? 0;
    const totalQuantity = Number(totals[0]?.totalQuantity ?? 0);

    const byType = queryToObjects<{ stock_type: string; count: number; quantity: number }>(db,
      `SELECT stock_type, COUNT(*) as count, COALESCE(SUM(current_quantity), 0) as quantity
       FROM inventory_stock ${whereClause} GROUP BY stock_type`, params);

    const byStockType: Record<string, { count: number; quantity: number }> = {
      seed: { count: 0, quantity: 0 },
      seedling: { count: 0, quantity: 0 },
      product: { count: 0, quantity: 0 },
    };
    for (const row of byType) {
      byStockType[row.stock_type] = {
        count: row.count,
        quantity: Number(row.quantity),
      };
    }

    // 低库存与临期（简化：低库存=current<10；临期=inbound_date>180天）
    const lowStock = queryToObjects<{ c: number }>(db,
      `SELECT COUNT(*) as c FROM inventory_stock ${whereClause} AND current_quantity < 10`, params);
    const expiring = queryToObjects<{ c: number }>(db,
      `SELECT COUNT(*) as c FROM inventory_stock ${whereClause} AND inbound_date < date('now', '-180 days')`, params);

    return {
      totalInstances,
      totalQuantity,
      byStockType,
      lowStockCount: lowStock[0]?.c ?? 0,
      expiringCount: expiring[0]?.c ?? 0,
    };
  }
}

// 导出单例
export const inventoryStockRepository = new InventoryStockRepository();
