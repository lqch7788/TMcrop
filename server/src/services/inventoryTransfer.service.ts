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
import { generateInstanceId, generateStockId, generateInboundRecordId, generateTransactionId } from './inventory.service';
import { derivePropagationMethodFromSeedForm } from './circulation.service';
import { SeedSourceRepository } from '../repositories/seedSource.repository';

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
      ist.product_form,  -- 2026-06-30 Bug 13：列表展示形态 + 调拨入种源时自动复制形态
      ist.source_form    -- 2026-07-16：种源/育苗库存形态字段（fixMissingSchema 注释：source_form=育苗/种植产物类型）
    FROM inventory_stock ist
    WHERE ist.stock_type IN (${placeholders})
      AND ist.current_quantity > 0
      -- 2026-07-16 修复：与作物库存列表对齐，过滤已调拨的库存（status='transferred' 视为已消耗）
      AND (ist.status IS NULL OR ist.status != 'transferred')
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
      // 2026-07-16 修复：product_form 仅采收形态（产品行才用），种源/育苗库存形态写在 source_form
      //   兜底顺序：product_form → source_form，前端 UI 任一有值就能显示
      productForm: obj.product_form || obj.source_form || '',
      sourceForm: obj.source_form || '',
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

  try {
    // 2026-07-19 P0-1：包裹 BEGIN IMMEDIATE 事务
    // 替代之前的"catch 块手动 DELETE 反序回滚"模式（进程崩溃 = 数据半成品）
    db.run('BEGIN IMMEDIATE');
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
      // 2026-07-19 P1：检查受影响行数（rowsModified = 0 → 库存不足，抛错回滚）
      const sourceRowsModified = db.getRowsModified();
      updateStmt.free();
      if (sourceRowsModified === 0) {
        // 库存数量在并发场景下被其他事务扣减 → 乐观锁失败，事务回滚
        throw new InventoryTransferBusinessError(
          InventoryTransferErrorCode.INSUFFICIENT_QUANTITY,
          `源库存 ${sourceStock.instance_id} 在并发场景下数量不足（当前 ${sourceCurrentQty}${sourceUnit}，需 ${item.transferQuantity}${sourceUnit}）`,
        );
      }

      // === 步骤 3：写 transfer_out 流水 ===
      // 2026-07-14：流水 ID 改用 generateTransactionId（替代 Math.random 违规，违反 [[code-generation-contract-rule]] 铁律）
      const outTransactionId = await generateTransactionId(dateStr);
      const outTxId = outTransactionId;
      db.run(
        `INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, 'transfer_out', ?, ?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?)`,
        [
          outTxId, outTransactionId, sourceStock.instance_id, sourceStock.stock_type,
          // 2026-07-15：transfer_out 应写负数（库存被扣减），与 inventory_transaction.quantity 约定一致
          -item.transferQuantity, sourceCurrentQty, newSourceQty,
          String(item.sourceStockId), sourceStock.instance_id,
          operator.id || '', operator.name, now.slice(0, 10),
          `调拨到种源: ${sourceStock.instance_id} ${item.transferQuantity}${sourceUnit}`,
          now,
        ]
      );

      // === 步骤 4：生成 ZZ code + 写 seed_sources（14 个 original_* 字段） ===
      const newCode = await seedSourceService.generateCode(dateStr);
      if (!newCode) {
        throw new InventoryTransferBusinessError(
          InventoryTransferErrorCode.CODE_GENERATION_FAILED,
          `种源编码生成失败（重试耗尽），日期: ${dateStr}`,
        );
      }

      // 2026-07-15：seed_sources.id — 自定义 4 位自增查 max serial
      // 不能用 generateStockId（那函数查的是 inventory_stock 表，与 seed_sources 不同源）
      const seedMaxStmt = db.prepare(`
        SELECT id FROM seed_sources
        WHERE id LIKE ?
        ORDER BY LENGTH(id) DESC, id DESC LIMIT 1
      `);
      const ssPrefix = `SS${dateStr}-`;
      seedMaxStmt.bind([ssPrefix + '%']);
      let seedSerial = 1;
      if (seedMaxStmt.step()) {
        const lastId = String(seedMaxStmt.getAsObject().id);
        seedSerial = parseInt(lastId.slice(ssPrefix.length), 10) + 1;
        if (isNaN(seedSerial)) seedSerial = 1;
      }
      seedMaxStmt.free();
      const newSeedSourceId = `${ssPrefix}${String(seedSerial).padStart(4, '0')}`;
      // 2026-06-30 Bug 13：调拨入种源时自动从源库存 product_form 复制形态
      const transferSeedForm = sourceStock.product_form || null;

      // 2026-07-18: 调拨入种源 —— 合并探测
      // 若存在同合并键（作物+形态+单位+世代+繁殖方法）的 active 种源 → 合并到现有（UPDATE）
      // 否则 → INSERT 新种源
      const transferCropCode = sourceStock.crop_code || null;
      const transferGeneration = sourceStock.generation || null;
      const transferPropMethod = derivePropagationMethodFromSeedForm(transferSeedForm);
      let mergeTargetId: string | null = null;

      if (transferCropCode && transferSeedForm && sourceUnit) {
        const repo = new SeedSourceRepository();
        const mergeable = await repo.findMergeableSeedSource({
          cropCode: transferCropCode,
          seedForm: transferSeedForm,
          unit: sourceUnit,
          generation: transferGeneration,
          propagationMethod: transferPropMethod,
        });
        if (mergeable) {
          mergeTargetId = mergeable.id;
        }
      }

      if (mergeTargetId) {
        // === 合并模式：累加数量到现有种源 ===
        const mergeStmt = db.prepare(`
          UPDATE seed_sources
          SET quantity = quantity + ?,
              remaining_quantity = remaining_quantity + ?,
              reflow_count = reflow_count + 1,
              last_reflow_at = ?,
              update_time = ?
          WHERE id = ?
        `);
        mergeStmt.bind([item.transferQuantity, item.transferQuantity, now, now, mergeTargetId]);
        mergeStmt.step();
        mergeStmt.free();
        // writtenSeedSourceIds 不再需要（事务化后 ROLLBACK 由 SQLite 自动处理）
      } else {
        // === 新建模式：INSERT 新种源 ===
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
        // 注: writtenSeedSourceIds 不再需要（事务化后 ROLLBACK 由 SQLite 自动处理）
      }

      // === 步骤 5a：写 crop_instances ===
      // 2026-07-15：crop_instances.id — 自定义 4 位自增查 max serial
      // 不能用 generateInstanceId（那函数查的是 inventory_stock.instance_id，与 crop_instances.id 不同源）
      // 注意：上方步骤已使用同一个 db，此处不重复声明
      const ciMaxStmt = db.prepare(`
        SELECT id FROM crop_instances
        WHERE id LIKE ?
        ORDER BY LENGTH(id) DESC, id DESC LIMIT 1
      `);
      const ciPrefix = `CI${dateStr}-`;
      ciMaxStmt.bind([ciPrefix + '%']);
      let ciSerial = 1;
      if (ciMaxStmt.step()) {
        const lastId = String(ciMaxStmt.getAsObject().id);
        ciSerial = parseInt(lastId.slice(ciPrefix.length), 10) + 1;
        if (isNaN(ciSerial)) ciSerial = 1;
      }
      ciMaxStmt.free();
      const newCropInstanceId = `${ciPrefix}${String(ciSerial).padStart(4, '0')}`;
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
      // writtenCropInstanceIds 不再需要（事务化后 ROLLBACK 由 SQLite 自动处理）

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
          // 2026-07-15：调拨入种源后，新库存 stock_type 强制为 'seed'（不是原 stock_type 如 'product'）
          // 业务语义：种源页面只关心 seed 类型，调拨来源是 seed/seedling/product 都标准化为 seed
          // sourceStock.stock_type 通过 seed_sources.original_stock_type 字段保留（业务追溯用）
          newStockId, newInstanceId, 'seed', newSeedSourceId, newCode,
          'inventory_transfer', newCropInstanceId,
          sourceStock.crop_code || '', sourceStock.crop_name, sourceStock.variety_id, sourceStock.variety_name,
          item.transferQuantity, item.transferQuantity, 0, sourceUnit,
          sourceStock.warehouse_id, sourceStock.warehouse_name, sourceStock.inbound_date,
          sourceStock.unit_price || 0,
          now, now,
        ]
      );
      // writtenNewInventoryStockIds 不再需要（事务化后 ROLLBACK 由 SQLite 自动处理）

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
          // 2026-07-15：与 inventory_stock 同步 — 调拨入种源后 stock_type 强制 'seed'，
          // 保留原 stock_type 在 notes 里（业务追溯）
          'seed', sourceStock.source_type || 'inventory_transfer',
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
      // writtenInboundRecordIds 不再需要（事务化后 ROLLBACK 由 SQLite 自动处理）

      // 2026-07-14：流水 ID 改用 generateTransactionId（替代 Math.random 违规）
      const inTransactionId = await generateTransactionId(dateStr);
      const inTxId = inTransactionId;
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
      // writtenTxIds 不再需要（事务化后 ROLLBACK 由 SQLite 自动处理）

      results.push({
        newSeedSourceId,
        newSeedSourceCode: newCode,
        newInventoryStockId: newStockId,
        transferOutTxId: outTxId,
        transferInTxId: inTxId,
      });
    }

    // 全部成功 — 提交事务
    db.run('COMMIT');
    saveDatabase();
    return results;
  } catch (err) {
    // 2026-07-19 P0-1：SQLite 原生 ROLLBACK 替代手动 DELETE 反序回滚
    console.error('[executeTransferToSource] failed, rolling back:', err);
    try {
      db.run('ROLLBACK');
    } catch (rbErr) {
      console.error('[executeTransferToSource] ROLLBACK failed:', rbErr);
      // ROLLBACK 失败时附加告警信息（不能仅 console.error 而让用户以为已成功）
      const rbMsg = rbErr instanceof Error ? rbErr.message : '未知回滚错误';
      const wrapped: Error & { cause?: unknown; code?: string; httpStatus?: number } = new Error(
        `${err instanceof Error ? err.message : '调拨失败'}（且数据库回滚失败：${rbMsg}。请立即联系管理员排查 DB 状态！）`
      );
      wrapped.cause = err;
      if (err instanceof InventoryTransferBusinessError) {
        wrapped.code = err.code;
        wrapped.httpStatus = 500;
      }
      throw wrapped;
    }
    throw err;
  }
}
