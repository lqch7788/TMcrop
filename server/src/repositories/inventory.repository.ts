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
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
   * 更新库存数量
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
}

// 导出单例
export const inventoryStockRepository = new InventoryStockRepository();
