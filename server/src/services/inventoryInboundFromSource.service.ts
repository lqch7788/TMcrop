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
import { generateInstanceId, generateStockId, generateInboundRecordId } from './inventory.service';

/**
 * 2026-07-16：库存 cropName 归一化（防"宁玉（宁玉）"类数据错位）
 *
 * 业务规则：
 * - crop_varieties 表维护品种字典（sub_variety1_name = 子品种名）
 * - 用户录入时可能误把"品种名"当作"作物名"传入（如「宁玉」实际是「草莓」的品种）
 * - 写入 inventory_stock 前做反查：若 cropName 在 sub_variety1_name 中能找到（说明是品种），
 *   自动把 cropName 修正为 type_name（作物类目，如「草莓」），varietyName 用查到的 sub_variety1_name
 *
 * @returns { cropName: string, varietyName: string | null }
 */
function normalizeCropNameForStock(
  cropName: string,
  cropVariety?: string | null,
): { cropName: string; varietyName: string | null } {
  if (!cropName) return { cropName: cropName || '', varietyName: cropVariety || null };

  try {
    const db = getDatabase();
    // 检查 cropName 是否在 sub_variety1_name 里能找到（说明实际是品种名）
    // 2026-07-16：用 variety_name 作为 cropName（如「草莓」），不是 type_name（"浆果类"是大类，UI 不友好）
    const stmt = db.prepare(
      `SELECT variety_name, sub_variety1_name FROM crop_varieties
       WHERE sub_variety1_name = ? AND status = 'active' LIMIT 1`
    );
    stmt.bind([cropName]);
    if (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      stmt.free();
      // cropName 实际是品种名 → 用 variety_name 作为 cropName（如"草莓"），varietyName 用 cropName（"宁玉"）
      const realCropName = String(r.variety_name || cropName);
      return { cropName: realCropName, varietyName: String(r.sub_variety1_name || cropName) };
    }
    stmt.free();
  } catch (e) {
    // 2026-07-16：归一化失败不应阻塞写入流程，记录警告后用原值
    console.warn('[normalizeCropNameForStock] 反查 crop_varieties 失败，使用原值:', (e as Error).message);
  }

  return { cropName, varietyName: cropVariety || null };
}

export type StockType = 'seed' | 'seedling' | 'product';
export type SourceModule = 'seed_source' | 'seedling' | 'planting';

export interface InboundProduct {
  cropId?: string;          // 2026-07-08 T9：关联作物档案 ID（用于入库审计反向追溯）
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
  // 2026-07-08 T8.5：作物库存入库弹窗重设计 — product 维度 4 字段
  supplierPhone?: string;  // 外购入库：供应商电话
  giftFrom?: string;       // 赠品入库：赠送方
  baseId?: string;         // 自产入库：基地 ID
  baseName?: string;       // 自产入库：基地名
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
  // 2026-06-30 Bug 18：saleType 字段删除（无业务用途 + 污染 inbound_type 列）
  isSupplementary?: boolean;
  supplementaryReason?: string;
  unitPrice?: number;
  unit: string;
  warehouseId: string;
  warehouseName?: string;
  products: InboundProduct[];
  operatorName?: string;
  // 2026-06-19: 种源形态（仅种源行入库时必填）— 2026-06-30 Bug 21 删
  // 2026-06-27: 成品形态（仅种植行入库时可选，整株/花朵/果实/种子/块茎 等）
  harvestForm?: string;
  // 2026-07-06：种源外购入库联动成本字段（仅 stockType=seed && inboundSourceType=external_purchase 时使用）
  supplierId?: string;
  supplierName?: string;
  purchaserIds?: string[];
  purchaserNames?: string[];
  purchasePlanId?: string;                  // 关联现有 PR（未传则自动创建外购 PR）
  purchasePrice?: number;
  purchaseTotalAmount?: number;
  // 2026-07-08 T9：作物库存入库弹窗重设计 — 入库审计补 production_plan 关联
  productionPlanId?: string;
  productionPlanCode?: string;
  // 2026-07-08 T8.5：作物库存入库弹窗重设计 — 顶级 5 字段
  consignor?: string;          // 委托入库：委托方
  sourceWarehouseName?: string;// 调拨入库：源仓库名
  stocktakeNo?: string;        // 盘盈入库：盘点单号
  plantingMode?: string;       // 自产入库：种植模式（与 product.plantingMode 二选一，顶级优先）
  greenhouseName?: string;     // 自产入库：温室名
}

export interface InboundFromSourceResult {
  harvestRecordId: string;
  harvestCode: string;
  stockIds: string[];
  transactionIds: string[];
  // 2026-07-06：种源外购入库联动 — 关联/自动创建的采购计划 ID 和物料成本 ID（非外购时为 null）
  purchasePlanId: string | null;
  materialCostId: string | null;
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
  } catch (e) {
    console.warn('[findSourceInstanceId] 查询失败，返回 null:', e);
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
  // 2026-07-14：harvestRecordId 改用 crypto.randomUUID()（替代 Math.random 违规，违反 [[code-generation-contract-rule]] 铁律）
  const { randomUUID } = require('crypto');
  const harvestRecordId = `HV${randomUUID()}`;
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
  // 注：种源入库单位校验已在 route 层（3.6 节）提前完成

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
  // 2026-07-14：提到 try 外，让外层 catch 的回滚块也能访问
  let rolledBackSeedSourceQuantity = false;

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
      // 2026-06-30 Bug 18：删 inbound_type 写入（避免 self_use/external_sale 污染字典 INBOUND_TYPE_MAP
      // 标准值 seed_source/seedling/planting_harvest）。后续若需此分类，建议从 stockType 派生。
      batch_code: input.sourceRecordCode,
      products: JSON.stringify(input.products),
      // 2026-06-27：成品形态（整株/花朵/果实/种子/块茎 等），由前端采收入库 Modal 选择
      harvest_form: input.harvestForm || null,
      // 2026-07-03：补录标记（异常结束后补录的入库需留痕，弹窗历史表"补录"列依赖）
      is_supplementary: input.isSupplementary ? 1 : 0,
      supplementary_reason: input.supplementaryReason || null,
      // 溯源字段（D11 决策）
      source_module: input.sourceModule,
      // 2026-07-06：种源外购入库联动成本字段（区别于 unit_price "售价"语义）
      supplier_id: input.supplierId || null,
      supplier_name: input.supplierName || null,
      purchaser_ids: input.purchaserIds ? JSON.stringify(input.purchaserIds) : null,
      purchaser_names: input.purchaserNames ? JSON.stringify(input.purchaserNames) : null,
      purchase_price: input.purchasePrice || 0,
      purchase_total_amount: input.purchaseTotalAmount || 0,
      purchase_plan_id: input.purchasePlanId || null,
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
        source_module, harvest_form,
        is_supplementary, supplementary_reason,
        supplier_id, supplier_name,
        purchaser_ids, purchaser_names,
        purchase_price, purchase_total_amount, purchase_plan_id,
        create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      harvestRecord.id, harvestRecord.harvest_code, harvestRecord.source_id, harvestRecord.source_name,
      harvestRecord.harvest_date, harvestRecord.greenhouse_id, harvestRecord.greenhouse_name,
      harvestRecord.harvester_ids, harvestRecord.harvester_names, harvestRecord.auditor_id,
      harvestRecord.remarks, harvestRecord.warehouse_id, harvestRecord.unit_price, harvestRecord.unit,
      harvestRecord.status, harvestRecord.inbound_type, harvestRecord.batch_code, harvestRecord.products,
      harvestRecord.source_module, harvestRecord.harvest_form || null,
      harvestRecord.is_supplementary, harvestRecord.supplementary_reason,
      harvestRecord.supplier_id, harvestRecord.supplier_name,
      harvestRecord.purchaser_ids, harvestRecord.purchaser_names,
      harvestRecord.purchase_price, harvestRecord.purchase_total_amount, harvestRecord.purchase_plan_id,
      harvestRecord.create_by, harvestRecord.create_time, harvestRecord.update_time,
    ]);
    writtenRecordIds.push(harvestRecordId);

    // 2026-08-14：回写育苗源记录 seedlings.harvest_stocked_count（育苗列表"已入库数量"列数据源）
    // 修复历史断链：原 2026-07-13 补录回写针对 harvest_to_inventory_qty —— 该列在 seedlings/plantings 表中均不存在，
    // 补录入库会触发 no such column 异常导致整单回滚（坏代码，已移除）
    // 新逻辑：sourceModule='seedling' 的入库（普通入库 + 补录）统一累加 harvest_stocked_count；
    // 种植模块的"已入库量"字段不在本次范围，不再回写
    if (input.sourceModule === 'seedling') {
      // 计算本次入库总量（跨所有 products）
      const totalQuantity = (input.products || []).reduce(
        (sum, p) => sum + (Number(p.harvestQuantity) || 0),
        0,
      );
      if (totalQuantity > 0) {
        const updateStmt = db.prepare(
          `UPDATE seedlings SET harvest_stocked_count = COALESCE(harvest_stocked_count, 0) + ?, update_time = ? WHERE id = ?`,
        );
        updateStmt.bind([totalQuantity, now, input.sourceRecordId]);
        updateStmt.step();
        updateStmt.free();
        console.log(
          `[育苗入库回写] seedlings[${input.sourceRecordId}].harvest_stocked_count += ${totalQuantity}`,
        );
      }
    }

    // 步骤 2-4：为每条 product 写 inventory_stock + inventory_inbound_records + inventory_transaction
    for (const product of input.products) {
      // 2026-06-19: 库存实例 ID 统一格式 ${prefix}-${YYYYMMDD}-${NNNN}（17 字符）
      // 与 /end 路由（旧采收入库）保持一致；不再使用 INST- 前缀 + Date.now+random
      const prefix = input.stockType === 'seed' ? 'INS' : input.stockType === 'seedling' ? 'ISE' : 'IPR';
      const instanceId = await generateInstanceId(prefix, dateStr);
      // 2026-07-07 V3.2: 库存主键统一走 generateStockId，4 位自增替代 Math.random
      const stockId = await generateStockId(dateStr);

      // 步骤 2：写 inventory_stock
      // 2026-07-16 修复：写入前用 crop_varieties 表反查归一化 — 如果 product.cropName 实际是 sub_variety1_name（品种名）
      //   自动把 cropName 替换为 type_name（作物类目），varietyName 用查到的 sub_variety1_name
      //   修复"宁玉（宁玉）"类数据错位 bug
      const normalizedCrop = normalizeCropNameForStock(product.cropName, product.cropVariety);
      const stockRecord: any = {
        id: stockId,
        instance_id: instanceId,
        stock_type: input.stockType,
        business_id: harvestRecordId,
        business_type: 'harvest',
        business_code: harvestCode,
        // 2026-06-27: 种源入库用 inboundSourceType（用户选的外购/自产/内部），其他模块 fallback 到 sourceModule
        source_type: (input as any).inboundSourceType || input.sourceModule,
        source_instance_id: sourceInstanceId,  // 关键：库存追溯链依赖
        crop_code: product.cropCode || null,
        // 2026-07-16：归一化后的 cropName（防"宁玉（宁玉）"数据错位）
        crop_name: normalizedCrop.cropName,
        variety_name: normalizedCrop.varietyName,
        current_quantity: product.harvestQuantity,
        available_quantity: product.harvestQuantity,
        frozen_quantity: 0,
        unit: product.unit,
        warehouse_id: input.warehouseId,
        warehouse_name: input.warehouseName || null,
        inbound_date: input.harvestDate,
        quality_grade: product.grade || null,
        grade: product.grade || null,
        // 2026-07-06：种源外购入库 — unit_price 用采购价（区别于售价语义），supplier 信息写入
        unit_price: input.purchasePrice || input.unitPrice || 0,
        total_amount: input.purchaseTotalAmount || (input.purchasePrice || input.unitPrice || 0) * product.harvestQuantity,
        supplier_id: input.supplierId || null,
        supplier_name: input.supplierName || null,
        planting_mode: product.plantingMode || autoPlantingMode,
        greenhouse_name: input.greenhouseNames?.[0] || autoGreenhouseName,
        area_name: autoAreaName,
        // 2026-06-19: 形态/类型字段
        // 2026-06-30 Bug 21：统一改读产品明细 sourceForm（写入 source_form 列），
        // 移除 propagation_form 写入 — 种源入库的 seedForm 走 seed_sources 表独立链路
        product_form: product.productForm || null,        // 采收形态（product 行用）
        source_form: product.sourceForm || null,          // 育苗/种植产物类型（统一形态字段）
        // 2026-07-13：补录入库字段（写入 inventory_stock 表，让库存列表/详情可展示补录标记）
        is_supplementary: input.isSupplementary ? 1 : 0,
        supplementary_reason: input.supplementaryReason || null,
        source_module: input.sourceModule || null,
        status: 'in_stock',
        version: 1,
        create_time: now,
        update_time: now,
      };

      // 写入 inventory_stock（种源/育苗/种植三入口统一落库）
      // 2026-06-30 Bug 21：列清单删除 propagation_form（统一走产品明细 sourceForm）
      // 2026-07-06：种源外购入库 — 补 supplier_id/supplier_name/unit_price/total_amount 字段
      // 2026-07-13：补录入库字段（is_supplementary / supplementary_reason / source_module）
      db.run(`
        INSERT INTO inventory_stock (
          id, instance_id, stock_type, business_id, business_type, business_code,
          source_type, source_instance_id,
          crop_code, crop_name, variety_name,
          current_quantity, available_quantity, frozen_quantity, unit,
          warehouse_id, warehouse_name, inbound_date,
          quality_grade, grade, unit_price, total_amount,
          supplier_id, supplier_name,
          planting_mode, greenhouse_name,
          product_form, source_form,
          area_name,
          is_supplementary, supplementary_reason, source_module,
          status, version, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        stockRecord.id, stockRecord.instance_id, stockRecord.stock_type,
        stockRecord.business_id, stockRecord.business_type, stockRecord.business_code,
        stockRecord.source_type, stockRecord.source_instance_id,
        stockRecord.crop_code, stockRecord.crop_name, stockRecord.variety_name,
        stockRecord.current_quantity, stockRecord.available_quantity, stockRecord.frozen_quantity, stockRecord.unit,
        stockRecord.warehouse_id, stockRecord.warehouse_name, stockRecord.inbound_date,
        stockRecord.quality_grade, stockRecord.grade, stockRecord.unit_price, stockRecord.total_amount,
        stockRecord.supplier_id, stockRecord.supplier_name,
        stockRecord.planting_mode, stockRecord.greenhouse_name,
        stockRecord.product_form, stockRecord.source_form,
        stockRecord.area_name,
        stockRecord.is_supplementary, stockRecord.supplementary_reason, stockRecord.source_module,
        stockRecord.status, stockRecord.version, stockRecord.create_time, stockRecord.update_time,
      ]);
      writtenStockIds.push(stockId);

      // 步骤 3：写 inventory_inbound_records
      // 2026-07-07 V3.2: 入库记录主键统一走 generateInboundRecordId，4 位自增替代 Math.random
      const recordId = await generateInboundRecordId(dateStr);
      // 2026-07-06：种源外购入库 — unit_price/total_amount 用采购价；supplier_id/supplier_name 写入审计
      const inboundUnitPrice = input.purchasePrice || input.unitPrice || 0;
      const inboundTotalAmount = input.purchaseTotalAmount || inboundUnitPrice * product.harvestQuantity;
      // 2026-07-08 T8.5：6 套字段矩阵补 9 列（顺序在 crop_id 之后、crop_code 之前，与 fixMissingSchema 对齐）
      // product 维度的 4 字段（supplierPhone/giftFrom/baseId/baseName）从 product 取；其余 5 字段从 input 顶级取
      const productAny = product as any;
      const inputAny = input as any;
      const supplierPhoneValue: string | null = inputAny.supplierPhone || productAny.supplierPhone || null;
      const giftFromValue: string | null = inputAny.giftFrom || productAny.giftFrom || null;
      const baseIdValue: string | null = inputAny.baseId || productAny.baseId || null;
      const baseNameValue: string | null = inputAny.baseName || productAny.baseName || null;
      db.run(`
        INSERT INTO inventory_inbound_records (
          id, record_type, record_date, source_module, source_id, source_code,
          stock_type, source_type, warehouse_id, warehouse_name,
          crop_id,
          supplier_phone, gift_from, consignor, source_warehouse_name, stocktake_no,
          base_id, base_name, planting_mode, greenhouse_name,
          crop_code, crop_name, variety_name,
          production_plan_id, production_plan_code,
          quantity, unit, unit_price, total_amount, quality_grade,
          supplier_id, supplier_name,
          business_id, notes, operator_name, create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId, 'inbound', input.harvestDate,
        input.sourceModule, input.sourceRecordId, input.sourceRecordCode,
        input.stockType, (input as any).inboundSourceType || input.sourceModule,
        input.warehouseId, input.warehouseName || null,
        // 2026-07-08 T9：入库审计补全 crop_id / production_plan 关联
        product.cropId || null,
        // 2026-07-08 T8.5：6 套字段矩阵补 9 字段值（顺序与列顺序一致）
        supplierPhoneValue,
        giftFromValue,
        input.consignor || null,
        input.sourceWarehouseName || null,
        input.stocktakeNo || null,
        baseIdValue,
        baseNameValue,
        // plantingMode 顶级优先，缺省用 product.plantingMode
        input.plantingMode || product.plantingMode || null,
        input.greenhouseName || null,
        product.cropCode || null, product.cropName, product.cropVariety || null,
        input.productionPlanId || null, input.productionPlanCode || null,
        product.harvestQuantity, product.unit,
        inboundUnitPrice, inboundTotalAmount,
        product.grade || null,
        input.supplierId || null, input.supplierName || null,
        harvestRecordId, product.remarks || input.remarks || null,
        operator, operator, now, now,
      ]);
      writtenRecordIds.push(recordId);

      // 步骤 4：写 inventory_transaction 流水
      // 2026-07-14：流水 ID 改用 generateTransactionId（替代 Math.random 违规，违反 [[code-generation-contract-rule]] 铁律）
      const { generateTransactionId } = require('./inventory.service');
      const transactionId = await generateTransactionId(dateStr);
      const txId = transactionId;
      db.run(`
        INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks,
          create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        txId, transactionId, instanceId, input.stockType, 'inbound',
        product.harvestQuantity, 0, product.harvestQuantity,
        harvestRecordId, 'harvest', harvestCode,
        operator, operator, input.harvestDate,
        `来源:${
            input.sourceModule === 'seed_source' ? '种源'
            : input.sourceModule === 'seedling' ? '育苗'
            : input.sourceModule === 'planting' ? '种植'
            : input.sourceModule
          }/${input.sourceRecordCode}`,
        now,
      ]);
      writtenTransactionIds.push(txId);
    }

    // 2026-07-06：种源行级入库 — 回写 seed_sources 的 quantity 和 remaining_quantity
    // 修复：行级入库与新建种源入库行为不一致。新建直接写 seed_sources，行级入库只写 inventory_stock。
    // 现在统一：种源入库同时更新 seed_sources 数量。
    // 2026-07-14：rolledBackSeedSourceQuantity 已在 try 块外声明（line 215 附近），供 catch 回滚块访问
    if (input.sourceModule === 'seed_source') {
      const totalInboundQty = input.products.reduce((s, p) => s + (p.harvestQuantity || 0), 0);
      db.run(`
        UPDATE seed_sources
        SET quantity = quantity + ?,
            remaining_quantity = remaining_quantity + ?,
            update_time = ?
        WHERE id = ? AND deleted_at IS NULL
      `, [totalInboundQty, totalInboundQty, now, input.sourceRecordId]);
      rolledBackSeedSourceQuantity = true;
    }

    // 2026-07-06：种源外购入库联动成本 — 第 5 步：自动创建/关联 purchase_plans，第 6 步：自动归集 material_costs
    // 仅 stockType=seed && inboundSourceType=external_purchase 时触发
    // 5/6 步单独包 try-catch：失败时回滚自身 + 重新抛错让外层 catch 处理 4 表回滚（严格事务）
    let createdPurchasePlanId: string | null = input.purchasePlanId || null;
    let createdMaterialCostId: string | null = null;
    const isSeedExternalPurchase =
      input.stockType === 'seed' && (input as any).inboundSourceType === 'external_purchase';

    if (isSeedExternalPurchase && input.supplierId && input.purchaseTotalAmount && input.purchaseTotalAmount > 0) {
      // 保存 5a PR 旧状态，用于回滚（避免 PR 状态永久残留）
      let oldPRState: { execution_status: string; status: string; related_batch_code: string; total_amount: number } | null = null;

      try {
        // ==== 第 5 步：处理 purchase_plans（关联现有 / 自动创建外购 PR） ====
        if (input.purchasePlanId) {
          // 5a. 关联现有 PR — 先查旧状态用于回滚，再 UPDATE
          const prStmt = db.prepare(`
            SELECT execution_status, status, related_batch_code, total_amount
            FROM purchase_plans WHERE id = ?
          `);
          prStmt.bind([input.purchasePlanId]);
          if (prStmt.step()) {
            const r = prStmt.getAsObject() as any;
            oldPRState = {
              execution_status: r.execution_status || 'pending_execution',
              status: r.status || 'draft',
              related_batch_code: r.related_batch_code || '',
              total_amount: r.total_amount || 0,
            };
          }
          prStmt.free();

          // 执行 UPDATE
          db.run(`
            UPDATE purchase_plans
            SET execution_status = 'completed',
                status = 'completed',
                related_batch_code = ?,
                total_amount = ?,
                update_time = ?
            WHERE id = ?
          `, [input.sourceRecordCode, input.purchaseTotalAmount, now, input.purchasePlanId]);
        } else {
          // 5b. 自动创建外购 PR（plan_type='seed_purchase'，区别于生产物资 'production'）
          // 2026-07-14：PR ID 改用 crypto.randomUUID()（替代 Math.random 违规，违反 [[code-generation-contract-rule]] 铁律）
          const purchasePlanId = `PP-${randomUUID()}`;
          // 生成 plan_code：PA + YYYYMM + 4位流水号（与现有 PR 单号规则一致）
          // 加 timestamp 后缀防 UNIQUE 冲突（同一批种源多次入库场景）
          const monthPattern = `${dateStr.slice(0, 6)}___`;
          const codeStmt = db.prepare(`
            SELECT plan_code FROM purchase_plans
            WHERE plan_code LIKE ? AND LENGTH(plan_code) >= 13
            ORDER BY plan_code DESC LIMIT 1
          `);
          codeStmt.bind([`PA${monthPattern}`]);
          let maxSerial = 0;
          if (codeStmt.step()) {
            const r = codeStmt.getAsObject() as { plan_code: string };
            const tail = r.plan_code.slice(-4);
            const parsed = parseInt(tail, 10);
            if (!isNaN(parsed)) maxSerial = parsed;
          }
          codeStmt.free();
          const seq = String(maxSerial + 1).padStart(4, '0');
          const tsSuffix = Date.now().toString(36).slice(-3); // 防冲突后缀（36进制时间戳）
          // 2026-07-14：planCode 改用 crypto.randomUUID()（替代 Math.random 违规）
          const planCode = `PA${dateStr.slice(0, 6)}${seq}-${randomUUID().slice(0, 6)}`;
          const productName = input.products[0]?.cropName || '种源';
          const planTitle = `种源采购-${productName}-${input.sourceRecordCode}`;
          db.run(`
            INSERT INTO purchase_plans (
              id, plan_code, plan_title, plan_type,
              supplier_id, supplier_name,
              applicant_id, applicant_name, apply_date,
              total_amount, priority, status, approval_status, execution_status,
              related_batch_code, create_by, create_time, update_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            purchasePlanId, planCode, planTitle, 'seed_purchase',
            input.supplierId, input.supplierName || '',
            input.operator || operator, input.operator || operator, input.harvestDate,
            input.purchaseTotalAmount, 'medium', 'completed', 'auto_approved', 'completed',
            input.sourceRecordCode,
            operator, now, now,
          ]);
          createdPurchasePlanId = purchasePlanId;

          // 回填到 harvest_records.purchase_plan_id（之前留 null）
          db.run('UPDATE harvest_records SET purchase_plan_id = ? WHERE id = ?', [purchasePlanId, harvestRecordId]);
        }

        // ==== 第 6 步：自动归集 material_costs（去重：按 batch_code+supplier_id+cost_type） ====
        const dupStmt = db.prepare(`
          SELECT id FROM material_costs
          WHERE batch_code = ? AND supplier_id = ? AND cost_type = 'seed'
          LIMIT 1
        `);
        dupStmt.bind([input.sourceRecordCode, input.supplierId]);
        const existing = dupStmt.step() ? (dupStmt.getAsObject() as any).id : null;
        dupStmt.free();
        if (!existing) {
          // 反推 quantity = purchaseTotalAmount / purchasePrice（避免重复存 quantity）
          const purchasePrice = input.purchasePrice || 0;
          const totalQty = purchasePrice > 0
            ? input.purchaseTotalAmount / purchasePrice
            : (input.products.reduce((s, p) => s + (p.harvestQuantity || 0), 0));
          // 2026-07-14：MC ID 改用 crypto.randomUUID()（替代 Math.random 违规）
          const materialCostId = `MC-${randomUUID()}`;
          // 2026-07-14：costCode 改用 crypto.randomUUID()（替代 Math.random 违规）
          const costCode = `MC${dateStr}${randomUUID().slice(0, 3).toUpperCase()}`;
          const productName = input.products[0]?.cropName || '种源';
          const productVariety = input.products[0]?.cropVariety || '';
          const costName = productVariety ? `${productName}-${productVariety}` : productName;
          const greenhouseName = input.greenhouseNames?.[0] || null;
          db.run(`
            INSERT INTO material_costs (
              id, cost_code, cost_type, cost_name,
              batch_id, batch_code,
              greenhouse_name,
              crop_name, material_name, unit,
              quantity, unit_price, total_amount,
              cost_date, supplier_id, supplier_name,
              create_by, create_time, update_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            materialCostId, costCode, 'seed', costName,
            input.sourceRecordId, input.sourceRecordCode,
            greenhouseName,
            productName, costName, input.unit,
            totalQty, purchasePrice, input.purchaseTotalAmount,
            input.harvestDate,
            input.supplierId, input.supplierName || '',
            operator, now, now,
          ]);
          createdMaterialCostId = materialCostId;
        }
      } catch (step56Err) {
        // ==== 5/6 步失败 — 回滚自身已写入的记录 + 重新抛错让外层 catch 处理 4 表回滚 ====
        console.error('[executeInboundFromSource] step 5/6 failed, rolling back purchase_plans/material_costs:', step56Err);
        try {
          // 回滚 seed_sources 数量（如已回写）
          if (rolledBackSeedSourceQuantity) {
            const totalQty = input.products.reduce((s: number, p: any) => s + (p.harvestQuantity || 0), 0);
            try {
              db.run(`
                UPDATE seed_sources
                SET quantity = MAX(0, quantity - ?),
                    remaining_quantity = MAX(0, remaining_quantity - ?),
                    update_time = ?
                WHERE id = ? AND deleted_at IS NULL
              `, [totalQty, totalQty, now, input.sourceRecordId]);
            } catch (e) { console.warn('[rollback] restore seed_source quantity failed:', e); }
          }
          // 回滚 material_costs（如已写入）
          if (createdMaterialCostId) {
            try { db.run('DELETE FROM material_costs WHERE id = ?', [createdMaterialCostId]); } catch (e) { console.warn('[rollback] delete material_cost failed:', e); }
          }
          // 回滚 harvest_records.purchase_plan_id 回填（无论 PR 是否已创建都尝试清空）
          try { db.run('UPDATE harvest_records SET purchase_plan_id = NULL WHERE id = ?', [harvestRecordId]); } catch (e) { console.warn('[rollback] clear harvest.purchase_plan_id failed:', e); }
          // 回滚 purchase_plans
          if (input.purchasePlanId && oldPRState) {
            // 5a 场景：恢复旧 PR 状态（防止 PR 永久残留 completed 状态指向已删除的记录）
            try {
              db.run(`
                UPDATE purchase_plans
                SET execution_status = ?, status = ?, related_batch_code = ?, total_amount = ?, update_time = ?
                WHERE id = ?
              `, [oldPRState.execution_status, oldPRState.status, oldPRState.related_batch_code, oldPRState.total_amount, now, input.purchasePlanId]);
            } catch (e) { console.warn('[rollback] restore purchase_plan failed:', e); }
          } else if (createdPurchasePlanId && !input.purchasePlanId) {
            // 5b 场景：删除自动创建的 PR
            try { db.run('DELETE FROM purchase_plans WHERE id = ?', [createdPurchasePlanId]); } catch (e) { console.warn('[rollback] delete purchase_plan failed:', e); }
          }
          saveDatabase();
        } catch (rollbackErr) {
          console.error('[executeInboundFromSource] step 5/6 rollback error:', rollbackErr);
        }
        // 重新抛错 → 外层 catch 处理 4 表回滚（严格事务）
        throw step56Err;
      }
    }

    // 全部成功 — 提交 + 持久化
    saveDatabase();
    return {
      harvestRecordId,
      harvestCode,
      stockIds: writtenStockIds,
      transactionIds: writtenTransactionIds,
      purchasePlanId: createdPurchasePlanId,        // 2026-07-06：外购 PR ID（外购时返回，否则 null）
      materialCostId: createdMaterialCostId,        // 2026-07-06：物料成本 ID（外购时返回，否则 null）
    };
  } catch (err) {
    // 4 步回滚：反序 DELETE
    console.error('[executeInboundFromSource] failed, rolling back:', err);
    try {
      // 回滚 seed_sources 数量（如已回写，比 4 步更后执行因此先回滚）
      if (rolledBackSeedSourceQuantity) {
        const totalQty = input.products.reduce((s: number, p: any) => s + (p.harvestQuantity || 0), 0);
        try {
          db.run(`
            UPDATE seed_sources
            SET quantity = MAX(0, quantity - ?),
                remaining_quantity = MAX(0, remaining_quantity - ?),
                update_time = ?
            WHERE id = ? AND deleted_at IS NULL
          `, [totalQty, totalQty, now, input.sourceRecordId]);
        } catch (e) { console.warn('[rollback] restore seed_source quantity failed:', e); }
      }
      // 步骤 4 → 3 → 2 → 1 反序
      for (const txId of writtenTransactionIds) {
        try { db.run('DELETE FROM inventory_transaction WHERE id = ?', [txId]); } catch (e) { console.warn('[rollback] delete inventory_transaction failed:', e); }
      }
      for (const recordId of writtenRecordIds) {
        try { db.run('DELETE FROM inventory_inbound_records WHERE id = ?', [recordId]); } catch (e) { console.warn('[rollback] delete inventory_inbound_records failed:', e); }
      }
      for (const stockId of writtenStockIds) {
        try { db.run('DELETE FROM inventory_stock WHERE id = ?', [stockId]); } catch (e) { console.warn('[rollback] delete inventory_stock failed:', e); }
      }
      saveDatabase();
    } catch (rollbackErr) {
      console.error('[executeInboundFromSource] rollback error:', rollbackErr);
    }
    throw err;
  }
}
