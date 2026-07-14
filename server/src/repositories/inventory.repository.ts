/**
 * 库存中心数据访问层 (Repository)
 * 负责 inventory_stock 表的数据库 SQL 操作
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

/** 库存记录查询参数 */
export interface InventoryStockQuery {
  stockType?: string;
  warehouseId?: string;
  cropName?: string;
  businessId?: string;
  // T11（2026-07-08）：P0 过滤器 bug 修复 — repository 层真正消费 status / sourceType
  status?: string;
  sourceType?: string;
  page?: number;
  limit?: number;
}

/** 库存记录 */
// 注意：findAll/findById/findByInstanceId 走 queryToObjects 自动转 camelCase，
// create() 入参使用 snake_case（直接组装 SQL）。两种字段名都支持。
export interface InventoryStock {
  // 原始 snake_case（create/insert 用）
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
  // V3 扩展字段
  crop_code?: string;
  planting_mode?: string;
  target_yield?: number;
  grade?: string;
  auditor?: string;
  remarks?: string;
  greenhouse_name?: string;
  // 采购信息（外购入库财务字段）
  supplier_id?: string;
  supplier_name?: string;
  unit_price?: number;
  total_amount?: number;
  purchase_date?: string;
  // 2026-07-14：补齐详情/展示用字段（用于详情弹窗和列表扩展）
  supplier_phone?: string;
  gift_from?: string;
  consignor?: string;
  source_warehouse_name?: string;
  stocktake_no?: string;

  // camelCase 别名（find/findBy 返回的格式，queryToObjects 自动转换）
  instanceId?: string;
  stockType?: string;
  businessId?: string;
  businessType?: string;
  businessCode?: string;
  cropId?: string;
  cropName?: string;
  varietyId?: string;
  varietyName?: string;
  currentQuantity?: number;
  frozenQuantity?: number;
  availableQuantity?: number;
  warehouseId?: string;
  warehouseName?: string;
  inboundDate?: string;
  sourceType?: string;
  productionPlanCode?: string;
  sourceInstanceId?: string;
  createTime?: string;
  updateTime?: string;
  cropCode?: string;
  plantingMode?: string;
  targetYield?: number;
  greenhouseName?: string;
  // 2026-07-14：详情/展示字段 camelCase 别名（与 snake_case 字段一一对应）
  supplierPhone?: string;
  giftFrom?: string;
  sourceWarehouseName?: string;
  stocktakeNo?: string;
}

/**
 * 库存 Repository 类
 */
export class InventoryStockRepository {
  /**
   * 获取当日 instanceId 最大 4 位序号
   * 2026-06-08 V2.1 重构：库存实例 ID 改用 4 位自增（INS/ISE/IPR + YYYYMMDD + NNNN），
   * 替代旧的 Math.random() 4 字符 base36 随机（碰撞风险 + 违反项目铁律"禁止 Math.random()"）。
   * 旧 16 字符 base36 数据保留不动（格式不变性）。
   * @param prefix INS/ISE/IPR
   * @param dateStr YYYYMMDD
   * @returns 当日最大 4 位序号（0 表示当日尚无记录）
   */
  async getInstanceIdMaxSerial(prefix: string, dateStr: string): Promise<number> {
    const db = getDatabase();
    // LIKE 模式: prefix(3) + '-' + 日期(8) + '-' + 4位序号 = 17 字符
    //   INS-20260608-0001
    //   ↑3  ↑1   ↑8     ↑1  ↑4   = 17
    // 2026-06-08 修复：GLOB '[0-9][0-9][0-9][0-9]' 严格过滤掉 base36 旧数据（修复前生成的 4 字符 base36），
    // 否则 base36 tail 字符串排序时字母 ASCII > 数字，max 永远取到 base36 行，parseInt 出 NaN → 0
    // → 永远 serial=1 → 永远撞 0001（连续 5 次冲突）
    const pattern = `${prefix}-${dateStr}-____`;
    const expectedLength = prefix.length + 1 + 8 + 1 + 4; // 17
    const stmt = db.prepare(`
      SELECT instance_id FROM inventory_stock
      WHERE instance_id LIKE ?
        AND LENGTH(instance_id) = ?
        AND SUBSTR(instance_id, -4) GLOB '[0-9][0-9][0-9][0-9]'
      ORDER BY SUBSTR(instance_id, -4) DESC LIMIT 1
    `);
    stmt.bind([pattern, expectedLength]);
    let maxSerial = 0;
    if (stmt.step()) {
      const row = stmt.getAsObject() as { instance_id: string };
      const tail = row.instance_id.slice(-4);
      const n = parseInt(tail, 10);
      maxSerial = isNaN(n) ? 0 : n;
    }
    stmt.free();
    return maxSerial;
  }

  /**
   * 获取当日 stockId（STK 主键）最大 4 位序号
   * 2026-07-07 V3.2 重构：库存主键 ID 改用 4 位自增 STK-YYYYMMDD-NNNN，
   * 替代旧的 Math.random() 随机（违反项目 [[code-generation-contract-rule]] 铁律"禁止 Math.random()"）。
   * 旧 STK-${Date.now()}-${random} 数据保留不动（格式不变性，由 db-migrations/migrateInventoryIdFormat.ts 迁移）。
   * @param dateStr YYYYMMDD
   * @returns 当日最大 4 位序号（0 表示当日尚无记录）
   */
  async getStockIdMaxSerial(dateStr: string): Promise<number> {
    const db = getDatabase();
    // STK-YYYYMMDD-NNNN = 17 字符（3 + 1 + 8 + 1 + 4）
    // 2026-07-07：GLOB '[0-9][0-9][0-9][0-9]' 严格过滤掉旧 random 数据（修复前生成的 STK-1780...），
    // 否则 random tail 数字排序时可能不一致，max 取错
    const pattern = `STK-${dateStr}-____`;
    const expectedLength = 3 + 1 + 8 + 1 + 4; // 17
    const stmt = db.prepare(`
      SELECT id FROM inventory_stock
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
   * 根据 stockId（主键）查询
   * 2026-07-07：用于 generateStockId 二次查重
   */
  async findByStockId(stockId: string): Promise<InventoryStock | null> {
    const db = getDatabase();
    const sql = `SELECT * FROM inventory_stock WHERE id = ?`;
    const items = queryToObjects<InventoryStock>(db, sql, [stockId]);
    return items.length > 0 ? items[0] : null;
  }

  /**
   * 创建库存记录
   */
  async create(data: Partial<InventoryStock>): Promise<InventoryStock> {
    const db = getDatabase();
    const newId = data.id || `STK-${Date.now()}`;
    const now = new Date().toISOString();
    // 2026-06-08 V2.1：instance_id 必传（service 层负责生成，4位自增格式），
    // 此处不再 random 兜底，避免与 generateInstanceId 重复生成
    const instanceId = data.instance_id;
    if (!instanceId) {
      throw new Error('instance_id 必传（请使用 generateInstanceId 生成 4 位自增 ID）');
    }

    db.run(`
      INSERT INTO inventory_stock (
        id, instance_id, stock_type, business_id, business_type, business_code,
        crop_id, crop_name, variety_id, variety_name,
        current_quantity, frozen_quantity, available_quantity, unit,
        warehouse_id, warehouse_name, inbound_date, source_type,
        production_plan_code, source_instance_id, status, version,
        crop_code, planting_mode, target_yield, grade, auditor, remarks, greenhouse_name,
        supplier_id, supplier_name, unit_price, total_amount, purchase_date,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      // V3 扩展字段（采收 → 库存完整字段对接）
      data.crop_code || null,
      data.planting_mode || null,
      data.target_yield || 0,
      data.grade || null,
      data.auditor || null,
      data.remarks || null,
      data.greenhouse_name || null,
      // 采购信息（外购入库财务字段）
      data.supplier_id || null,
      data.supplier_name || null,
      data.unit_price || 0,
      data.total_amount || 0,
      data.purchase_date || null,
      now,
      now
    ]);
    // 调试：打印 params 实际长度
    const params: unknown[] = [];  // 2026-06-29: 移除 params cast 后的死代码（之前误用 any[] cast）
    console.log('[InventoryStockRepository.create] params.length:', params.length);

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
    // T11（2026-07-08）：从 query 解构 status / sourceType 供下面 WHERE 条件使用
    const { stockType, warehouseId, cropName, status, sourceType, page = 1, limit = 50 } = query;

    // 2026-07-09：LEFT JOIN inventory_inbound_records 补 10 个专属字段
    //   （inventory_stock 表没有 consignor / giftFrom / sourceWarehouseName / stocktakeNo /
    //    supplierPhone / baseId / baseName / plantingMode / greenhouseName / cropForm）
    let sql = `
      SELECT s.*,
        ib.supplier_phone, ib.gift_from, ib.consignor, ib.source_warehouse_name, ib.stocktake_no,
        ib.base_id, ib.base_name, ib.planting_mode, ib.greenhouse_name, ib.crop_form,
        ib.source_code
      FROM inventory_stock s
      LEFT JOIN inventory_inbound_records ib
        ON ib.business_id = s.id AND ib.id = (
          SELECT id FROM inventory_inbound_records WHERE business_id = s.id ORDER BY create_time DESC LIMIT 1
        )
      WHERE 1=1
    `;
    const params: any[] = [];

    // 2026-06-24: 排除已调拨到种源管理的行（种源管理是内部专用库存，不与作物库存重叠）
    sql += ` AND s.status != 'transferred'`;

    if (stockType) {
      sql += ` AND s.stock_type = ?`;
      params.push(stockType);
    }

    if (warehouseId) {
      sql += ` AND s.warehouse_id = ?`;
      params.push(warehouseId);
    }

    if (cropName) {
      sql += ` AND s.crop_name LIKE ?`;
      params.push(`%${cropName}%`);
    }

    // T11（2026-07-08）：P0 过滤器 bug 修复 — SQL 层真正消费 status / sourceType
    if (status) {
      sql += ` AND s.status = ?`;
      params.push(status);
    }

    if (sourceType) {
      sql += ` AND s.source_type = ?`;
      params.push(sourceType);
    }

    // 获取总数（用独立 COUNT 简化 — JOIN 不影响 COUNT 计数）
    const countResult = queryToObjects<{ total: number }>(
      db,
      `SELECT COUNT(*) as total FROM inventory_stock WHERE 1=1 AND status != 'transferred'`,
      []
    );
    const total = countResult[0]?.total || 0;

    // 分页
    sql += ` ORDER BY s.create_time DESC`;
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

