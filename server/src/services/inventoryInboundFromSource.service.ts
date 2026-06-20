/**
 * 行级采收入库服务（V3.0+ Phase 1）
 *
 * 把原采收入库页 AddModal 的能力下沉到 3 页面行级调用：
 * 1. 写 harvest_records 主单（含 products JSON + 溯源字段 source_module/source_id/source_code）
 * 2. 写 inventory_stock（每产品 1 条，含 source_instance_id 关联）
 * 3. 写 inventory_inbound_records（每库存 1 条审计）
 * 4. 写 inventory_transaction 流水（每库存 1 条 inbound，balance_before=0, balance_after=quantity）
 *
 * 按 D7/D8 决策：采收是产物输出，不扣 crop_instances（已移除原 AddModal 第 5 步）
 *
 * 4 步事务回滚：任一失败时按反序 DELETE 已成功的记录
 */

import { getDatabase, saveDatabase } from '../db';
import { inventoryStockRepository } from '../repositories/inventory.repository';
import { inventoryTransactionRepository } from '../repositories/inventoryTransaction.repository';
import { harvestRepository } from '../repositories/harvest.repository';
import { generateInstanceId } from './inventory.service';

export type StockType = 'seed' | 'seedling' | 'product';
export type SourceModule = 'seed_source' | 'seedling' | 'planting';

export interface InboundProduct {
  cropCode?: string;
  cropName: string;
  cropVariety?: string;
  plantingMode?: string;
  harvestQuantity: number;
  unit: string;
  targetYield?: number;
  grade?: string;
  auditor?: string;
  remarks?: string;
  // 2026-06-19: 形态/类型字段
  productForm?: string;  // 采收形态（果实/籽/枝条等）
  sourceForm?: string;   // 育苗/种植产物类型（果实/籽/枝条等）
}

export interface InboundFromSourceInput {
  stockType: StockType;
  sourceModule: SourceModule;
  sourceRecordId: string;
  sourceRecordCode: string;
  // payload
  harvestDate: string;
  greenhouseIds?: string[];
  greenhouseNames?: string[];
  harvesterIds?: string[];
  harvesterNames?: string[];
  operator?: string;
  remarks?: string;
  saleType?: 'self_use' | 'external_sale';
  isSupplementary?: boolean;
  supplementaryReason?: string;
  unitPrice?: number;
  unit: string;
  warehouseId: string;
  warehouseName?: string;
  products: InboundProduct[];
  operatorName?: string;
  // 2026-06-19: 种源形态（仅种源行入库时必填）
  propagationForm?: string;  // 种子/种苗/实生苗/扦插苗/嫁接苗/组培苗/分株苗/种球/球根
}

export interface InboundFromSourceResult {
  harvestRecordId: string;
  harvestCode: string;
  stockIds: string[];
  transactionIds: string[];
}

/**
 * 生成 harvest_code: HS + YYYYMMDD + 3位当日自增
 * 与种子数据/原 generateCode 行为一致
 */
function generateHarvestCode(db: any, dateStr: string): string {
  const pattern = `HS${dateStr}___`;
  const stmt = db.prepare(`
    SELECT harvest_code FROM harvest_records
    WHERE harvest_code LIKE ? AND LENGTH(harvest_code) = 13
    ORDER BY harvest_code DESC LIMIT 1
  `);
  stmt.bind([pattern]);
  let maxSerial = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { harvest_code: string };
    maxSerial = parseInt(row.harvest_code.slice(-3), 10) || 0;
  }
  stmt.free();
  const seq = String(maxSerial + 1).padStart(3, '0');
  return `HS${dateStr}${seq}`;
}

/**
 * 从源记录反查 crop_instance_id（如果存在）
 * 种源无 instance；育苗/种植可能有
 */
function findSourceInstanceId(db: any, sourceModule: SourceModule, sourceId: string): string | null {
  try {
    // crop_instances 表：business_id + business_type 关联
    const stmt = db.prepare(`
      SELECT id FROM crop_instances
      WHERE business_id = ? AND business_type = ?
      LIMIT 1
    `);
    // mapping sourceModule → instance business_type
    const businessType = sourceModule === 'seed_source' ? 'seed_source'
      : sourceModule === 'seedling' ? 'seedling'
      : 'planting';
    stmt.bind([sourceId, businessType]);
    let instanceId: string | null = null;
    if (stmt.step()) {
      instanceId = (stmt.getAsObject() as any).id || null;
    }
    stmt.free();
    return instanceId;
  } catch {
    return null;
  }
}

/**
 * 主函数：4 步写入 + 回滚
 */
export async function executeInboundFromSource(
  input: InboundFromSourceInput
): Promise<InboundFromSourceResult> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const dateStr = input.harvestDate.replace(/-/g, '').slice(0, 8); // YYYYMMDD
  const harvestCode = generateHarvestCode(db, dateStr);
  const harvestRecordId = `HV${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;
  const operator = input.operatorName || 'system';

  // 校验
  if (!input.products || input.products.length === 0) {
    throw new Error('至少需要 1 条产品明细');
  }
  if (!input.warehouseId) {
    throw new Error('warehouseId 必填');
  }
  if (!input.harvestDate) {
    throw new Error('harvestDate 必填');
  }
  if (input.isSupplementary && !input.supplementaryReason) {
    throw new Error('isSupplementary=true 时 supplementaryReason 必填');
  }

  // 反查源 crop_instance_id（用于 source_instance_id 关联，库存追溯依赖）
  const sourceInstanceId = findSourceInstanceId(db, input.sourceModule, input.sourceRecordId);

  // 2026-06-19: 反查源种植/种源/育苗记录，自动补 greenhouse_name（采收区域）和 planting_mode（种植模式）
  // - 种植行：拼 plantings.area_name + plantings.root_name 作种植模式；从 plantings.greenhouse_name 取采收区域
  // - 其他源（种源/育苗）暂时不补，保留前端传入或 NULL
  let autoGreenhouseName: string | null = null;
  let autoPlantingMode: string | null = null;
  let autoAreaName: string | null = null;
  if (input.sourceModule === 'planting') {
    const pStmt = db.prepare('SELECT greenhouse_name, area_name, root_name FROM plantings WHERE id = ?');
    pStmt.bind([input.sourceRecordId]);
    const prow = pStmt.step() ? pStmt.getAsObject() as any : null;
    pStmt.free();
    if (prow) {
      autoGreenhouseName = prow.greenhouse_name || null;
      autoAreaName = prow.area_name || null;
      // 2026-06-19: 修正映射 — planting_mode 应是 root_name（种植模式/大棚号），不是 area_name
      autoPlantingMode = prow.root_name || null;
    }
  } else if (input.sourceModule === 'seedling') {
    // 2026-06-19: 育苗行入库 — 反查 seedlings 拿 greenhouse_name / area_name
    const sStmt = db.prepare('SELECT greenhouse_name, area_name FROM seedlings WHERE id = ?');
    sStmt.bind([input.sourceRecordId]);
    const srow = sStmt.step() ? sStmt.getAsObject() as any : null;
    sStmt.free();
    if (srow) {
      autoGreenhouseName = srow.greenhouse_name || null;
      autoAreaName = srow.area_name || null;
    }
  }

  // 记录所有写入的 id，用于回滚
  const writtenStockIds: string[] = [];
  const writtenTransactionIds: string[] = [];
  const writtenRecordIds: string[] = [];
  const writtenHarvestId: string | null = null;

  try {
    // 步骤 1：写 harvest_records 主单
    const harvestRecord: any = {
      id: harvestRecordId,
      harvest_code: harvestCode,
      source_id: input.sourceRecordId,
      source_name: input.sourceRecordCode,
      harvest_date: input.harvestDate,
      greenhouse_id: input.greenhouseIds?.[0] || null,
      greenhouse_name: input.greenhouseNames?.[0] || autoGreenhouseName,
      harvester_ids: input.harvesterIds ? JSON.stringify(input.harvesterIds) : null,
      harvester_names: input.harvesterNames ? JSON.stringify(input.harvesterNames) : null,
      auditor_id: input.operator || null,
      remarks: input.remarks || null,
      warehouse_id: input.warehouseId,
      unit_price: input.unitPrice || 0,
      unit: input.unit,
      status: 'completed',
      inbound_type: input.saleType === 'self_use' ? 'self_use' : 'external_sale',
      batch_code: input.sourceRecordCode,
      products: JSON.stringify(input.products),
      // 溯源字段（D11 决策）
      source_module: input.sourceModule,
      create_by: operator,
      create_time: now,
      update_time: now,
    };

    // 直接用 db.run 写入 harvest_records（不依赖 harvestRepository.create 的复杂逻辑）
    db.run(`
      INSERT INTO harvest_records (
        id, harvest_code, source_id, source_name,
        harvest_date, greenhouse_id, greenhouse_name,
        harvester_ids, harvester_names, auditor_id,
        remarks, warehouse_id, unit_price, unit,
        status, inbound_type, batch_code, products,
        source_module,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      harvestRecord.id, harvestRecord.harvest_code, harvestRecord.source_id, harvestRecord.source_name,
      harvestRecord.harvest_date, harvestRecord.greenhouse_id, harvestRecord.greenhouse_name,
      harvestRecord.harvester_ids, harvestRecord.harvester_names, harvestRecord.auditor_id,
      harvestRecord.remarks, harvestRecord.warehouse_id, harvestRecord.unit_price, harvestRecord.unit,
      harvestRecord.status, harvestRecord.inbound_type, harvestRecord.batch_code, harvestRecord.products,
      harvestRecord.source_module,
      harvestRecord.create_by, harvestRecord.create_time, harvestRecord.update_time,
    ]);
    writtenRecordIds.push(harvestRecordId);

    // 步骤 2-4：为每条 product 写 inventory_stock + inventory_inbound_records + inventory_transaction
    for (const product of input.products) {
      // 2026-06-19: 库存实例 ID 统一格式 ${prefix}-${YYYYMMDD}-${NNNN}（17 字符）
      // 与 /end 路由（旧采收入库）保持一致；不再使用 INST- 前缀 + Date.now+random
      const prefix = input.stockType === 'seed' ? 'INS' : input.stockType === 'seedling' ? 'ISE' : 'IPR';
      const instanceId = await generateInstanceId(prefix, dateStr);
      const tsSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const stockId = `STK-${tsSuffix}-${writtenStockIds.length}`;

      // 步骤 2：写 inventory_stock
      const stockRecord: any = {
        id: stockId,
        instance_id: instanceId,
        stock_type: input.stockType,
        business_id: harvestRecordId,
        business_type: 'harvest',
        business_code: harvestCode,
        source_type: input.sourceModule,
        source_instance_id: sourceInstanceId,  // 关键：库存追溯链依赖
        crop_code: product.cropCode || null,
        crop_name: product.cropName,
        variety_name: product.cropVariety || null,
        current_quantity: product.harvestQuantity,
        available_quantity: product.harvestQuantity,
        frozen_quantity: 0,
        unit: product.unit,
        warehouse_id: input.warehouseId,
        warehouse_name: input.warehouseName || null,
        inbound_date: input.harvestDate,
        quality_grade: product.grade || null,
        grade: product.grade || null,
        unit_price: input.unitPrice || 0,
        planting_mode: product.plantingMode || autoPlantingMode,
        greenhouse_name: input.greenhouseNames?.[0] || autoGreenhouseName,
        area_name: autoAreaName,
        // 2026-06-19: 形态/类型字段
        product_form: product.productForm || null,        // 采收形态
        propagation_form: input.propagationForm || null,  // 种源形态（仅种源行）
        source_form: product.sourceForm || null,          // 育苗/种植产物类型
        status: 'in_stock',
        version: 1,
        create_time: now,
        update_time: now,
      };

      db.run(`
        INSERT INTO inventory_stock (
          id, instance_id, stock_type, business_id, business_type, business_code,
          source_type, source_instance_id,
          crop_code, crop_name, variety_name,
          current_quantity, available_quantity, frozen_quantity, unit,
          warehouse_id, warehouse_name, inbound_date,
          quality_grade, grade, unit_price,
          planting_mode, greenhouse_name,
          product_form, propagation_form, source_form,
          area_name,
          status, version, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        stockRecord.id, stockRecord.instance_id, stockRecord.stock_type,
        stockRecord.business_id, stockRecord.business_type, stockRecord.business_code,
        stockRecord.source_type, stockRecord.source_instance_id,
        stockRecord.crop_code, stockRecord.crop_name, stockRecord.variety_name,
        stockRecord.current_quantity, stockRecord.available_quantity, stockRecord.frozen_quantity, stockRecord.unit,
        stockRecord.warehouse_id, stockRecord.warehouse_name, stockRecord.inbound_date,
        stockRecord.quality_grade, stockRecord.grade, stockRecord.unit_price,
        stockRecord.planting_mode, stockRecord.greenhouse_name,
        stockRecord.product_form, stockRecord.propagation_form, stockRecord.source_form,
        stockRecord.area_name,
        stockRecord.status, stockRecord.version, stockRecord.create_time, stockRecord.update_time,
      ]);

      // 2026-06-19: 种源行入库时同步扣减种源 remaining_quantity
      // 业务语义：种源"入库"是产物离开种源进入作物库存（内部使用 → 对外）
      // 种源剩余必须扣减，否则无论登记多少都不变，不合理
      // 只对 seed_source 类型扣减，seedling 行不扣（育苗还没"入库"概念）
      if (input.sourceModule === 'seed_source') {
        db.run(
          `UPDATE seed_sources
           SET remaining_quantity = MAX(0, COALESCE(remaining_quantity, 0) - ?)
           WHERE id = ? AND deleted_at IS NULL`,
          [product.harvestQuantity, input.sourceRecordId]
        );
      }
      writtenStockIds.push(stockId);

      // 步骤 3：写 inventory_inbound_records
      const recordId = `INB-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}-${writtenRecordIds.length}`;
      db.run(`
        INSERT INTO inventory_inbound_records (
          id, record_type, record_date, source_module, source_id, source_code,
          stock_type, source_type, warehouse_id, warehouse_name,
          crop_code, crop_name, variety_name,
          quantity, unit, unit_price, total_amount, quality_grade,
          business_id, notes, operator_name, create_by, create_time, update_time
        ) VALUES (?, 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId, input.harvestDate,
        input.sourceModule, input.sourceRecordId, input.sourceRecordCode,
        input.stockType, input.sourceModule,
        input.warehouseId, input.warehouseName || null,
        product.cropCode || null, product.cropName, product.cropVariety || null,
        product.harvestQuantity, product.unit,
        input.unitPrice || 0, (input.unitPrice || 0) * product.harvestQuantity,
        product.grade || null,
        harvestRecordId, product.remarks || input.remarks || null,
        operator, operator, now, now,
      ]);
      writtenRecordIds.push(recordId);

      // 步骤 4：写 inventory_transaction 流水
      const txId = `TXN-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}-${writtenTransactionIds.length}`;
      const transactionId = `TXID-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
      db.run(`
        INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks,
          create_time
        ) VALUES (?, ?, ?, ?, 'inbound', ?, 0, ?, ?, 'harvest', ?, ?, ?, ?, ?, ?)
      `, [
        txId, transactionId, instanceId, input.stockType,
        product.harvestQuantity, product.harvestQuantity,
        harvestRecordId, harvestCode,
        operator, operator, input.harvestDate,
        `来源:${input.sourceModule}/${input.sourceRecordCode}`,
        now,
      ]);
      writtenTransactionIds.push(txId);
    }

    // 全部成功 — 提交 + 持久化
    saveDatabase();
    return {
      harvestRecordId,
      harvestCode,
      stockIds: writtenStockIds,
      transactionIds: writtenTransactionIds,
    };
  } catch (err) {
    // 4 步回滚：反序 DELETE
    console.error('[executeInboundFromSource] failed, rolling back:', err);
    try {
      // 步骤 4 → 3 → 2 → 1 反序
      for (const txId of writtenTransactionIds) {
        try { db.run('DELETE FROM inventory_transaction WHERE id = ?', [txId]); } catch (_) {}
      }
      for (const recordId of writtenRecordIds) {
        try { db.run('DELETE FROM inventory_inbound_records WHERE id = ?', [recordId]); } catch (_) {}
      }
      for (const stockId of writtenStockIds) {
        try { db.run('DELETE FROM inventory_stock WHERE id = ?', [stockId]); } catch (_) {}
      }
      saveDatabase();
    } catch (rollbackErr) {
      console.error('[executeInboundFromSource] rollback error:', rollbackErr);
    }
    throw err;
  }
}
