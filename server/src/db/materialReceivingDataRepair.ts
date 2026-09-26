/**
 * 2026-09-26：生产领料数据修复（GREEN 级独立模块，随服务启动幂等执行）
 *
 * 背景：2026-09-26 对 /material-receiving 三 tab 深度审计 + 用户明确授权
 * （"需要追溯补库存。清理脏数据"），实施三项数据修复：
 *
 *  1. 双重 JSON 编码规范化 —— 历史数据被 JSON.stringify 两次（materials 列存的是
 *     "字符串化的 JSON 字符串"），导致：
 *       - /api/material-statistics 聚合时 mats.reduce 抛 TypeError → 统计页 500
 *       - 前端出库/申请明细解析失败
 *     涉及列：material_requests.materials、material_executes.materials、
 *             material_executes.source_application_codes
 *
 *  2. execute_status 乱码修复 —— material_executes id=8 的 execute_status 是 mojibake
 *     （'������'），按 execute_status_class 映射回标准中文状态
 *
 *  3. 历史出库单追溯补扣 —— completed/partial 出库单中"从未扣过库存"的物料，
 *     按 FEFO 扣 batch_inventory + 同步扣 materials 主表（与 /api/materials/batch-deduct 一致），
 *     并写 inventory_transaction 流水留痕
 *
 * 幂等保障：inventory_transaction.transaction_type='material_outbound_retroactive' 的
 * 物料级标记行（business_code='material:<code>'），已处理的物料再次启动时直接跳过。
 *
 * 运行入口：repairMaterialReceivingData() — 在 server/src/index.ts 启动钩子调用
 */

import { getDatabase, saveDatabase } from './index';
import { fefoAllocate, deductBatchInventory } from './batchInventory';
import { nowLocalTimestamp } from '../lib/timeUtils';

/** 出库单中"已完成/部分出库"的状态类才参与追溯扣减（待出库不扣） */
const DEDUCTIBLE_CLASSES = new Set(['completed', 'partial']);

/** 追溯补扣流水的事务类型标记（幂等 + 审计） */
const RETRO_MARK = 'material_outbound_retroactive';

/** execute_status_class → 标准中文状态（乱码修复用） */
const STATUS_BY_CLASS: Record<string, string> = {
  completed: '已出库',
  partial: '部分出库',
  pending_out: '待出库',
};

export interface MaterialReceivingRepairResult {
  /** 双重编码规范化：每张表修复的行数 */
  jsonNormalized: { table: string; column: string; count: number }[];
  /** 乱码状态修复明细 */
  mojibakeFixed: { executeCode: string; from: string; to: string }[];
  /** 实际补扣的物料（数量为汇总值） */
  deducted: { materialCode: string; quantity: number; batchQty: number; mainQty: number }[];
  /** 判定"已扣过"、无需再扣的物料 */
  alreadyDeducted: { materialCode: string; executedSum: number }[];
  /** 跳过并告警的明细（无库存可扣/基线不明/库存不足），fail loud 不静默 */
  skippedLines: { executeCode: string; materialCode: string; quantity: number; reason: string }[];
}

/** 宽松解析：JSON.parse 直到结果不是字符串（最多 3 层），解析失败返回原值 */
function deepParse(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 3 && typeof current === 'string'; i++) {
    const text = current as string;
    if (text.trim() === '') return text;
    try {
      current = JSON.parse(text);
    } catch {
      return value; // 非 JSON 字符串，保持原值
    }
  }
  return current;
}

/** 解析 materials / source_application_codes 列，保证返回数组 */
function parseToArray(value: unknown): any[] {
  const parsed = deepParse(value);
  return Array.isArray(parsed) ? parsed : [];
}

/** 读取某表的某列，规范化双重编码，返回修复行数 */
function normalizeJsonColumn(db: any, table: string, column: string): number {
  const results = db.exec(`SELECT id, ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != ''`);
  if (results.length === 0) return 0;
  let fixed = 0;
  for (const row of results[0].values) {
    const id = row[0];
    const raw = row[1];
    const parsed = deepParse(raw);
    // 解析后仍是字符串（无法解析）或原值本身就是规范 JSON 字符串 → 不动
    if (typeof parsed === 'string') continue;
    const normalized = JSON.stringify(parsed);
    if (normalized !== raw) {
      db.run(`UPDATE ${table} SET ${column} = ? WHERE id = ?`, [normalized, id]);
      fixed++;
    }
  }
  return fixed;
}

/** 修复 execute_status 乱码：非法字符状态按 execute_status_class 映射回中文 */
function fixMojibakeExecuteStatus(db: any): MaterialReceivingRepairResult['mojibakeFixed'] {
  const results = db.exec('SELECT id, code, execute_status, execute_status_class FROM material_executes WHERE execute_status IS NOT NULL');
  if (results.length === 0) return [];
  const fixed: { executeCode: string; from: string; to: string }[] = [];
  // 合法状态字符集：中文/字母/数字/空白/常见标点
  const validChars = /^[一-龥a-zA-Z0-9\s\-_/（）()]+$/;
  for (const row of results[0].values) {
    const [id, code, status, statusClass] = row as [string, string, string, string];
    if (validChars.test(status)) continue;
    const target = STATUS_BY_CLASS[statusClass] || '已出库';
    db.run('UPDATE material_executes SET execute_status = ? WHERE id = ?', [target, id]);
    fixed.push({ executeCode: code, from: String(status), to: target });
  }
  return fixed;
}

/** 汇总入库量：inbound_records(status=completed) 按物料编码求和 */
function buildInboundSum(db: any): Map<string, number> {
  const map = new Map<string, number>();
  const results = db.exec("SELECT materials FROM inbound_records WHERE status = 'completed'");
  if (results.length === 0) return map;
  for (const row of results[0].values) {
    for (const item of parseToArray(row[0])) {
      if (!item || typeof item !== 'object') continue;
      const code = item.materialCode || item.code || '';
      if (!code) continue;
      const qty = Number(item.quantity ?? item.inboundQuantity ?? 0) || 0;
      map.set(code, (map.get(code) || 0) + qty);
    }
  }
  return map;
}

/** 汇总历史出库量：material_executes(completed/partial) 按物料编码求和 */
function buildExecutedSum(db: any): Map<string, { total: number; executes: Array<{ id: string; code: string; qty: number }> }> {
  const map = new Map<string, { total: number; executes: Array<{ id: string; code: string; qty: number }> }>();
  const results = db.exec('SELECT id, code, execute_status_class, materials FROM material_executes');
  if (results.length === 0) return map;
  for (const row of results[0].values) {
    const [id, code, statusClass] = row as [string, string, string];
    if (!DEDUCTIBLE_CLASSES.has(statusClass)) continue;
    for (const item of parseToArray(row[3])) {
      if (!item || typeof item !== 'object') continue;
      const materialCode = item.materialCode || item.code || '';
      const qty = Number(item.actualQuantity ?? item.actualQty ?? item.quantity ?? 0) || 0;
      if (!materialCode || qty <= 0) continue;
      const entry = map.get(materialCode) || { total: 0, executes: [] };
      entry.total += qty;
      entry.executes.push({ id, code, qty });
      map.set(materialCode, entry);
    }
  }
  return map;
}

/** 批次现存量汇总 */
function buildBatchSum(db: any): Map<string, number> {
  const map = new Map<string, number>();
  const results = db.exec('SELECT material_code, remaining_quantity FROM batch_inventory');
  if (results.length === 0) return map;
  for (const row of results[0].values) {
    const code = row[0] as string;
    const qty = Number(row[1]) || 0;
    map.set(code, (map.get(code) || 0) + qty);
  }
  return map;
}

/** 主表现存量 */
function buildMainQty(db: any): Map<string, number> {
  const map = new Map<string, number>();
  const results = db.exec('SELECT code, quantity FROM materials');
  if (results.length === 0) return map;
  for (const row of results[0].values) {
    map.set(row[0] as string, Number(row[1]) || 0);
  }
  return map;
}

/** 浮点近似相等（库存账对比容差 0.001） */
function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

/** 物料级幂等标记：是否已执行过追溯补扣 */
function hasMaterialMarker(db: any, materialCode: string): boolean {
  const results = db.exec(
    'SELECT id FROM inventory_transaction WHERE transaction_type = ? AND business_code = ?',
    [RETRO_MARK, `material:${materialCode}`]
  );
  return results.length > 0 && results[0].values.length > 0;
}

/** 写一条追溯补扣流水（幂等标记 + 审计） */
function insertRetroTransaction(
  db: any,
  seq: number,
  fields: {
    instanceId: string;
    quantity: number;
    balanceBefore: number;
    balanceAfter: number;
    businessId: string;
    businessCode: string;
    remarks: string;
  }
): void {
  const now = nowLocalTimestamp();
  const id = `RETRO-${now.replace(/[-: ]/g, '')}-${seq}`;
  db.run(
    `INSERT INTO inventory_transaction
      (id, transaction_id, instance_id, stock_type, transaction_type, quantity,
       balance_before, balance_after, business_id, business_type, business_code,
       operator_id, operator_name, operate_date, remarks, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, id, fields.instanceId, 'material', RETRO_MARK, fields.quantity,
      fields.balanceBefore, fields.balanceAfter, fields.businessId,
      'material_execute', fields.businessCode,
      'system', '追溯补扣迁移', now, fields.remarks, now,
    ]
  );
}

/**
 * 主入口：三项修复按序执行（规范化 → 乱码 → 追溯补扣），全部幂等
 */
export function repairMaterialReceivingData(): MaterialReceivingRepairResult {
  const db = getDatabase();
  const result: MaterialReceivingRepairResult = {
    jsonNormalized: [],
    mojibakeFixed: [],
    deducted: [],
    alreadyDeducted: [],
    skippedLines: [],
  };

  // ---------- 1. 双重 JSON 编码规范化 ----------
  const targets: Array<[string, string]> = [
    ['material_requests', 'materials'],
    ['material_executes', 'materials'],
    ['material_executes', 'source_application_codes'],
  ];
  for (const [table, column] of targets) {
    try {
      const count = normalizeJsonColumn(db, table, column);
      result.jsonNormalized.push({ table, column, count });
    } catch (e: any) {
      // 表或列不存在（老库缺表）时跳过，不阻断启动
      result.jsonNormalized.push({ table, column, count: -1 });
      console.warn(`[materialReceivingDataRepair] 规范化 ${table}.${column} 失败（跳过）:`, e?.message || e);
    }
  }

  // ---------- 2. execute_status 乱码修复 ----------
  try {
    result.mojibakeFixed = fixMojibakeExecuteStatus(db);
  } catch (e: any) {
    console.warn('[materialReceivingDataRepair] execute_status 乱码修复失败（跳过）:', e?.message || e);
  }

  // ---------- 3. 历史出库单追溯补扣 ----------
  try {
    const executedMap = buildExecutedSum(db);
    if (executedMap.size > 0) {
    const inboundMap = buildInboundSum(db);
    const batchMap = buildBatchSum(db);
    const mainMap = buildMainQty(db);

    let seq = 0;
    for (const [materialCode, info] of executedMap) {
      const executed = info.total;
      if (hasMaterialMarker(db, materialCode)) continue; // 已处理过，幂等跳过

      const inbound = inboundMap.get(materialCode) || 0;
      const batchSum = batchMap.get(materialCode);
      const mainQty = mainMap.get(materialCode);

      // —— 批次账判定 ——
      // 有入库基线：现存量 == 入库-出库 → 已扣；== 入库 → 未扣，需补；其他 → 基线不明
      let batchToDeduct = 0;
      let mainToDeduct = 0;
      let batchAmbiguous = false;
      let mainAmbiguous = false;

      if (batchSum !== undefined) {
        if (inbound > 0) {
          if (approxEqual(batchSum, inbound - executed)) {
            // 批次账已扣，无需动作
          } else if (approxEqual(batchSum, inbound)) {
            batchToDeduct = executed;
          } else {
            batchAmbiguous = true;
          }
        } else {
          batchAmbiguous = true; // 有批次但无入库基线，无法判定
        }
      }

      // —— 主表账判定 ——
      if (mainQty !== undefined) {
        if (inbound > 0) {
          if (approxEqual(mainQty, inbound - executed)) {
            // 主表已扣
          } else if (approxEqual(mainQty, inbound)) {
            mainToDeduct = executed;
          } else {
            mainAmbiguous = true;
          }
        } else {
          // 无入库基线：无法区分"已扣"与"未扣"，一律跳过避免多扣（需人工核对）
          // 注：2026-09-26 曾发现并行会话已直接改过库存，无条件补扣会造成重复扣减
          mainAmbiguous = true;
        }
      }

      if (batchAmbiguous || mainAmbiguous) {
        for (const ex of info.executes) {
          result.skippedLines.push({
            executeCode: ex.code,
            materialCode,
            quantity: ex.qty,
            reason: '库存基线不明（现存量与入库-出库推算均不吻合），跳过避免多扣，需人工核对',
          });
        }
        // 写标记避免每次启动重复判定告警
        insertRetroTransaction(db, ++seq, {
          instanceId: materialCode,
          quantity: 0,
          balanceBefore: 0,
          balanceAfter: 0,
          businessId: 'material',
          businessCode: `material:${materialCode}`,
          remarks: '追溯补扣：基线不明已跳过（审计标记，需人工核对）',
        });
        continue;
      }

      if (batchToDeduct === 0 && mainToDeduct === 0) {
        if (batchSum === undefined && mainQty === undefined) {
          // 无批次、无主表行 → 无库存可扣
          for (const ex of info.executes) {
            result.skippedLines.push({
              executeCode: ex.code,
              materialCode,
              quantity: ex.qty,
              reason: '无批次库存且无主表记录，无库存可扣',
            });
          }
          // 写标记避免每次启动重复告警
          insertRetroTransaction(db, ++seq, {
            instanceId: materialCode,
            quantity: 0,
            balanceBefore: 0,
            balanceAfter: 0,
            businessId: 'material',
            businessCode: `material:${materialCode}`,
            remarks: '追溯补扣：无库存记录已跳过（审计标记）',
          });
          continue;
        }
        // 各账均已扣过（现存量 == 入库 - 出库 或等价），无需再扣
        result.alreadyDeducted.push({ materialCode, executedSum: executed });
        // 写标记（不写明细），避免每次启动重复判定
        insertRetroTransaction(db, ++seq, {
          instanceId: materialCode,
          quantity: 0,
          balanceBefore: 0,
          balanceAfter: 0,
          businessId: 'material',
          businessCode: `material:${materialCode}`,
          remarks: '追溯补扣：判定已扣过，跳过（审计标记）',
        });
        continue;
      }

      // —— 执行补扣 ——
      const balanceBefore = (batchSum ?? 0) + (mainQty ?? 0);

      if (batchToDeduct > 0) {
        const { allocations, fulfilled } = fefoAllocate(materialCode, batchToDeduct);
        if (fulfilled < batchToDeduct) {
          for (const ex of info.executes) {
            result.skippedLines.push({
              executeCode: ex.code,
              materialCode,
              quantity: ex.qty,
              reason: `批次库存不足（需 ${batchToDeduct}，可分配 ${fulfilled}），跳过避免错账`,
            });
          }
          continue; // 整单跳过，不部分扣（保持账目可核对）
        }
        deductBatchInventory(allocations.map((a) => ({ materialCode, batchNo: a.batchNo, quantity: a.quantity })));
      }

      if (mainToDeduct > 0) {
        db.run('UPDATE materials SET quantity = MAX(0, quantity - ?), lastUpdateTime = ? WHERE code = ?', [
          mainToDeduct,
          nowLocalTimestamp(),
          materialCode,
        ]);
      }

      const deductedTotal = batchToDeduct + mainToDeduct;
      const balanceAfter = Math.max(0, balanceBefore - deductedTotal);
      result.deducted.push({ materialCode, quantity: deductedTotal, batchQty: batchToDeduct, mainQty: mainToDeduct });

      // 物料级标记（幂等）
      insertRetroTransaction(db, ++seq, {
        instanceId: materialCode,
        quantity: deductedTotal,
        balanceBefore,
        balanceAfter,
        businessId: 'material',
        businessCode: `material:${materialCode}`,
        remarks: '历史出库单追溯补扣（2026-09-26 用户授权）',
      });
      // 出库单级明细（审计：每张单扣了什么）
      for (const ex of info.executes) {
        insertRetroTransaction(db, ++seq, {
          instanceId: materialCode,
          quantity: ex.qty,
          balanceBefore: 0,
          balanceAfter: 0,
          businessId: ex.id,
          businessCode: ex.code,
          remarks: '追溯补扣明细（关联出库单）',
        });
      }
    }
    }

    saveDatabase();
  } catch (e: any) {
    console.warn('[materialReceivingDataRepair] 追溯补扣失败（不影响主流程）:', e?.message || e);
  }

  return result;
}
