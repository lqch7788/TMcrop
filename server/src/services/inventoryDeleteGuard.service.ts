/**
 * 2026-07-03：库存/采收删除共享校验服务
 *
 * 修复"采收删除破坏追溯链"bug：4 条删除路径（harvest.ts / inventory.ts / planting.ts）
 * 各自为政，部分路径完全漏检下游出库流水。
 *
 * 核心规则：
 * - 如果 inventory_stock 的 instance_id 在 inventory_transaction 中有任何非 inbound 流水
 *   （出库/调拨/损耗等），则该 stock 和关联的 harvest_record 都不能删除
 * - 如果 inventory_stock 有冻结（frozen_quantity > 0），也不能删除
 *
 * 2026-07-03 v2：增强错误响应，返回精确的阻挡记录详情
 *   - 作物库存实例ID、作物名、品种、当前数量、仓库
 *   - 每个阻挡的出库记录：流水ID、类型、数量、关联业务单号、操作人、操作时间
 *
 * ====================================================================================================
 * 2026-07-08 架构决策：物理删除 vs "已用完"状态（不要轻易物理删除！）
 * ====================================================================================================
 *
 * 用户问："作物库存数量已经变成 0，是否可以物理删除这行？"
 *
 * 答案：**强烈不建议物理删除**，即使 current_quantity = 0 也应保留行。
 * 推荐做法：保留 inventory_stock 行，把 status 改为 'empty'（已用完）作为软标记。
 *
 * 物理删除的 5 大风险（即使通过所有 4 层保护，即"无冻结 + 无下游流水"）：
 *   1. **追溯链悬空引用**：inventory_inbound_records / inventory_transaction 中
 *      的 instance_id 仍指向已删除的 stock → 库存详情弹窗"上下游追溯" tab 信息缺失
 *   2. **库存汇总统计漏算**：useInventoryStore.stats 实时聚合 inventory_stock，删除后该 row 不计入
 *   3. **库存历史时间轴"断点"**：用户看库存趋势时会"突然消失"
 *   4. **删除不可逆**：按 [[no-data-modification-without-permission]] 铁律，DB 删了就没了
 *      （git reset 禁用，data/.db 不在 Git 恢复范围内）
 *   5. **历史审计价值丢失**：即使是 0 数量的行，create_time / operator / 入库批次号
 *      都是有审计价值的（元数据 ≠ 业务数量）
 *
 * "数量=0"的可能场景（已通过保护检查后仍可被删的情况）：
 *   - 从未出库过的纯 0（极少见，通常是初始化或调整失误）
 *   - 已经被 status='empty' 标记，但用户想再清理
 *
 * 处理建议：
 *   - 首选：保留行 + status='empty'（系统已设计此状态）
 *   - 次选：业务审批通过后，由 DBA 走物理清理脚本（不在前端 UI 暴露）
 *   - 禁止：用户在 UI 上一键删除"用完"的库存
 *
 * 当前 DeleteConfirmModal 已在 InventoryV3.tsx 调用时传入追溯链风险提示
 * （description prop），告诉用户"删除有出库记录的库存会破坏追溯链"。
 */

import { getDatabase } from '../db';

/** 业务类型中文化（与 src/constants/outboundConstants.ts 同步） */
const TX_TYPE_LABEL: Record<string, string> = {
  inbound: '入库',
  outbound: '出库',
  transfer_out: '调拨出库',
  transfer_in: '调拨入库',
  damage_loss: '损耗',
  internal_planting: '内部种植自留',
  internal_seedling: '内部育苗',
  internal_seed_source: '内部种源调拨',
  customer_sale: '销售出库',
  gift_sample: '赠送/样品',
  return_inbound: '退库入库',
  inventory_adjust: '库存调整',
  other: '其他',
};

const BIZ_TYPE_LABEL: Record<string, string> = {
  internal_planting: '内部种植',
  internal_seedling: '内部育苗',
  internal_seed_source: '内部种源调拨',
  customer_sale: '客户销售',
  transfer_out: '调拨出库',
  damage_loss: '报损',
  gift_sample: '赠送/样品',
  return_inbound: '退库',
  inventory_adjust: '库存调整',
  other: '其他',
};

function labelTxType(t: string): string {
  return TX_TYPE_LABEL[t] || t || '-';
}
function labelBizType(t: string): string {
  return BIZ_TYPE_LABEL[t] || t || '-';
}

/** 单个出库/调拨阻挡详情 */
export interface BlockingTransaction {
  txId: string;           // inventory_transaction.id（如 TRX-20260703-0003）
  txType: string;         // 出库类型（outbound/transfer_out 等）
  qty: number;            // 出库数量（正值）
  businessCode: string;   // 关联业务单号
  businessType: string;   // 业务类型（internal_planting/internal_seed_source 等）
  operatorName: string;   // 操作人
  operateDate: string;    // 操作日期
}

/** 作物库存记录详情（含阻挡的出库流水列表） */
export interface BlockingStockRecord {
  instanceId: string;     // 库存实例ID（如 ISE-20260703-0001）
  cropName: string;       // 作物名称
  cropVariety: string;    // 作物品种
  currentQty: number;     // 当前库存数量
  unit: string;           // 单位
  warehouseName: string;  // 仓库名称
  transactions: BlockingTransaction[];  // 阻挡删除的出库/调拨流水列表
}

export interface DeleteCheckResult {
  ok: boolean;
  error?: string;
  /** 阻挡的作物库存列表（仅 harvest 删除时返回） */
  blockingRecords?: BlockingStockRecord[];
  /** 阻挡的出库流水列表（仅 stock 删除时返回） */
  blockingTransactions?: BlockingTransaction[];
}

/**
 * 检查 harvest_record 是否可以被删除
 * @param harvestRecordId harvest_records.id
 */
export function checkHarvestRecordDeletable(harvestRecordId: string): DeleteCheckResult {
  const db = getDatabase();

  // 1. 校验 harvest_record 存在
  const existStmt = db.prepare('SELECT id FROM harvest_records WHERE id = ?');
  existStmt.bind([harvestRecordId]);
  const exists = existStmt.step();
  existStmt.free();
  if (!exists) {
    return { ok: false, error: '采收记录不存在' };
  }

  // 2. 校验 inventory_freeze 无冻结
  const freezeStmt = db.prepare('SELECT id, status, freeze_quantity FROM inventory_freeze WHERE harvest_record_id = ?');
  freezeStmt.bind([harvestRecordId]);
  if (freezeStmt.step()) {
    const freezeRow = freezeStmt.getAsObject() as any;
    freezeStmt.free();
    return { ok: false, error: `该入库记录已关联冻结单（id=${freezeRow.id}，状态=${freezeRow.status}），请先解除冻结再删除` };
  }
  freezeStmt.free();

  // 3. 校验关联 inventory_stock 无冻结
  const stockFreezeStmt = db.prepare(`SELECT id, frozen_quantity, current_quantity, instance_id FROM inventory_stock WHERE business_id = ? AND business_type = 'harvest'`);
  stockFreezeStmt.bind([harvestRecordId]);
  const blockingStocks: any[] = [];
  while (stockFreezeStmt.step()) {
    const s = stockFreezeStmt.getAsObject() as any;
    if ((s.frozen_quantity ?? 0) > 0) {
      blockingStocks.push(s);
    }
  }
  stockFreezeStmt.free();
  if (blockingStocks.length > 0) {
    return { ok: false, error: `该入库的库存还有冻结数量未释放（${blockingStocks.length} 条），请先解冻再删除` };
  }

  // 4. 收集所有关联的 inventory_stock（用于 instance_id 链路查找 + 详情展示）
  const stocksStmt = db.prepare(`
    SELECT ist.id AS stock_id, ist.instance_id, ist.crop_name, ist.variety_name,
           ist.current_quantity, ist.unit, COALESCE(ist.warehouse_name, '') AS warehouse_name
    FROM inventory_stock ist
    WHERE ist.business_id = ? AND ist.business_type = 'harvest'
  `);
  stocksStmt.bind([harvestRecordId]);
  const stockList: any[] = [];
  while (stocksStmt.step()) {
    stockList.push(stocksStmt.getAsObject() as any);
  }
  stocksStmt.free();

  // 5. 对每个 stock，查找下游出库/调拨流水
  const blockingRecords: BlockingStockRecord[] = [];
  for (const stock of stockList) {
    const txs = getBlockingTransactionsForInstance(db, stock.instance_id);
    if (txs.length > 0) {
      blockingRecords.push({
        instanceId: stock.instance_id,
        cropName: stock.crop_name || '',
        cropVariety: stock.variety_name || '',
        currentQty: Number(stock.current_quantity) || 0,
        unit: stock.unit || '',
        warehouseName: stock.warehouse_name || '',
        transactions: txs,
      });
    }
  }

  if (blockingRecords.length > 0) {
    // 把每条 transaction 的类型转中文
    const recordsWithLabel = blockingRecords.map(rec => ({
      ...rec,
      transactions: rec.transactions.map(t => ({
        ...t,
        txTypeLabel: labelTxType(t.txType),
        bizTypeLabel: labelBizType(t.businessType),
      })),
    }));
    // 构造人类可读的错误信息
    const count = blockingRecords.reduce((sum, r) => sum + r.transactions.length, 0);
    const names = blockingRecords.map(r =>
      `${r.cropName}(${r.instanceId})`
    ).join('、');
    return {
      ok: false,
      error: `无法删除！以下作物库存已被出库/调拨消耗（共 ${count} 笔），删除会破坏追溯链。\n请先撤销下游出库/调拨记录，再删除本采收记录。\n\n关联的作物库存：${names}`,
      blockingRecords: recordsWithLabel,
    };
  }

  return { ok: true };
}

/**
 * 检查 inventory_stock 是否可以被删除（按 stock id 或 instance_id）
 * @param stockId inventory_stock.id 或 instance_id
 */
export function checkInventoryStockDeletable(stockId: string): DeleteCheckResult {
  const db = getDatabase();

  // 1. 查找 stock 记录（同时获取作物信息）
  const stockStmt = db.prepare(`
    SELECT id, instance_id, crop_name, variety_name, current_quantity, unit,
           frozen_quantity, COALESCE(warehouse_name, '') AS warehouse_name
    FROM inventory_stock WHERE id = ? OR instance_id = ?
  `);
  stockStmt.bind([stockId, stockId]);
  const stockRow = stockStmt.step() ? stockStmt.getAsObject() as any : null;
  stockStmt.free();
  if (!stockRow) {
    return { ok: false, error: `库存记录 ${stockId} 不存在` };
  }

  // 2. 校验无冻结
  if ((stockRow.frozen_quantity ?? 0) > 0) {
    return { ok: false, error: `库存 ${stockRow.instance_id} 还有冻结数量（${stockRow.frozen_quantity}），请先解冻再删除` };
  }

  // 3. 找下游出库/调拨流水
  const txs = getBlockingTransactionsForInstance(db, stockRow.instance_id);
  if (txs.length > 0) {
    const summary = txs.map(t => `${labelTxType(t.txType)}[${t.businessCode}] ×${t.qty}`).join('、');
    // 返回中文化的 txTypeLabel/bizTypeLabel 给前端展示
    const txsWithLabel = txs.map(t => ({
      ...t,
      txTypeLabel: labelTxType(t.txType),
      bizTypeLabel: labelBizType(t.businessType),
    }));
    return {
      ok: false,
      error: `无法删除！作物库存 [${stockRow.crop_name || '-'}/${stockRow.variety_name || '-'}] (${stockRow.instance_id}) 已被以下出库记录消耗：\n${summary}\n请先删除出库记录，再删除此作物库存。`,
      blockingTransactions: txsWithLabel,
    };
  }

  return { ok: true };
}

/**
 * 获取某个 instance_id 的所有下游非 inbound 流水
 */
function getBlockingTransactionsForInstance(db: any, instanceId: string): BlockingTransaction[] {
  const stmt = db.prepare(`
    SELECT id, transaction_type, ABS(quantity) AS qty, business_code, business_type,
           operator_name, operate_date
    FROM inventory_transaction
    WHERE instance_id = ? AND transaction_type != 'inbound'
    ORDER BY operate_date DESC
  `);
  stmt.bind([instanceId]);
  const result: BlockingTransaction[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    result.push({
      txId: row.id,
      txType: row.transaction_type || '',
      qty: Number(row.qty) || 0,
      businessCode: row.business_code || '',
      businessType: row.business_type || '',
      operatorName: row.operator_name || '',
      operateDate: row.operate_date || '',
    });
  }
  stmt.free();
  return result;
}
