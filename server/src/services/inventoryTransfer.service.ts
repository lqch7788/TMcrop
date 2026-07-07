/**
 * 库存调拨入种源 Service (2026-06-24)
 *
 * 业务场景：从作物库存多选 seed/seedling/product 三种 stock_type 已入库记录，
 *           按移动语义（扣减原库存 current_quantity）调入种源管理。
 *
 * 5 步事务 + 反序回滚：
 *   1. 锁定并读取原 inventory_stock（SELECT）
 *   2. 扣减原库存 current_quantity（乐观锁 WHERE current_quantity >= ?）
 *   3. 写 transfer_out inventory_transaction 流水
 *   4. 生成 ZZ code + INSERT seed_sources（含 14 个 original_* 全量元数据）
 *   5. INSERT crop_instances + INSERT 新 inventory_stock（stock_type='seed'）+ INSERT transfer_in 流水
 *
 * 业务铁律：
 * - 移动语义：原库存 current_quantity 必须扣减（与 transfer_out 配套）
 * - 全量元数据：14 个 original_* / transferred_from_* 字段必须填充（前端详情追溯用）
 * - 原子性：任一失败 ROLLBACK 全部已写入记录 + 恢复原库存
 * - 跨模块契约：seed_sources.transferred_from_stock_id → inventory_stock.id（外键）
 */

import { getDatabase, saveDatabase } from '../db';
import { seedSourceService } from './seedSource.service';
import { generateInstanceId, generateStockId, generateInboundRecordId } from './inventory.service';

// ============ 类型定义 ============

export type TransferStockType = 'seed' | 'seedling' | 'product';

/**
 * 根据源库存 stock_type 映射到 seed_sources.source_type（调拨入种源时使用）
 * - seed → seed（种子）
 * - seedling → seedling（种苗/实生苗）
 * - product → other（产品/果实不属于典型种源，归入"其他"）
 * 2026-06-25 修复：之前 service 硬编码 source_type='transfer'，导致种源列表"种源类型"列
 *   无法反映原库存类型（seed/seedling/product）。调拨后种源页面应正确显示原库存类型。
 */
function mapStockTypeToSeedSourceType(stockType: string): string {
  switch (stockType) {
    case 'seed': return 'seed';
    case 'seedling': return 'seedling';
    case 'product': return 'other';
    default: return 'other';
  }
}

export interface TransferInput {
  /** inventory_stock.id（生产环境为 TEXT，测试可为字符串） */
  sourceStockId: string | number;
  /** 调拨数量（正整数） */
  transferQuantity: number;
  /** 调拨单位（必须与原库存 unit 一致） */
  unit: string;
}

export interface TransferResult {
  newSeedSourceId: string;
  newSeedSourceCode: string;
  newInventoryStockId: string;
  transferOutTxId: string;
  transferInTxId: string;
}

export interface TransferableSourceRow {
  id: string;
  instanceId: string;
  stockType: TransferStockType;
  businessType: string;
  businessCode: string;
  cropId: string | null;
  cropName: string;
  varietyId: string | null;
  varietyName: string | null;
  currentQuantity: number;
  availableQuantity: number;
  unit: string;
  inboundDate: string;
  sourceModule: string | null;
  sourceId: string | null;
  sourceType: string | null;
  unitPrice: number;
  supplierId: string | null;
  supplierName: string | null;
  productionPlanCode: string | null;
  // harvestRecordId: 生产 inventory_stock 无此列（仅 seed_sources 有 original_harvest_record_id）
  warehouseId: string | null;
  warehouseName: string | null;
}

// ============ 业务错误 ============

export class InventoryTransferBusinessError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = 'InventoryTransferBusinessError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const InventoryTransferErrorCode = {
  EMPTY_ITEMS: 'INV_TRANSFER_EMPTY_ITEMS',
  BATCH_TOO_LARGE: 'INV_TRANSFER_BATCH_TOO_LARGE',
  INVALID_QUANTITY: 'INV_TRANSFER_INVALID_QUANTITY',
  STOCK_NOT_FOUND: 'INV_TRANSFER_STOCK_NOT_FOUND',
  STOCK_NOT_AVAILABLE: 'INV_TRANSFER_STOCK_NOT_AVAILABLE',
  INSUFFICIENT_QUANTITY: 'INV_TRANSFER_INSUFFICIENT_QUANTITY',
  UNIT_MISMATCH: 'INV_TRANSFER_UNIT_MISMATCH',
  CODE_GENERATION_FAILED: 'INV_TRANSFER_CODE_GEN_FAILED',
} as const;

// ============ 列出可调拨库存 ============

/**
 * 列出可调拨到种源的库存记录
 * - 默认 stock_type ∈ {seed, seedling, product}（3 种）
 * - 排除 current_quantity = 0 的耗尽行
 * - 排除软删除记录
 * - P2-8 修复：支持 limit/offset 分页（默认 500 条，仍支持大批量场景）
 */
export async function listTransferableSources(filters: {
  stockType?: TransferStockType[];
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  /** 2026-06-26 修复：按作物名过滤（追加到现有种源模式 — 只列同作物的库存） */
  cropName?: string;
  /** 2026-06-26 修复：按作物品种名过滤（追加模式 — 与 cropName 组合精确定位） */
  cropVariety?: string;
}): Promise<TransferableSourceRow[]> {
  const db = getDatabase();

  const stockTypeFilter = filters.stockType && filters.stockType.length > 0
    ? filters.stockType
    : ['seed', 'seedling', 'product'];

  const placeholders = stockTypeFilter.map(() => '?').join(',');
  const params: any[] = [...stockTypeFilter];

  let sql = `
    SELECT
      ist.id, ist.instance_id, ist.stock_type, ist.business_type, ist.business_code,
      ist.crop_id, ist.crop_name, ist.variety_id, ist.variety_name,
      ist.current_quantity, ist.available_quantity, ist.unit,
      ist.inbound_date, ist.source_module, ist.source_id, ist.source_type,
      ist.unit_price, ist.supplier_id, ist.supplier_name,
      ist.production_plan_code,
      ist.warehouse_id, ist.warehouse_name,
      ist.product_form  -- 2026-06-30 Bug 13：列表展示形态 + 调拨入种源时自动复制形态
    FROM inventory_stock ist
    WHERE ist.stock_type IN (${placeholders})
      AND ist.current_quantity > 0
  `;
  // 注意：生产 inventory_stock 表没有 deleted_at 列（2026-06-24 排查确认），
  //       软删除逻辑由其他表维护，这里不过滤 deleted_at

  // 2026-06-26 修复：按作物名 + 品种名过滤（追加模式 — 仅显示同作物的库存）
  // inventory_stock 表无 crop_code 列，用 crop_name + variety_name 组合定位
  if (filters.cropName) {
    sql += ' AND ist.crop_name = ?';
    params.push(filters.cropName);
  }
  if (filters.cropVariety) {
    sql += ' AND (ist.variety_name = ? OR ist.variety_name IS NULL)';
    params.push(filters.cropVariety);
  }

  if (filters.keyword) {
    // 搜索覆盖：作物名、品种名、库存编号、作物编码、供应商、生产计划、采收单号
    // 解决用户场景：输入「品种名」在 variety_name 字段找不到（生产数据可能存到 supplier_name 或 crop_code）
    sql += ` AND (
      ist.crop_name LIKE ? OR
      ist.variety_name LIKE ? OR
      ist.crop_code LIKE ? OR
      ist.instance_id LIKE ? OR
      COALESCE(ist.supplier_name, '') LIKE ? OR
      COALESCE(ist.production_plan_code, '') LIKE ? OR
      COALESCE(ist.business_code, '') LIKE ?
    )`;
    const kw = `%${filters.keyword}%`;
    params.push(kw, kw, kw, kw, kw, kw, kw);
  }
  if (filters.dateFrom) {
    sql += ' AND ist.inbound_date >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    sql += ' AND ist.inbound_date <= ?';
    params.push(filters.dateTo);
  }

  sql += ' ORDER BY ist.inbound_date DESC, ist.id DESC';

  // P2-8：分页支持（默认 500，最大 1000 防止 SQL 慢）
  const limit = Math.min(Math.max(filters.limit ?? 500, 1), 1000);
  const offset = Math.max(filters.offset ?? 0, 0);
  sql += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = db.exec(sql, params);
  if (!result || result.length === 0) return [];

  const { columns, values } = result[0];
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return {
      id: obj.id,
      instanceId: obj.instance_id,
      stockType: obj.stock_type,
      businessType: obj.business_type,
      businessCode: obj.business_code,
      cropId: obj.crop_id,
      cropName: obj.crop_name,
      varietyId: obj.variety_id,
      varietyName: obj.variety_name,
      currentQuantity: Number(obj.current_quantity || 0),
      availableQuantity: Number(obj.available_quantity || 0),
      unit: obj.unit,
      inboundDate: obj.inbound_date,
      sourceModule: obj.source_module,
      sourceId: obj.source_id,
      sourceType: obj.source_type,
      unitPrice: Number(obj.unit_price || 0),
      supplierId: obj.supplier_id,
      supplierName: obj.supplier_name,
      productionPlanCode: obj.production_plan_code,
      // 2026-06-30 Bug 13：调拨面板列表展示形态字段（前端 UI 显示 + 调拨时自动复制到 seed_sources.seed_form）
      productForm: obj.product_form || '',
      // harvest_record_id 字段不在生产 inventory_stock schema 中，移除引用
      warehouseId: obj.warehouse_id,
      warehouseName: obj.warehouse_name,
    } as TransferableSourceRow;
  });
}

// ============ 核心调拨事务 ============

/**
 * 执行库存调拨入种源（原子事务）
 * - 校验参数
 * - 对每条 item：扣减原库存 + 写 transfer_out + 写 seed_sources + 写 crop_instances + 写新 inventory_stock + 写 transfer_in
 * - 任一失败 ROLLBACK 全部 + 恢复原库存
 */
export async function executeTransferToSource(
  items: TransferInput[],
  operator: { id?: string; name: string } = { name: 'system' }
): Promise<TransferResult[]> {
  // 参数校验
  if (!items || items.length === 0) {
    throw new InventoryTransferBusinessError(
      InventoryTransferErrorCode.EMPTY_ITEMS,
      '至少需要 1 条调拨明细',
    );
  }
  if (items.length > 100) {
    throw new InventoryTransferBusinessError(
      InventoryTransferErrorCode.BATCH_TOO_LARGE,
      `批量调拨单次最多 100 条，当前 ${items.length} 条`,
    );
  }
  for (const item of items) {
    if (!Number.isInteger(item.transferQuantity) || item.transferQuantity <= 0) {
      throw new InventoryTransferBusinessError(
        InventoryTransferErrorCode.INVALID_QUANTITY,
        `调拨数量必须为正整数: stockId=${item.sourceStockId}, qty=${item.transferQuantity}`,
      );
    }
    if (!item.unit) {
      throw new InventoryTransferBusinessError(
        InventoryTransferErrorCode.UNIT_MISMATCH,
        `调拨单位必填: stockId=${item.sourceStockId}`,
      );
    }
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  const nowDate = new Date();
  const dateStr = `${nowDate.getFullYear()}${String(nowDate.getMonth() + 1).padStart(2, '0')}${String(nowDate.getDate()).padStart(2, '0')}`;

  // 已写入记录追踪（用于回滚）
  const writtenStockIds: Array<string | number> = [];                // 原 inventory_stock.id（已扣减）
  const writtenSeedSourceIds: string[] = [];           // 新 seed_sources.id
  const writtenCropInstanceIds: string[] = [];         // 新 crop_instances.id
  const writtenNewInventoryStockIds: string[] = [];    // 新 inventory_stock.id
  const writtenTxIds: string[] = [];                   // inventory_transaction.id
  // 2026-07-06 Bug 16 修复：调拨入种源时补写 inventory_inbound_records，
  // 让 listReturnableInboundRecords（种源退库前置查询）能查到此流水
  // 不写则退库弹窗永远报「该种源没有可退的调拨入库流水（或已全部退完）」
  const writtenInboundRecordIds: string[] = [];        // 新 inventory_inbound_records.id
  // 原始库存数量快照（用于精确回滚）
  const originalQuantities: Array<{ id: string | number; currentQty: number; availableQty: number; unit: string }> = [];

  try {
    const results: TransferResult[] = [];

    for (const item of items) {
      // === 步骤 1：锁定并读取原库存 ===
      const selectStmt = db.prepare('SELECT * FROM inventory_stock WHERE id = ?');
      selectStmt.bind([item.sourceStockId]);
      let sourceStock: any = null;
      if (selectStmt.step()) {
        sourceStock = selectStmt.getAsObject();
      }
      selectStmt.free();

      if (!sourceStock || Object.keys(sourceStock).length === 0) {
        throw new InventoryTransferBusinessError(
          InventoryTransferErrorCode.STOCK_NOT_FOUND,
          `库存记录不存在: id=${item.sourceStockId}`,
          404,
        );
      }

      const sourceCurrentQty = Number(sourceStock.current_quantity || 0);
      const sourceAvailableQty = Number(sourceStock.available_quantity || 0);
      const sourceUnit = sourceStock.unit;
      const sourceStatus = sourceStock.status;

      // 业务校验
      if (sourceStatus === 'depleted' || sourceCurrentQty <= 0) {
        throw new InventoryTransferBusinessError(
          InventoryTransferErrorCode.STOCK_NOT_AVAILABLE,
          `库存已耗尽: ${sourceStock.instance_id}`,
        );
      }
      if (sourceCurrentQty < item.transferQuantity) {
        throw new InventoryTransferBusinessError(
          InventoryTransferErrorCode.INSUFFICIENT_QUANTITY,
          `可用数量不足: ${sourceStock.instance_id} 当前 ${sourceCurrentQty}${sourceUnit}，需调拨 ${item.transferQuantity}${item.unit}`,
        );
      }
      if (sourceUnit !== item.unit) {
        throw new InventoryTransferBusinessError(
          InventoryTransferErrorCode.UNIT_MISMATCH,
          `单位不一致: 库存 ${sourceStock.instance_id} 是 ${sourceUnit}，调拨单位是 ${item.unit}`,
        );
      }

      // 记录原始数量（精确回滚用）
      originalQuantities.push({
        id: item.sourceStockId,
        currentQty: sourceCurrentQty,
        availableQty: sourceAvailableQty,
        unit: sourceUnit,
      });

      // === 步骤 2：扣减原库存（乐观锁 WHERE current_quantity >= ?） ===
      // 2026-06-24 修正: 调拨只减少源行 qty，源行仍保留在作物库存列表（用户语义：扣减而非消失）。
      // 只对 qty 归零的行才标记 'depleted'，其它情况保留原 status（一般是 'in_stock'）。
      const newSourceQty = sourceCurrentQty - item.transferQuantity;
      const newAvailableQty = Math.max(0, sourceAvailableQty - item.transferQuantity);
      const newSourceStatus = newSourceQty === 0 ? 'depleted' : sourceStatus;

      const updateStmt = db.prepare(
        `UPDATE inventory_stock
         SET current_quantity = ?, available_quantity = ?, status = ?, update_time = ?
         WHERE id = ? AND current_quantity >= ?`
      );
      updateStmt.bind([
        newSourceQty, newAvailableQty, newSourceStatus, now,
        item.sourceStockId, item.transferQuantity,
      ]);
      updateStmt.step();
      updateStmt.free();
      writtenStockIds.push(item.sourceStockId);

      // === 步骤 3：写 transfer_out 流水 ===
      const outTxId = `TXN-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}-${writtenTxIds.length}`;
      const outTransactionId = `TXID-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
      db.run(
        `INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, 'transfer_out', ?, ?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?)`,
        [
          outTxId, outTransactionId, sourceStock.instance_id, sourceStock.stock_type,
          item.transferQuantity, sourceCurrentQty, newSourceQty,
          String(item.sourceStockId), sourceStock.instance_id,
          operator.id || '', operator.name, now.slice(0, 10),
          `调拨到种源: ${sourceStock.instance_id} ${item.transferQuantity}${sourceUnit}`,
          now,
        ]
      );
      writtenTxIds.push(outTxId);

      // === 步骤 4：生成 ZZ code + 写 seed_sources（14 个 original_* 字段） ===
      const newCode = await seedSourceService.generateCode(dateStr);
      if (!newCode) {
        throw new InventoryTransferBusinessError(
          InventoryTransferErrorCode.CODE_GENERATION_FAILED,
          `种源编码生成失败（重试耗尽），日期: ${dateStr}`,
        );
      }

      const newSeedSourceId = `SS${Date.now()}${String(writtenSeedSourceIds.length).padStart(2, '0')}`;
      // 2026-06-30 Bug 13：调拨入种源时自动从源库存 product_form 复制形态
      // （不暴露给前端 UI 简化 — 调拨形态 ≈ 源库存形态 = 入库时定的形态，传递是有意义的）
      const transferSeedForm = sourceStock.product_form || null;
      db.run(
        `INSERT INTO seed_sources (
          id, source_code, source_name, source_type, source_origin,
          production_plan_code, crop_category, type_name, variety_name,
          crop_name, crop_variety, crop_code,
          supplier_id, supplier_name, quantity, unit,
          purchase_date, purchase_price, total_amount,
          used_quantity, remaining_quantity,
          remarks, create_by,
          propagation_type,
          transferred_from_stock_id, transferred_from_business_type, transferred_from_business_id,
          original_inbound_date, original_source_module, original_source_id,
          original_harvest_record_id,
          original_crop_id, original_crop_name,
          original_variety_id, original_variety_name,
          original_unit, original_unit_price,
          original_supplier_id, original_supplier_name,
          original_production_plan_code,
          seed_form,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newSeedSourceId, newCode, `${sourceStock.crop_name || ''}（调拨）`, mapStockTypeToSeedSourceType(sourceStock.stock_type), 'inventory_transfer',
          sourceStock.production_plan_code || '', '', '', sourceStock.variety_name || '',
          sourceStock.crop_name || '', sourceStock.variety_name || '', sourceStock.crop_code || '',
          sourceStock.supplier_id || '', sourceStock.supplier_name || '',
          item.transferQuantity, sourceUnit,
          sourceStock.inbound_date || '', sourceStock.unit_price || 0, (sourceStock.unit_price || 0) * item.transferQuantity,
          0, item.transferQuantity,
          `从库存 ${sourceStock.instance_id} 调拨入种源`, operator.name,
          'transfer_from_inventory',
          item.sourceStockId, sourceStock.business_type, sourceStock.business_id,
          sourceStock.inbound_date || '', sourceStock.source_module, sourceStock.source_id,
          sourceStock.harvest_record_id,
          sourceStock.crop_id, sourceStock.crop_name,
          sourceStock.variety_id, sourceStock.variety_name,
          sourceUnit, sourceStock.unit_price || 0,
          sourceStock.supplier_id, sourceStock.supplier_name,
          sourceStock.production_plan_code,
          transferSeedForm,
          now, now,
        ]
      );
      writtenSeedSourceIds.push(newSeedSourceId);

      // === 步骤 5a：写 crop_instances ===
      const newCropInstanceId = `CI${Date.now()}${String(writtenCropInstanceIds.length).padStart(2, '0')}`;
      db.run(
        `INSERT INTO crop_instances (
          id, instance_code, business_id, business_type, crop_name,
          initial_quantity, current_quantity, status,
          create_time, update_time
        ) VALUES (?, ?, ?, 'seed_source', ?, ?, ?, 'in_stock', ?, ?)`,
        [
          newCropInstanceId, newCode, newSeedSourceId,
          sourceStock.crop_name || '',
          item.transferQuantity, item.transferQuantity,
          now, now,
        ]
      );
      writtenCropInstanceIds.push(newCropInstanceId);

      // === 步骤 5b：写新 inventory_stock（stock_type='seed'）+ transfer_in 流水 ===
      const newInstanceId = await generateInstanceId('INS', dateStr);
      // 2026-07-07 V3.2: 库存主键统一走 generateStockId，4 位自增替代 Math.random
      const newStockId = await generateStockId(dateStr);

      db.run(
        `INSERT INTO inventory_stock (
          id, instance_id, stock_type, business_id, business_type, business_code,
          source_type, source_instance_id,
          crop_code, crop_name, variety_id, variety_name,
          current_quantity, available_quantity, frozen_quantity, unit,
          warehouse_id, warehouse_name, inbound_date,
          unit_price, status, version,
          create_time, update_time
        ) VALUES (?, ?, ?, ?, 'inventory_transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transferred', 1, ?, ?)`,
        [
          newStockId, newInstanceId, sourceStock.stock_type, newSeedSourceId, newCode,
          'inventory_transfer', newCropInstanceId,
          sourceStock.crop_code || '', sourceStock.crop_name, sourceStock.variety_id, sourceStock.variety_name,
          item.transferQuantity, item.transferQuantity, 0, sourceUnit,
          sourceStock.warehouse_id, sourceStock.warehouse_name, sourceStock.inbound_date,
          sourceStock.unit_price || 0,
          now, now,
        ]
      );
      writtenNewInventoryStockIds.push(newStockId);

      // === 步骤 5c：写 inventory_inbound_records（退库前置流水）===
      // 2026-07-06 Bug 16：调拨入种源必须写一条 source_module='inventory' 的入库记录，
      // 否则 listReturnableInboundRecords 查不到 → 退库弹窗永远报「没有可退的调拨入库流水」
      // source_id 指向新库存 STK ID（不是原库存），source_code 指向新种源批号
      // 2026-07-07 V3.2: 入库记录主键统一走 generateInboundRecordId，4 位自增替代 Math.random
      const inbRecordId = await generateInboundRecordId(dateStr);
      db.run(
        `INSERT INTO inventory_inbound_records (
          id, record_type, record_date, source_module, source_id, source_code,
          stock_type, source_type, warehouse_id, warehouse_name,
          crop_id, crop_code, crop_name, variety_name,
          quantity, unit, unit_price, total_amount, quality_grade,
          supplier_id, supplier_name, production_plan_code,
          business_id, notes, operator_name, create_by, create_time, update_time
        ) VALUES (?, 'inbound', ?, 'inventory', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inbRecordId, now.slice(0, 10),
          newStockId, newCode,
          sourceStock.stock_type, sourceStock.source_type || 'inventory_transfer',
          sourceStock.warehouse_id || null, sourceStock.warehouse_name || null,
          sourceStock.crop_id || null, sourceStock.crop_code || null, sourceStock.crop_name, sourceStock.variety_name || null,
          item.transferQuantity, sourceUnit,
          sourceStock.unit_price || 0, (sourceStock.unit_price || 0) * item.transferQuantity,
          null,
          sourceStock.supplier_id || null, sourceStock.supplier_name || null,
          sourceStock.production_plan_code || null,
          newSeedSourceId,
          `从库存 ${sourceStock.instance_id} 调拨入种源 ${newCode}`,
          operator.name, operator.name, now, now,
        ]
      );
      writtenInboundRecordIds.push(inbRecordId);

      const inTxId = `TXN-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}-${writtenTxIds.length}`;
      const inTransactionId = `TXID-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
      db.run(
        `INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, 'transfer_in', ?, 0, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?)`,
        [
          inTxId, inTransactionId, newInstanceId, sourceStock.stock_type,
          item.transferQuantity, item.transferQuantity,
          newSeedSourceId, newCode,
          operator.id || '', operator.name, now.slice(0, 10),
          `从库存 ${sourceStock.instance_id} 调拨入种源 ${newCode}`,
          now,
        ]
      );
      writtenTxIds.push(inTxId);

      results.push({
        newSeedSourceId,
        newSeedSourceCode: newCode,
        newInventoryStockId: newStockId,
        transferOutTxId: outTxId,
        transferInTxId: inTxId,
      });
    }

    // 全部成功 — 持久化
    saveDatabase();
    return results;
  } catch (err) {
    console.error('[executeTransferToSource] failed, rolling back:', err);
    // === 反序回滚：清理所有已写入记录 + 恢复原库存 ===
    let rollbackFailed = false;
    let rollbackError: unknown = null;
    try {
      // P2-9 修复：调用 helper 函数（提升可维护性）
      rollbackFailed = rollbackTransfer(
        db,
        writtenTxIds,
        writtenNewInventoryStockIds,
        writtenCropInstanceIds,
        writtenSeedSourceIds,
        originalQuantities,
        writtenInboundRecordIds,
        now,
      );
    } catch (e) {
      rollbackFailed = true;
      rollbackError = e;
      console.error('[executeTransferToSource] rollback error:', e);
    }

    // P1-5 修复：rollback 失败时附加告警信息（不能仅 console.error 而让用户以为已成功）
    if (rollbackFailed) {
      const rollbackMsg = rollbackError instanceof Error
        ? rollbackError.message
        : '未知回滚错误';
      // 注意：ES2020 target 不支持 Error constructor 的 { cause } 选项，改为属性赋值
      const wrapped: Error & { cause?: unknown; code?: string; httpStatus?: number } = new Error(
        `${err instanceof Error ? err.message : '调拨失败'}（且数据库回滚失败：${rollbackMsg}。请立即联系管理员排查 DB 状态！）`
      );
      wrapped.cause = err;
      // 保留原 code（如果有）
      if (err instanceof InventoryTransferBusinessError) {
        wrapped.code = err.code;
        wrapped.httpStatus = 500;
      }
      throw wrapped;
    }
    throw err;
  }
}

// ============ Helper Functions（P2-9 拆分）============

/**
 * 反序回滚：清理 transfer 写入的 5 张表数据 + 恢复原库存
 * - 返回 true 表示回滚过程中发生错误（用于上层决定是否需要告警）
 */
function rollbackTransfer(
  db: any,
  writtenTxIds: string[],
  writtenNewInventoryStockIds: string[],
  writtenCropInstanceIds: string[],
  writtenSeedSourceIds: string[],
  originalQuantities: Array<{ id: string | number; currentQty: number; availableQty: number; unit: string }>,
  writtenInboundRecordIds: string[],
  now: string,
): boolean {
  let failed = false;
  // 5c → 5b → 5a → 4 → 3 → 2 反序
  // 2026-07-06 Bug 16 修复：先删 inbound_records（依赖 5b 的 newStockId 作为 source_id，
  // 删了 stock 后 inbound.source_id 变成悬空，但删 stock 不会级联删 inbound）
  for (const id of writtenInboundRecordIds) {
    try { db.run('DELETE FROM inventory_inbound_records WHERE id = ?', [id]); }
    catch (e) { console.error('[rollback] delete inbound_record failed:', e); failed = true; }
  }
  // 删除 transfer_in / transfer_out 流水（按 writtenTxIds 倒序）
  for (let i = writtenTxIds.length - 1; i >= 0; i--) {
    try { db.run('DELETE FROM inventory_transaction WHERE id = ?', [writtenTxIds[i]]); }
    catch (e) { console.error('[rollback] delete tx failed:', e); failed = true; }
  }
  // 删除新 inventory_stock
  for (const id of writtenNewInventoryStockIds) {
    try { db.run('DELETE FROM inventory_stock WHERE id = ?', [id]); }
    catch (e) { console.error('[rollback] delete new stock failed:', e); failed = true; }
  }
  // 删除 crop_instances
  for (const id of writtenCropInstanceIds) {
    try { db.run('DELETE FROM crop_instances WHERE id = ?', [id]); }
    catch (e) { console.error('[rollback] delete crop_instance failed:', e); failed = true; }
  }
  // 删除 seed_sources
  for (const id of writtenSeedSourceIds) {
    try { db.run('DELETE FROM seed_sources WHERE id = ?', [id]); }
    catch (e) { console.error('[rollback] delete seed_source failed:', e); failed = true; }
  }
  // 恢复原库存到精确原始值
  for (const orig of originalQuantities) {
    try {
      db.run(
        `UPDATE inventory_stock
         SET current_quantity = ?, available_quantity = ?, status = 'in_stock', update_time = ?
         WHERE id = ?`,
        [orig.currentQty, orig.availableQty, now, orig.id]
      );
    } catch (e) { console.error('[rollback] restore stock failed:', e); failed = true; }
  }
  try { saveDatabase(); } catch { /* saveDatabase 失败不阻断 */ }
  return failed;
}
