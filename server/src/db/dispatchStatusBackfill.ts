/**
 * 申请单 dispatch_status 存量回填（2026-09-29 审计修复 P1-9，GREEN 级启动迁移，幂等）
 *
 * 背景：`recalcDispatchStatus` 是 2026-09-27 才加入 materialExecute 的，
 * 之前的出库单在创建/编辑时不会回写来源申请单的 dispatch_status。
 * 实测 11 张有出库记录的申请单中 7 张为 NULL → 列表看不出"已出库/部分出库"，
 * 用户以为还没领料。
 *
 * 本模块对"有已扣库存出库记录"的来源申请单统一重算一次 dispatch_status。
 * 幂等：重算结果由出库数据唯一决定；已结案（closed）的单据由 recalcDispatchStatus 保护，不会被清空。
 */
import { getDatabase } from './index';
import { recalcDispatchStatus } from '../routes/materialExecute';

export interface DispatchStatusBackfillResult {
  /** 本次重算涉及的申请单数 */
  recalculated: number;
  /** 重算后由 NULL/空 → partial/complete 的申请单 */
  filled: Array<{ code: string; from: string; to: string }>;
}

/** 已扣库存的出库状态（与 materialExecute.isDeductedClass 同口径） */
const DEDUCTED_CLASSES = new Set(['completed', 'partial']);

export function backfillDispatchStatus(): DispatchStatusBackfillResult {
  const db = getDatabase();
  const result: DispatchStatusBackfillResult = { recalculated: 0, filled: [] };

  // 1. 收集"有已扣库存出库记录"的来源申请单号
  const srcCodes = new Set<string>();
  try {
    const ex = db.exec('SELECT source_application_codes, execute_status_class, materials FROM material_executes');
    if (ex.length > 0) {
      const cols = ex[0].columns;
      const srcIdx = cols.indexOf('source_application_codes');
      const clsIdx = cols.indexOf('execute_status_class');
      const matIdx = cols.indexOf('materials');
      for (const row of ex[0].values) {
        if (!DEDUCTED_CLASSES.has(String(row[clsIdx] || '').trim().toLowerCase())) continue;
        let srcList: unknown = row[srcIdx];
        for (let i = 0; i < 3 && typeof srcList === 'string'; i++) {
          try { srcList = JSON.parse(srcList as string); } catch { break; }
        }
        if (Array.isArray(srcList)) {
          for (const c of srcList) { const s = String(c || '').trim(); if (s) srcCodes.add(s); }
        }
        // 行级来源兜底（历史数据可能缺单据级来源）
        let mats: unknown = row[matIdx];
        for (let i = 0; i < 3 && typeof mats === 'string'; i++) {
          try { mats = JSON.parse(mats as string); } catch { break; }
        }
        if (Array.isArray(mats)) {
          for (const m of mats as Array<{ applicationCode?: string }>) {
            const s = String(m?.applicationCode || '').trim();
            if (s) srcCodes.add(s);
          }
        }
      }
    }
  } catch { return result; } // 表缺失（历史环境）→ 无操作

  if (srcCodes.size === 0) return result;

  // 2. 记录重算前的值（用于报告"本次真正补上了哪些"）
  const before = new Map<string, string>();
  for (const code of srcCodes) {
    try {
      const r = db.exec('SELECT dispatch_status FROM material_requests WHERE request_code = ?', [code]);
      if (r.length > 0 && r[0].values.length > 0) {
        before.set(code, String(r[0].values[0][0] ?? ''));
      }
    } catch { /* 跳过 */ }
  }

  // 3. 统一重算（已结案的由 recalcDispatchStatus 内部保护）
  const now = new Date().toISOString();
  recalcDispatchStatus(db, Array.from(srcCodes), now);
  result.recalculated = srcCodes.size;

  // 4. 对比报告
  for (const code of srcCodes) {
    try {
      const r = db.exec('SELECT dispatch_status FROM material_requests WHERE request_code = ?', [code]);
      const after = r.length > 0 && r[0].values.length > 0 ? String(r[0].values[0][0] ?? '') : '';
      const from = before.get(code) ?? '';
      if (!from && after) result.filled.push({ code, from: from || '(空)', to: after });
    } catch { /* 跳过 */ }
  }

  return result;
}
