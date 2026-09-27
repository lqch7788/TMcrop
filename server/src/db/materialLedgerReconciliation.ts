/**
 * 2026-09-27：领料链路存量数据对账修复（GREEN 级独立模块，随服务启动幂等执行）
 *
 * 背景：2026-09-27 生产领料全链路深度审计 + 用户明确授权（"全部修复，批1、批2、批3所有问题"），
 * 修复三类存量数据问题（均有实测证据）：
 *
 *  1. 物料两本账对账（实测 19/74 物料不一致）
 *     materials.quantity（主表，权威来源：UI 展示/超发校验均以它为准）与
 *     batch_inventory 合计（批次账，FEFO 分配用）长期各写各的、无对账机制。
 *     规则：批次账为空 → 建"默认批次"承接主表量；批次少 → 差额补进"期初校准"批次；
 *           批次多 → 按 FEFO（最早到期优先）依次扣减。
 *
 *  2. 出库单孤儿引用清理（实测 1 例：CK20260314008 → LL20260314014 已不存在）
 *     source_application_codes 中已不存在的申请单号移除（此前删除保护缺失所致，
 *     删除保护已在 materialRequest.ts DELETE 修复，本脚本仅清理存量）。
 *
 *  3. 幽灵审批单清理（实测 11 张 pending 指向已删除的申请单）
 *     指向不存在申请单的 pending 审批单标记为 cancelled（保留审计痕迹，不物理删除）。
 *
 * 幂等保障：对账后差额归零、孤儿引用清空、幽灵单不再命中条件——重复启动无副作用。
 * 运行入口：reconcileMaterialLedger() — 在 server/src/index.ts 启动钩子调用。
 */

import { getDatabase, saveDatabase } from './index';
import { nowLocalTimestamp } from '../lib/timeUtils';

/** 浮点容差（元/数量级） */
const EPS = 0.01;
/** 无批次行时的承接批次名（与出库扣减自动建批次同名） */
const DEFAULT_BATCH = '默认批次';
/** 批次少于主表时补差额的校准批次名 */
const RECON_BATCH = '期初校准';

export interface LedgerReconciliationResult {
  /** 重复物料编码重分配明细（同 code 多行：保留被业务引用的行，其余行改空闲码） */
  duplicateCodesResolved: { oldCode: string; keptId: unknown; renamed: { id: unknown; name: string; newCode: string }[] }[];
  /** 两本账调整明细（fail loud：逐物料输出动作） */
  ledgerAdjusted: { code: string; mainQty: number; batchQtyBefore: number; diff: number; action: string }[];
  /** 孤儿引用清理明细 */
  orphanRefsCleaned: { executeCode: string; removedCodes: string[] }[];
  /** 幽灵审批单取消明细 */
  ghostApprovalsCancelled: { approvalId: string; requestCode: string }[];
}

/** 四舍五入到分/两位小数，消除浮点尾差 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 该编码是否被业务单据引用（申请单/出库单明细中的 materialCode） */
function isCodeReferenced(db: any, code: string): boolean {
  const q1 = db.exec('SELECT 1 FROM material_requests WHERE materials LIKE ? LIMIT 1', [`%${code}%`]);
  if (q1.length > 0 && q1[0].values.length > 0) return true;
  const q2 = db.exec('SELECT 1 FROM material_executes WHERE materials LIKE ? LIMIT 1', [`%${code}%`]);
  return q2.length > 0 && q2[0].values.length > 0;
}

/** 按"前缀+递增数字"寻找空闲编码（保持编码长度与尾号位数一致） */
function findFreeCode(base: string, used: Set<string>): string {
  const m = base.match(/^(.*?)(\d+)$/);
  const prefix = m ? m[1] : base;
  const width = m ? m[2].length : 3;
  let num = m ? parseInt(m[2], 10) : 0;
  for (let i = 0; i < 10000; i++) {
    num += 1;
    const candidate = prefix + String(num).padStart(width, '0');
    if (!used.has(candidate)) return candidate;
  }
  return `${base}X${Date.now()}`;
}

/**
 * 重复物料编码处理（2026-09-27 新增，实测 2 组）：
 * 物料主数据建单时未查重（历史导入脚本所致），同一 code 出现多行。
 * 规则：保留"被业务单据引用"的行（如无则保留 id 最小行），其余行重新分配空闲编码，
 * 并同步这些行名下批次账的 material_code（按 material_name 匹配归属）。
 */
function resolveDuplicateCodes(
  db: any,
  result: LedgerReconciliationResult
): void {
  const dupRows = db.exec(
    'SELECT code, GROUP_CONCAT(id) AS ids FROM materials GROUP BY code HAVING COUNT(*) > 1'
  );
  if (dupRows.length === 0 || dupRows[0].values.length === 0) return;

  // 现有全部编码（含待处理组），用于找空闲码
  const used = new Set<string>();
  const allCodes = db.exec('SELECT code FROM materials');
  if (allCodes.length > 0) allCodes[0].values.forEach((v: unknown[]) => used.add(String(v[0])));

  const now = nowLocalTimestamp();
  for (const row of dupRows[0].values) {
    const code = String(row[0] || '');
    const ids = String(row[1] || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!code || ids.length < 2) continue;

    // 读每行明细
    const rows: { id: string; name: string }[] = [];
    for (const rid of ids) {
      const r = db.exec('SELECT id, name FROM materials WHERE id = ?', [rid]);
      if (r.length > 0 && r[0].values.length > 0) {
        rows.push({ id: String(r[0].values[0][0]), name: String(r[0].values[0][1] || '') });
      }
    }
    if (rows.length < 2) continue;

    // 保留行：优先被业务引用的行；否则 id 最小（最早创建）
    let keep = rows.find((r) => isCodeReferenced(db, code)) || null;
    if (!keep) {
      keep = rows.slice().sort((a, b) => Number(a.id) - Number(b.id))[0];
    }

    const renamed: { id: unknown; name: string; newCode: string }[] = [];
    for (const r of rows) {
      if (r.id === keep.id) continue;
      const newCode = findFreeCode(code, used);
      used.add(newCode);
      db.run('UPDATE materials SET code = ?, lastUpdateTime = ? WHERE id = ?', [newCode, now, r.id]);
      // 同步该行名下批次账（按物料名匹配，避免误改保留行的批次）
      db.run(
        'UPDATE batch_inventory SET material_code = ?, update_time = ? WHERE material_code = ? AND material_name = ?',
        [newCode, now, code, r.name]
      );
      renamed.push({ id: r.id, name: r.name, newCode });
    }
    if (renamed.length > 0) {
      result.duplicateCodesResolved.push({ oldCode: code, keptId: keep.id, renamed });
    }
  }
}

export function reconcileMaterialLedger(): LedgerReconciliationResult {
  const db = getDatabase();
  const result: LedgerReconciliationResult = {
    duplicateCodesResolved: [],
    ledgerAdjusted: [],
    orphanRefsCleaned: [],
    ghostApprovalsCancelled: [],
  };
  const now = nowLocalTimestamp();

  // ==================== 0a. 重复物料编码处理（必须先于两本账对账：对账按 code 唯一假设） ====================
  resolveDuplicateCodes(db, result);

  // ==================== 0b. 清理历史对账残留的"期初校准"空行（remaining<=0 的校准行无业务意义） ====================
  db.run(`DELETE FROM batch_inventory WHERE batch_no = ? AND remaining_quantity <= 0`, [RECON_BATCH]);

  // ==================== 1. 物料两本账对账 ====================
  const matsRows = db.exec('SELECT code, quantity FROM materials');
  // 2026-09-27 修复（P0-2）：反向对账——此前只从主表出发遍历，
  // "批次账有量但主表无行"的幽灵库存（物料主数据被删但批次账残留，实测 EQ0103001/PH0105001）
  // 永远不被修复；物料库存页看不到、FEFO 却仍可分配。此处补建主表总量行。
  {
    const mainCodes = new Set<string>();
    if (matsRows.length > 0) {
      matsRows[0].values.forEach((v: unknown[]) => mainCodes.add(String(v[0] || '')));
    }
    const batchCodes = db.exec(
      'SELECT material_code, SUM(remaining_quantity), MAX(material_name) FROM batch_inventory GROUP BY material_code'
    );
    if (batchCodes.length > 0) {
      for (const row of batchCodes[0].values) {
        const code = String(row[0] || '');
        const total = Number(row[1]) || 0;
        const name = String(row[2] || '');
        if (!code || total <= 0 || mainCodes.has(code)) continue;
        // 主表 batchNo 取该码剩余量最大的批次号（仅供展示，账务权威在批次账）
        const top = db.exec(
          'SELECT batch_no FROM batch_inventory WHERE material_code = ? AND remaining_quantity > 0 ORDER BY remaining_quantity DESC LIMIT 1',
          [code]
        );
        const batchNo = top.length > 0 && top[0].values.length > 0 ? String(top[0].values[0][0]) : DEFAULT_BATCH;
        // 2026-09-27 修复：补建行必须补全字段默认值——此前 category/price 等为 NULL，
        // 物料库存页 MaterialsTable 的 price.replace('元','') 直接崩溃（白屏）
        db.run(
          `INSERT INTO materials (code, name, category, specification, unit, quantity, minStock, maxStock, price, supplier, location, barcode, batchNo, productionDate, expiryDate, lastUpdateTime, dataStatus)
           VALUES (?, ?, '', '', '袋', ?, 0, 0, '', '', '', '', ?, '', '', ?, '启用')`,
          [code, name, total, batchNo, now]
        );
        result.ledgerAdjusted.push({
          code, mainQty: total, batchQtyBefore: total, diff: 0,
          action: `反向补建主表行（批次账有量 ${total} 但主表缺行）`,
        });
      }
    }
  }
  if (matsRows.length > 0) {
    for (const row of matsRows[0].values) {
      const materialCode = String(row[0] || '');
      if (!materialCode) continue;
      const mainQty = Number(row[1]) || 0;

      const bRows = db.exec(
        'SELECT IFNULL(SUM(remaining_quantity),0), COUNT(*) FROM batch_inventory WHERE material_code = ?',
        [materialCode]
      );
      const batchTotal = bRows.length > 0 ? Number(bRows[0].values[0][0]) || 0 : 0;
      const batchCount = bRows.length > 0 ? Number(bRows[0].values[0][1]) || 0 : 0;
      const diff = round2(mainQty - batchTotal);
      if (Math.abs(diff) < EPS) continue;

      if (batchCount === 0) {
        // 批次账为空：主表有量才需要承接（两账都空无需处理）
        if (mainQty <= 0) continue;
        db.run(
          `INSERT INTO batch_inventory (id, material_code, material_name, batch_no, production_date, expiry_date, unit, total_quantity, remaining_quantity, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`bi-recon-${materialCode}-${Date.now()}`, materialCode, '', DEFAULT_BATCH, '', '', '', mainQty, mainQty, now, now]
        );
        result.ledgerAdjusted.push({
          code: materialCode, mainQty, batchQtyBefore: 0, diff,
          action: `批次账为空 → 新建「${DEFAULT_BATCH}」承接主表量 ${mainQty}`,
        });
      } else if (diff > 0) {
        // 批次少于主表：差额补进"期初校准"批次（不存在则建）
        const cal = db.exec(
          'SELECT id FROM batch_inventory WHERE material_code = ? AND batch_no = ?',
          [materialCode, RECON_BATCH]
        );
        if (cal.length > 0 && cal[0].values.length > 0) {
          db.run(
            'UPDATE batch_inventory SET remaining_quantity = remaining_quantity + ?, update_time = ? WHERE material_code = ? AND batch_no = ?',
            [diff, now, materialCode, RECON_BATCH]
          );
        } else {
          db.run(
            `INSERT INTO batch_inventory (id, material_code, material_name, batch_no, production_date, expiry_date, unit, total_quantity, remaining_quantity, create_time, update_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [`bi-cal-${materialCode}-${Date.now()}`, materialCode, '', RECON_BATCH, '', '', '', diff, diff, now, now]
          );
        }
        result.ledgerAdjusted.push({
          code: materialCode, mainQty, batchQtyBefore: batchTotal, diff,
          action: `批次少 ${diff} → 补进「${RECON_BATCH}」批次`,
        });
      } else {
        // 批次多于主表：按 FEFO（最早到期优先）依次扣减
        let excess = round2(-diff);
        const lots = db.exec(
          `SELECT id, batch_no, remaining_quantity FROM batch_inventory
           WHERE material_code = ? AND remaining_quantity > 0
           ORDER BY expiry_date ASC NULLS LAST, create_time ASC`,
          [materialCode]
        );
        let deductedTotal = 0;
        if (lots.length > 0) {
          for (const lot of lots[0].values) {
            if (excess <= EPS) break;
            const lotId = lot[0];
            const lotRemaining = Number(lot[2]) || 0;
            const take = Math.min(lotRemaining, excess);
            if (take <= 0) continue;
            db.run(
              'UPDATE batch_inventory SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE id = ?',
              [take, now, lotId]
            );
            excess = round2(excess - take);
            deductedTotal = round2(deductedTotal + take);
          }
        }
        result.ledgerAdjusted.push({
          code: materialCode, mainQty, batchQtyBefore: batchTotal, diff,
          action: `批次多 ${-diff} → FEFO 扣减 ${deductedTotal}${excess > EPS ? `（冲不完，仍多 ${excess}：批次全为 0）` : ''}`,
        });
      }
    }
  }

  // ==================== 2. 出库单孤儿引用清理 ====================
  const reqCodeSet = new Set<string>();
  const rq = db.exec('SELECT request_code FROM material_requests');
  if (rq.length > 0) rq[0].values.forEach((v) => reqCodeSet.add(String(v[0])));

  const exRows = db.exec('SELECT code, source_application_codes FROM material_executes');
  if (exRows.length > 0) {
    for (const row of exRows[0].values) {
      const executeCode = String(row[0] || '');
      let list: string[] = [];
      try {
        const p = JSON.parse(String(row[1] || '[]'));
        list = Array.isArray(p) ? p.map(String) : [];
      } catch { continue; }
      if (list.length === 0) continue;
      const valid = list.filter((c) => reqCodeSet.has(c));
      if (valid.length !== list.length) {
        const removed = list.filter((c) => !reqCodeSet.has(c));
        db.run(
          'UPDATE material_executes SET source_application_codes = ?, update_time = ? WHERE code = ?',
          [JSON.stringify(valid), now, executeCode]
        );
        result.orphanRefsCleaned.push({ executeCode, removedCodes: removed });
      }
    }
  }

  // ==================== 3. 幽灵审批单清理 ====================
  const apRows = db.exec(
    `SELECT id, business_link FROM approvals WHERE status = 'pending' AND business_link LIKE '%material%'`
  );
  if (apRows.length > 0) {
    for (const row of apRows[0].values) {
      const approvalId = String(row[0] || '');
      let requestId = '';
      try {
        const j = JSON.parse(String(row[1] || '{}'));
        requestId = String(j.requestId || '');
      } catch { continue; }
      if (!requestId) continue;
      if (!reqCodeSet.has(requestId)) {
        db.run(
          `UPDATE approvals SET status = 'cancelled', updated_at = ? WHERE id = ?`,
          [new Date().toISOString(), approvalId]
        );
        result.ghostApprovalsCancelled.push({ approvalId, requestCode: requestId });
      }
    }
  }

  // 有修复才落盘（sql.js 无自动落盘；无修复时跳过以减少写盘噪音）
  const hasChanges =
    result.duplicateCodesResolved.length > 0 ||
    result.ledgerAdjusted.length > 0 ||
    result.orphanRefsCleaned.length > 0 ||
    result.ghostApprovalsCancelled.length > 0;
  if (hasChanges) saveDatabase();

  return result;
}
