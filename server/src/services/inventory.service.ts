/**
 * 库存服务（V3.0）
 * 所有方法直接操作 SQLite 库存中心表（inventory_stock / inventory_transaction）
 */

import { randomUUID } from 'crypto';
import { getDatabase, saveDatabase } from '../db';
import { inventoryStockRepository, InventoryStock } from '../repositories/inventory.repository';
import { inventoryTransactionRepository, InventoryTransaction } from '../repositories/inventory-tx.repository';
import { inventoryInboundRepository } from '../repositories/inventoryInbound.repository';
import { queryToObjects } from '../utils/queryHelper';
import { formatLocalDateYYYYMMDD, formatLocalDateISO } from '../utils/dateUtil';

// ========== V2.1 编码生成（2026-06-08 重构：4 位自增，替代 Math.random） ==========
// 对齐项目 [[code-generation-contract-rule]] 铁律"禁止 Math.random()"+ 格式契约：
// 库存实例 ID:  ${prefix}-${YYYYMMDD}-${NNNN}  (17 字符)   例: INS-20260608-0001
// 流水 ID:      TRX-${YYYYMMDD}-${NNNN}         (17 字符)   例: TRX-20260608-0001
// 2026-07-07 V3.2 扩展：库存主键 ID + 入库记录 ID 也走 4 位自增
// 库存主键 ID:  STK-${YYYYMMDD}-${NNNN}        (17 字符)   例: STK-20260707-0001
// 入库记录 ID:  INB-${YYYYMMDD}-${NNNN}        (17 字符)   例: INB-20260707-0001
// 旧 Math.random() / Date.now() 数据保留不动 —— 格式不变性
// 与种源/育苗 14 字符 3 位 NNN 不同：库存/流水业务量更大，4 位 NNNN 容量更安全（日上限 9999）

const MAX_RETRY = 5;

export async function generateInstanceId(prefix: string, dateStr: string): Promise<string> {
  for (let i = 0; i < MAX_RETRY; i++) {
    const max = await inventoryStockRepository.getInstanceIdMaxSerial(prefix, dateStr);
    const serial = max + 1;
    const id = `${prefix}-${dateStr}-${String(serial).padStart(4, '0')}`;
    // 二次验证：避免同日并发时撞到旧 base36 数据（虽然 base36 不可能等于 NNNN，但保险起见查一次）
    const existing = await inventoryStockRepository.findByInstanceId(id);
    if (!existing) return id;
  }
  throw new Error(`生成 instanceId 失败：${prefix} ${dateStr} 连续 ${MAX_RETRY} 次序号冲突`);
}

export async function generateTransactionId(dateStr: string): Promise<string> {
  for (let i = 0; i < MAX_RETRY; i++) {
    const max = await inventoryTransactionRepository.getTransactionIdMaxSerial(dateStr);
    const serial = max + 1;
    // 流水不再二次查（UNIQUE 约束保护），省一次 IO（同日并发极端场景下 5 次重试内能解决）
    return `TRX-${dateStr}-${String(serial).padStart(4, '0')}`;
  }
  throw new Error(`生成 transactionId 失败：${dateStr} 连续 ${MAX_RETRY} 次序号冲突`);
}

/**
 * 2026-07-07 V3.2 新增：生成库存主键 ID
 * 格式：STK-${YYYYMMDD}-${NNNN}  (17 字符)
 * 例：STK-20260707-0001
 * 替代业务代码中违反 [[code-generation-contract-rule]] 铁律的
 * `STK-${Date.now()}-${Math.random()...}` 和
 * `STK-${tsSuffix}-${count}` 反模式
 */
export async function generateStockId(dateStr: string): Promise<string> {
  for (let i = 0; i < MAX_RETRY; i++) {
    const max = await inventoryStockRepository.getStockIdMaxSerial(dateStr);
    const serial = max + 1;
    const id = `STK-${dateStr}-${String(serial).padStart(4, '0')}`;
    // 二次查重：避免同日并发或旧 STK-1780... 数据残留导致的冲突
    const existing = await inventoryStockRepository.findByStockId(id);
    if (!existing) return id;
  }
  throw new Error(`生成 stockId 失败：${dateStr} 连续 ${MAX_RETRY} 次序号冲突`);
}

/**
 * 2026-07-07 V3.2 新增：生成入库记录主键 ID
 * 格式：INB-${YYYYMMDD}-${NNNN}  (17 字符)
 * 例：INB-20260707-0001
 * 替代业务代码中违反 [[code-generation-contract-rule]] 铁律的
 * `INB-${Date.now()}-${Math.random()...}` 和
 * `INB-${...}-${random}-${count}` 反模式
 */
export async function generateInboundRecordId(dateStr: string): Promise<string> {
  for (let i = 0; i < MAX_RETRY; i++) {
    const max = await inventoryInboundRepository.getInboundIdMaxSerial(dateStr);
    const serial = max + 1;
    const id = `INB-${dateStr}-${String(serial).padStart(4, '0')}`;
    // 二次查重：避免同日并发或旧 INB-... 数据残留导致的冲突
    const existing = await inventoryInboundRepository.findByRecordId(id);
    if (!existing) return id;
  }
  throw new Error(`生成 inboundRecordId 失败：${dateStr} 连续 ${MAX_RETRY} 次序号冲突`);
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
  // 采购信息（外购入库财务字段, 对齐种源管理）
  supplierId?: string;
  supplierName?: string;
  unitPrice?: number;
  totalAmount?: number;
  purchaseDate?: string;
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

// warehouseType → stockType 映射（inbound 内部使用）
// 2026-07-14：恢复——之前误判为死代码删除，inbound 路由内部 warehouseType 校验依赖此常量
const WAREHOUSE_TYPE_TO_STOCK_TYPE: Record<string, string> = {
  'seed_storage': 'seed',
  'seedling': 'seedling',
  'cold_storage': 'product',
  'normal': 'product',
};

export class InventoryService {
  /**
   * 采收入库
   */
  async inbound(request: InboundDTO): Promise<InboundResult> {
    // 变量用于回滚追踪
    let createdInstanceId: string | null = null;
    let createdTransactionId: string | null = null;

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

      // 3. 生成 instanceId（V2.1：4 位自增，替代 Math.random）
      const now = new Date();
      // 2026-06-09 修复：本地日期（不是 UTC），避免中国时区早上 0:00-8:00 显示昨天日期
      const dateStr = formatLocalDateYYYYMMDD(now);
      const prefix = request.stockType === 'seed' ? 'INS'
        : request.stockType === 'seedling' ? 'ISE'
        : 'IPR';
      const instanceId = await generateInstanceId(prefix, dateStr);

      // 4. 创建库存记录
      createdInstanceId = instanceId;
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
        inbound_date: request.inboundDate || formatLocalDateISO(now),
        source_type: request.sourceType || 'self_produced',
        production_plan_code: request.productionPlanCode,
        source_instance_id: request.sourceInstanceId,
        status: 'in_stock',
        crop_code: request.cropCode,
        planting_mode: request.plantingMode,
        target_yield: request.targetYield,
        grade: request.grade,
        auditor: request.auditor,
        remarks: request.remarks,
        greenhouse_name: request.greenhouseName,
        supplier_id: request.supplierId,
        supplier_name: request.supplierName,
        unit_price: request.unitPrice,
        total_amount: request.totalAmount,
        purchase_date: request.purchaseDate,
      });

      // 5. 创建入库流水
      const transactionId = await generateTransactionId(dateStr);
      createdTransactionId = transactionId;
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
        operate_date: formatLocalDateISO(now),
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
      // 回滚：清除步骤 4 创建的库存记录（如果步骤 5 失败但步骤 4 已写入）
      if (createdInstanceId) {
        try {
          const db = getDatabase();
          db.run('DELETE FROM inventory_stock WHERE instance_id = ?', [createdInstanceId]);
          db.run('DELETE FROM inventory_transaction WHERE instance_id = ?', [createdInstanceId]);
          console.log('[InventoryService] 已回滚库存记录:', createdInstanceId);
        } catch (rollbackErr) {
          console.error('[InventoryService] 回滚失败:', rollbackErr);
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : '入库失败'
      };
    }
  }

  /**
   * 获取库存详情（含流水）
   * 2026-07-09：JOIN inventory_inbound_records 取最新一条入库记录的 5 个来源专属字段
   *   （supplierPhone/giftFrom/consignor/sourceWarehouseName/stocktakeNo），
   *   因为 inventory_stock 表没有这 5 列（写在了 inventory_inbound_records 表）
   */
  async getDetail(instanceId: string): Promise<{
    stock: InventoryStock | null;
    transactions: InventoryTransaction[];
  }> {
    const stock = await inventoryStockRepository.findByInstanceId(instanceId);
    const transactions = await inventoryTransactionRepository.findByInstanceId(instanceId);

    // 补 5 个专属字段：取最新入库记录（business_id 与 stock.id 关联）
    if (stock && (stock as any).id) {
      try {
        const db = getDatabase();
        const stmt = db.prepare(`
          SELECT supplier_phone, gift_from, consignor, source_warehouse_name, stocktake_no
          FROM inventory_inbound_records
          WHERE business_id = ?
          ORDER BY create_time DESC LIMIT 1
        `);
        stmt.bind([(stock as any).id]);
        if (stmt.step()) {
          const row = stmt.getAsObject() as any;
          (stock as any).supplierPhone = row.supplier_phone || stock.supplierPhone || null;
          (stock as any).giftFrom = row.gift_from || stock.giftFrom || null;
          (stock as any).consignor = row.consignor || stock.consignor || null;
          (stock as any).sourceWarehouseName = row.source_warehouse_name || stock.sourceWarehouseName || null;
          (stock as any).stocktakeNo = row.stocktake_no || stock.stocktakeNo || null;
        }
        stmt.free();
      } catch (_) {
        // inventory_inbound_records 缺失或列缺失时，容错继续
      }
    }

    return { stock, transactions };
  }

  /**
   * 获取库存列表（V3.0 新库存表）
   */
  async getList(query: {
    stockType?: string;
    warehouseId?: string;
    cropName?: string;
    status?: string;       // T10 修复：透传 controller 的 status 过滤参数（T11 会在 repository 真正消费）
    sourceType?: string;   // T10 修复：透传 controller 的 sourceType 过滤参数（T11 会在 repository 真正消费）
    page?: number;
    limit?: number;
  }): Promise<{ data: InventoryStock[]; total: number }> {
    return inventoryStockRepository.findAll(query);
  }

  // ============================================
  // V3.0 新增：出库 / 冻结 / 解冻 / 统计 / 追溯
  // ============================================
  // 注：2026-06-04 V2.1 铁律改造后，outbound() 已迁移到 server/src/routes/inventoryTransactions.ts
  //      （V2.1 Store 写操作的唯一入口）。本文件不再包含出库实现。

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
   * Phase 13.1.5：补 depth + parentInstanceId 字段
   */
  async traceUpstream(instanceId: string, maxDepth: number = 10): Promise<Array<{
    instanceId: string;
    stockType: string;
    businessType: string;
    businessId: string;
    businessCode?: string;    // 2026-07-04：批次号（育苗编码/种植编码/种源编码）
    cropName: string;
    varietyName?: string;
    quantity: number;
    inboundDate: string;
    sourceInstanceId?: string;
    depth: number;
    parentInstanceId: string | null;
  }>> {
    const results: any[] = [];
    const visited = new Set<string>();
    const queue: { id: string; depth: number; parentId: string | null }[] = [
      { id: instanceId, depth: 0, parentId: null }
    ];

    while (queue.length > 0) {
      const { id, depth, parentId } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const stock = await inventoryStockRepository.findByInstanceId(id);
      if (stock) {
        // inventory_stock 节点：直接入结果
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
          depth,
          parentInstanceId: parentId,
        });
        if (stock.sourceInstanceId && !visited.has(stock.sourceInstanceId)) {
          queue.push({ id: stock.sourceInstanceId, depth: depth + 1, parentId: stock.instanceId ?? null });
        }
      } else {
        // 2026-07-04 修复：source_instance_id 可能指向 crop_instances 而非 inventory_stock
        // 当 inventory_stock 查不到时，回退查 crop_instances 继续往上追溯
        const db = getDatabase();
        const ciStmt = db.prepare('SELECT * FROM crop_instances WHERE id = ?');
        ciStmt.bind([id]);
        let ciRow: any = null;
        if (ciStmt.step()) ciRow = ciStmt.getAsObject();
        ciStmt.free();

        if (ciRow) {
          // crop_instance → 作为虚拟节点插入结果
          const bizTypeLabel = ciRow.business_type === 'planting' ? '种植'
            : ciRow.business_type === 'seedling' ? '育苗'
            : ciRow.business_type === 'seed_source' ? '种源'
            : ciRow.business_type;
          results.push({
            instanceId: ciRow.id,
            stockType: ciRow.business_type === 'planting' ? 'product'
                     : ciRow.business_type === 'seedling' ? 'seedling'
                     : ciRow.business_type === 'seed_source' ? 'seed'
                     : 'unknown',
            businessType: ciRow.business_type,
            businessId: ciRow.business_id,
            businessCode: ciRow.instance_code ? `${bizTypeLabel}批次: ${ciRow.instance_code}` : `来源: ${ciRow.business_id}`,
            cropName: ciRow.crop_name,
            varietyName: ciRow.crop_variety,
            quantity: ciRow.current_quantity ?? 0,
            inboundDate: ciRow.create_time ? ciRow.create_time.slice(0, 10) : '',
            sourceInstanceId: ciRow.source_instance_id,
            depth,
            parentInstanceId: parentId,
          });
          if (ciRow.source_instance_id && !visited.has(ciRow.source_instance_id)) {
            queue.push({ id: ciRow.source_instance_id, depth: depth + 1, parentId: ciRow.id ?? null });
          }
        }
      }
    }

    return results;
  }

  /**
   * 下游追溯（沿 source_instance_id 反向链）
   * Phase 13.1.4：修复 outboundQuantity 从 inventory_transaction.quantity 读取
   * Phase 13.1.5：补 depth + parentInstanceId 字段
   */
  async traceDownstream(instanceId: string, maxDepth: number = 10): Promise<Array<{
    instanceId: string;
    stockType: string;
    businessType: string;
    businessId: string;
    outboundQuantity: number;
    outboundDate: string;
    depth: number;            // Phase 13.1.5: BFS 深度
    parentInstanceId: string | null;  // Phase 13.1.5: 父节点
  }>> {
    const results: any[] = [];
    const visited = new Set<string>();
    const queue: { id: string; depth: number; parentId: string | null }[] = [
      { id: instanceId, depth: 0, parentId: null }
    ];

    while (queue.length > 0) {
      const { id, depth, parentId } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      // 查找所有以当前 instance 为 source 的下游库存
      const children = await inventoryStockRepository.findBySourceInstanceId(id);
      for (const child of children) {
        const txs = await inventoryTransactionRepository.findByInstanceId(child.instance_id!);
        const inboundTx = txs.find(t => t.transaction_type === 'inbound');
        const outboundTxs = txs.filter(t => t.transaction_type === 'outbound');
        const outboundQuantity = outboundTxs.reduce((sum, t) => sum + Math.abs(t.quantity ?? 0), 0);
        results.push({
          instanceId: child.instance_id,
          stockType: child.stock_type,
          businessType: child.business_type,
          businessId: child.business_id,
          outboundQuantity,
          outboundDate: inboundTx?.operate_date ?? child.create_time ?? '',
          depth: depth + 1,
          parentInstanceId: child.instance_id ? id : null,
        });
        if (child.instance_id && !visited.has(child.instance_id)) {
          queue.push({ id: child.instance_id, depth: depth + 1, parentId: id });
        }
      }

      // 2026-07-04 修复：下游也查 crop_instances（source_instance_id 可能指向 CI 而非 inventory_stock）
      const db = getDatabase();
      const ciChildren = db.prepare('SELECT * FROM crop_instances WHERE source_instance_id = ?');
      ciChildren.bind([id]);
      const ciChildRows: any[] = [];
      while (ciChildren.step()) ciChildRows.push(ciChildren.getAsObject());
      ciChildren.free();

      for (const ci of ciChildRows) {
        // 用 crop_instance.id 查 inventory_stock（回链到库存表）
        const stockChildren = await inventoryStockRepository.findBySourceInstanceId(ci.id);
        for (const sc of stockChildren) {
          const txs = await inventoryTransactionRepository.findByInstanceId(sc.instance_id!);
          const outboundTxs = txs.filter(t => t.transaction_type === 'outbound');
          const outboundQuantity = outboundTxs.reduce((sum, t) => sum + Math.abs(t.quantity ?? 0), 0);
          results.push({
            instanceId: sc.instance_id,
            stockType: sc.stock_type,
            businessType: sc.business_type,
            businessId: sc.business_id,
            outboundQuantity,
            outboundDate: sc.create_time ? sc.create_time.slice(0, 10) : '',
            depth: depth + 1,
            parentInstanceId: id,
          });
          if (sc.instance_id && !visited.has(sc.instance_id)) {
            queue.push({ id: sc.instance_id, depth: depth + 1, parentId: id });
          }
        }
      }

      // 2026-07-04：出库流水作为下游叶子节点（销售/消耗/领用等不会创建新 stock，但用户需要看到去向）
      // 注意：findByInstanceId 返回 camelCase（mapToCamelCase 转换），不要用 snake_case
      if (depth === 0) {
        const outboundTxs = await inventoryTransactionRepository.findByInstanceId(id);
        const outbounds = outboundTxs.filter((t: any) => t.transactionType === 'outbound');
        for (const tx of outbounds) {
          results.push({
            instanceId: `TX-${(tx as any).id}`,
            stockType: 'outbound',
            businessType: (tx as any).businessType || 'outbound',
            businessId: (tx as any).businessId || '',
            outboundQuantity: Math.abs((tx as any).quantity ?? 0),
            outboundDate: (tx as any).operateDate || '',
            depth: depth + 1,
            parentInstanceId: id,
          });
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

// ============================================================
// V2 改造: 库存入库多来源 (任务 8: Phase 2 业务逻辑)
// 业务边界: 实际 2 种有数据 (harvest/circulation), 2 种路由代码预留 (seedling/seed)
// ============================================================
import { z } from 'zod'

/**
 * 库存入库多来源 - 输入校验
 * - stockType: 库存形态 (product/residue 有数据, seedling/seed 仅预留)
 * - businessType: 关联业务类型 (harvest/circulation 有数据, seedling/seed 预留)
 */
export const InboundFromSourceInputSchema = z.object({
  stockType: z.enum(['seed', 'seedling', 'product', 'residue']),
  businessType: z.enum(['harvest', 'seedling', 'seed', 'circulation']),
  businessId: z.string().min(1, { message: '业务 ID 必填' }),
  quantity: z.number().positive({ message: '数量必须 > 0' }),
  unit: z.string().min(1, { message: '单位必填' }),
  warehouseId: z.string().min(1, { message: '仓库 ID 必填' }),
})

export type InboundFromSourceInput = z.infer<typeof InboundFromSourceInputSchema>

/**
 * 库存入库 (复用 inventory_stock 三件套) — 仅测试用
 * - 实际有数据: businessType='harvest' (采收入库) | 'circulation' (回流后入库存)
 * - 路由代码保留: businessType='seedling' | 'seed' (本期无调用方, 扩展预留)
 * - 生产路径走 inventoryInboundFromSource.service.ts（使用 generateStockId 等 4 位自增 ID）
 * - 2026-07-14：Math.random → crypto.randomUUID（代码生成契约铁律合规，此函数仅测试调用故不用 4 位自增）
 */
export function inboundFromSource(rawInput: unknown): { stockId: string } {
  const input = InboundFromSourceInputSchema.parse(rawInput)
  const db = getDatabase()
  const stockId = `STK-${randomUUID().slice(0, 8)}`
  const instanceId = `INST-${randomUUID().slice(0, 8)}`
  db.run(`
    INSERT INTO inventory_stock
    (id, instance_id, stock_type, business_id, business_type, current_quantity, available_quantity, unit, warehouse_id, status, create_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now','localtime'))
  `, [stockId, instanceId, input.stockType, input.businessId, input.businessType, input.quantity, input.quantity, input.unit, input.warehouseId])
  saveDatabase()
  return { stockId }
}

/**
 * 库存详情"来源追溯" - 按 business_type 路由到对应详情页
 * 返回 detailUrl 前端用于 navigate()
 */
const DETAIL_URL_MAP: Record<string, string> = {
  harvest: '/farm/harvest/',
  seedling: '/farm/seedling/',
  seed: '/farm/seed-source/',
  circulation: '/farm/circulation/',
}

export function traceInventorySource(stockId: string): { businessType: string; businessId: string; detailUrl: string } {
  const db = getDatabase()
  const stock = db.prepare(`SELECT * FROM inventory_stock WHERE id = ?`).get([stockId]) as any
  if (!stock) throw new Error('库存记录不存在')
  const urlPrefix = DETAIL_URL_MAP[stock.business_type]
  if (!urlPrefix) {
    throw new Error(`未实现的业务类型: ${stock.business_type} (暂不提供追溯)`)
  }
  return {
    businessType: stock.business_type,
    businessId: stock.business_id,
    detailUrl: `${urlPrefix}${stock.business_id}`,
  }
}
