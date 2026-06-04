/**
 * 库存服务（V3.0）
 * 所有方法直接操作 SQLite 库存中心表（inventory_stock / inventory_transaction）
 */

import { getDatabase, saveDatabase } from '../db';
import { inventoryStockRepository, InventoryStock } from '../repositories/inventory.repository';
import { inventoryTransactionRepository, InventoryTransaction } from '../repositories/inventory-tx.repository';
import { queryToObjects } from '../utils/queryHelper';

export interface Inventory {
  id: string;
  batch_code: string;
  crop_name: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  unit: string;
  status: string;
  harvest_record_id?: string;
  planting_id?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 入库 DTO
 */
export interface InboundDTO {
  stockType: string;
  businessId: string;
  businessType: string;
  businessCode: string;
  cropId: string;
  cropName: string;
  varietyId?: string;
  varietyName?: string;
  quantity: number;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  inboundDate?: string;
  sourceType?: string;
  sourceInstanceId?: string;
  productionPlanCode?: string;
  remarks?: string;
  operatorId?: string;
  operatorName?: string;
  // V3 扩展字段（采收入库对接：让"作物库存"页展示完整采收元数据）
  cropCode?: string;           // 11 位品种库编码
  plantingMode?: string;        // 种植模式
  targetYield?: number;         // 目标产量
  grade?: string;               // 品质等级 A/B/C
  auditor?: string;              // 审核人
  greenhouseName?: string;      // 采收区域
}

/**
 * 入库结果
 */
export interface InboundResult {
  success: boolean;
  instanceId?: string;
  transactionId?: string;
  currentQuantity?: number;
  availableQuantity?: number;
  error?: string;
}

// warehouseType → stockType 映射
const WAREHOUSE_TYPE_TO_STOCK_TYPE: Record<string, string> = {
  'seed_storage': 'seed',
  'seedling': 'seedling',
  'cold_storage': 'product',
  'normal': 'product',
};

export class InventoryService {
  async getInventory(params: {
    cropName?: string;
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Inventory[]; total: number }> {
    const db = getDatabase();
    const { cropName, warehouseId, status, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM inventory WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (cropName) {
      conditions.push('crop_name LIKE ?');
      queryParams.push(`%${cropName}%`);
    }
    if (warehouseId) {
      conditions.push('warehouse_id = ?');
      queryParams.push(warehouseId);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: Inventory[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Inventory);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM inventory WHERE 1=1${whereClause}`;
    const countStmt = db.prepare(countSql);
    countStmt.bind(queryParams);
    countStmt.step();
    const countResult = countStmt.getAsObject();
    countStmt.free();

    return {
      data: items,
      total: countResult.total as number,
    };
  }

  async getById(id: string): Promise<Inventory | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inventory WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Inventory;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(inventory: Partial<Inventory>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = inventory.id || `inv_${Date.now()}`;

    db.run(`
      INSERT INTO inventory (
        id, batch_code, crop_name, warehouse_id, warehouse_name,
        quantity, unit, status, harvest_record_id, planting_id, remarks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      inventory.batch_code || '',
      inventory.crop_name || '',
      inventory.warehouse_id || '',
      inventory.warehouse_name || '',
      inventory.quantity || 0,
      inventory.unit || '',
      inventory.status || 'in_stock',
      inventory.harvest_record_id || null,
      inventory.planting_id || null,
      inventory.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async updateQuantity(id: string, quantity: number): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run('UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ?', [quantity, now, id]);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM inventory WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }

  /**
   * 采收入库
   */
  async inbound(request: InboundDTO): Promise<InboundResult> {
    try {
      // 1. 校验仓库
      const db = getDatabase();
      const warehouseSql = `SELECT * FROM warehouses WHERE oid = ?`;
      const warehouses = queryToObjects<{ oid: string; warehouseType: string; name: string }>(db, warehouseSql, [request.warehouseId]);

      if (warehouses.length === 0) {
        return { success: false, error: '仓库不存在' };
      }

      const warehouse = warehouses[0];

      // 2. 校验仓库类型与 stockType 匹配
      const expectedStockType = WAREHOUSE_TYPE_TO_STOCK_TYPE[warehouse.warehouseType];
      if (!expectedStockType || expectedStockType !== request.stockType) {
        return {
          success: false,
          error: `仓库类型不匹配：期望 ${expectedStockType}，实际 ${warehouse.warehouseType}`
        };
      }

      // 3. 生成 instanceId
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = request.stockType === 'seed' ? 'INS'
        : request.stockType === 'seedling' ? 'ISE'
        : 'IPR';
      const instanceId = `${prefix}-${dateStr}-${String(Math.random().toString(36).slice(2, 6)).toUpperCase()}`;

      // 4. 创建库存记录
      const stock = await inventoryStockRepository.create({
        instance_id: instanceId,
        stock_type: request.stockType,
        business_id: request.businessId,
        business_type: request.businessType,
        business_code: request.businessCode,
        crop_id: request.cropId,
        crop_name: request.cropName,
        variety_id: request.varietyId,
        variety_name: request.varietyName,
        current_quantity: request.quantity,
        frozen_quantity: 0,
        available_quantity: request.quantity,
        unit: request.unit,
        warehouse_id: request.warehouseId,
        warehouse_name: request.warehouseName,
        inbound_date: request.inboundDate || now.toISOString().slice(0, 10),
        source_type: request.sourceType || 'self_produced',
        production_plan_code: request.productionPlanCode,
        source_instance_id: request.sourceInstanceId,
        status: 'in_stock',
        // V3 扩展字段（采收入库完整对接）
        crop_code: request.cropCode,
        planting_mode: request.plantingMode,
        target_yield: request.targetYield,
        grade: request.grade,
        auditor: request.auditor,
        remarks: request.remarks,
        greenhouse_name: request.greenhouseName,
      });

      // 5. 创建入库流水
      const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      await inventoryTransactionRepository.create({
        transaction_id: transactionId,
        instance_id: instanceId,
        stock_type: request.stockType,
        transaction_type: 'inbound',
        quantity: request.quantity,
        balance_before: 0,
        balance_after: request.quantity,
        business_id: request.businessId,
        business_type: request.businessType,
        business_code: request.businessCode,
        operator_id: request.operatorId,
        operator_name: request.operatorName || '系统管理员',
        operate_date: now.toISOString().slice(0, 10),
        remarks: request.remarks || '采收入库',
      });

      console.log('[InventoryService] 入库成功:', { instanceId, transactionId, quantity: request.quantity });

      return {
        success: true,
        instanceId,
        transactionId,
        currentQuantity: request.quantity,
        availableQuantity: request.quantity,
      };
    } catch (error) {
      console.error('[InventoryService] inbound 失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '入库失败'
      };
    }
  }

  /**
   * 获取库存详情（含流水）
   */
  async getDetail(instanceId: string): Promise<{
    stock: InventoryStock | null;
    transactions: InventoryTransaction[];
  }> {
    const stock = await inventoryStockRepository.findByInstanceId(instanceId);
    const transactions = await inventoryTransactionRepository.findByInstanceId(instanceId);
    return { stock, transactions };
  }

  /**
   * 获取库存列表（V3.0 新库存表）
   */
  async getList(query: {
    stockType?: string;
    warehouseId?: string;
    cropName?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: InventoryStock[]; total: number }> {
    return inventoryStockRepository.findAll(query);
  }

  // ============================================
  // V3.0 新增：出库 / 冻结 / 解冻 / 统计 / 追溯
  // ============================================

  /**
   * 出库操作（带乐观锁）
   */
  async outbound(request: {
    instanceId: string;
    businessId: string;
    businessType: string;
    businessCode?: string;
    quantity: number;
    operatorId?: string;
    operatorName?: string;
    remarks?: string;
  }): Promise<{
    success: boolean;
    instanceId?: string;
    currentQuantity?: number;
    availableQuantity?: number;
    transactionId?: string;
    error?: string;
  }> {
    try {
      if (!request.instanceId) return { success: false, error: '缺少 instanceId' };
      if (!request.quantity || request.quantity <= 0) {
        return { success: false, error: '出库数量必须大于 0' };
      }

      const stock = await inventoryStockRepository.findByInstanceId(request.instanceId);
      if (!stock) return { success: false, error: `库存实例 ${request.instanceId} 不存在` };

      const currentQty = stock.currentQuantity ?? 0;
      const frozenQty = stock.frozenQuantity ?? 0;
      const available = currentQty - frozenQty;

      if (available < request.quantity) {
        return {
          success: false,
          error: `可用数量不足：可用 ${available}，需要 ${request.quantity}`,
        };
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const newQty = currentQty - request.quantity;
      const version = stock.version ?? 1;

      // 1. 更新库存数量（带乐观锁）
      await inventoryStockRepository.updateQuantity(request.instanceId, newQty, version);

      // 2. 创建出库流水
      const transactionId = `TRX-OUT-${now.getTime()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      await inventoryTransactionRepository.create({
        transaction_id: transactionId,
        instance_id: request.instanceId,
        stock_type: stock.stockType,
        transaction_type: 'outbound',
        quantity: -request.quantity,
        balance_before: currentQty,
        balance_after: newQty,
        business_id: request.businessId,
        business_type: request.businessType,
        business_code: request.businessCode,
        operator_id: request.operatorId,
        operator_name: request.operatorName || '系统操作员',
        operate_date: nowIso.slice(0, 10),
        remarks: request.remarks || '出库',
      });

      // 3. 状态更新（出库后数量为 0 → empty）
      if (newQty === 0) {
        const db = getDatabase();
        db.run(`UPDATE inventory_stock SET status = 'empty', update_time = ? WHERE instance_id = ?`,
          [nowIso, request.instanceId]);
        saveDatabase();
      }

      return {
        success: true,
        instanceId: request.instanceId,
        currentQuantity: newQty,
        availableQuantity: newQty - frozenQty,
        transactionId,
      };
    } catch (error) {
      console.error('[InventoryService] outbound 失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '出库失败',
      };
    }
  }

  /**
   * 获取可用数量
   */
  async getAvailableQuantity(instanceId: string): Promise<{
    instanceId: string;
    currentQuantity: number;
    frozenQuantity: number;
    availableQuantity: number;
  } | null> {
    const stock = await inventoryStockRepository.findByInstanceId(instanceId);
    if (!stock) return null;
    const currentQty = stock.currentQuantity ?? 0;
    const frozenQty = stock.frozenQuantity ?? 0;
    return {
      instanceId,
      currentQuantity: currentQty,
      frozenQuantity: frozenQty,
      availableQuantity: Math.max(0, currentQty - frozenQty),
    };
  }

  /**
   * 获取库存统计
   */
  async getStats(filters?: { stockType?: string }): Promise<{
    totalInstances: number;
    totalQuantity: number;
    byStockType: Record<string, { count: number; quantity: number }>;
    lowStockCount: number;
    expiringCount: number;
  }> {
    return inventoryStockRepository.getStats(filters);
  }

  /**
   * 上游追溯（沿 source_instance_id 链向上）
   */
  async traceUpstream(instanceId: string, maxDepth: number = 10): Promise<Array<{
    instanceId: string;
    stockType: string;
    businessType: string;
    businessId: string;
    cropName: string;
    varietyName?: string;
    quantity: number;
    inboundDate: string;
    sourceInstanceId?: string;
  }>> {
    const results: any[] = [];
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: instanceId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const stock = await inventoryStockRepository.findByInstanceId(id);
      if (!stock) continue;

      results.push({
        instanceId: stock.instanceId,
        stockType: stock.stockType,
        businessType: stock.businessType,
        businessId: stock.businessId,
        cropName: stock.cropName,
        varietyName: stock.varietyName,
        quantity: stock.currentQuantity,
        inboundDate: stock.inboundDate,
        sourceInstanceId: stock.sourceInstanceId,
      });

      if (stock.sourceInstanceId && !visited.has(stock.sourceInstanceId)) {
        queue.push({ id: stock.sourceInstanceId, depth: depth + 1 });
      }
    }

    return results;
  }

  /**
   * 下游追溯（沿 source_instance_id 反向链）
   */
  async traceDownstream(instanceId: string, maxDepth: number = 10): Promise<Array<{
    instanceId: string;
    stockType: string;
    businessType: string;
    businessId: string;
    outboundQuantity: number;
    outboundDate: string;
  }>> {
    const results: any[] = [];
    const visited = new Set<string>();
    const queue: { id: string; depth: number }[] = [{ id: instanceId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      // 查找所有以当前 instance 为 source 的下游库存
      const children = await inventoryStockRepository.findBySourceInstanceId(id);
      for (const child of children) {
        // 找对应的入库流水作为出库日期
        const txs = await inventoryTransactionRepository.findByInstanceId(child.instance_id!);
        const inboundTx = txs.find(t => t.transaction_type === 'inbound');

        results.push({
          instanceId: child.instance_id,
          stockType: child.stock_type,
          businessType: child.business_type,
          businessId: child.business_id,
          outboundQuantity: child.current_quantity ?? 0,
          outboundDate: inboundTx?.operate_date ?? child.create_time ?? '',
        });

        if (child.instance_id && !visited.has(child.instance_id)) {
          queue.push({ id: child.instance_id, depth: depth + 1 });
        }
      }
    }

    return results;
  }

  /**
   * 按作物名称聚合查询
   */
  async aggregateByCrop(cropName?: string): Promise<{
    cropName: string;
    seed: InventoryStock[];
    seedling: InventoryStock[];
    product: InventoryStock[];
    total: number;
    totalQuantity: { seed: number; seedling: number; product: number };
  }> {
    const db = getDatabase();
    const params: any[] = [];
    let sql = `SELECT * FROM inventory_stock WHERE 1=1`;
    if (cropName) {
      sql += ` AND crop_name LIKE ?`;
      params.push(`%${cropName}%`);
    }

    const items = queryToObjects<InventoryStock>(db, sql, params);

    const seed = items.filter((i: any) => i.stock_type === 'seed');
    const seedling = items.filter((i: any) => i.stock_type === 'seedling');
    const product = items.filter((i: any) => i.stock_type === 'product');

    const sum = (arr: InventoryStock[]) => arr.reduce((s, i) => s + (i.current_quantity ?? 0), 0);

    return {
      cropName: cropName || '',
      seed,
      seedling,
      product,
      total: items.length,
      totalQuantity: { seed: sum(seed), seedling: sum(seedling), product: sum(product) },
    };
  }
}

export const inventoryService = new InventoryService();
