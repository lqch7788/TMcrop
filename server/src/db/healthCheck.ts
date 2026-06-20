/**
 * 数据库健康检查工具
 * 2026-06-20: 防止数据丢失事故
 * 用途:
 *   1. server 启动前/后做 PRAGMA integrity_check
 *   2. 关键表行数对比（启动前后）
 *   3. 手动诊断: GET /api/admin/db-health
 */
import fs from 'fs';
import path from 'path';
import { getDatabase } from './index';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');

/**
 * 关键业务表（必须保护）
 * 如果启动后这些表行数减少，说明有 bug/seed 误操作
 */
export const KEY_TABLES = [
  'plantings',
  'seed_sources',
  'seedlings',
  'harvest_records',
  'planting_harvest_records',
  'material_requests',
  'material_executes',
  'inventory_transaction',
  'inventory_stock',
  'inventory_inbound_records',
  'inventory_freeze',
  'material_flow_log',
  'farm_tasks',
  'crop_instances',
  'problems',
  'material_costs',
  'inbound_records',
  'materials',
  'inspections',
  'crop_orders',
  'production_plans',
  'labor_records',
];

/**
 * 启动前 db 完整性检查
 * 返回 { ok, error?, fileSize, snapshot }
 */
export async function preStartupCheck(): Promise<{
  ok: boolean;
  error?: string;
  fileSize: number;
  snapshot: Record<string, number>;
}> {
  const fileSize = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
  const snapshot: Record<string, number> = {};

  if (!fs.existsSync(DB_PATH)) {
    return { ok: true, fileSize: 0, snapshot };
  }

  try {
    // 动态 import sql.js（避免循环依赖）
    const { default: initSqlJs } = await import('sql.js');
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const tempDb = new SQL.Database(buffer);

    // 1. 完整性检查
    const integrityResult = tempDb.exec('PRAGMA integrity_check');
    const integrityValue = integrityResult[0]?.values[0]?.[0];
    if (integrityValue !== 'ok') {
      tempDb.close();
      return {
        ok: false,
        error: `数据库完整性检查失败: ${integrityValue}`,
        fileSize,
        snapshot,
      };
    }

    // 2. 关键表行数快照
    for (const t of KEY_TABLES) {
      try {
        const r = tempDb.exec(`SELECT COUNT(*) FROM ${t}`);
        const v = r[0]?.values[0]?.[0];
        snapshot[t] = typeof v === 'number' ? v : Number(v) || 0;
      } catch {
        snapshot[t] = 0;
      }
    }

    tempDb.close();
    return { ok: true, fileSize, snapshot };
  } catch (e: any) {
    return { ok: false, error: `数据库快照失败: ${e.message}`, fileSize, snapshot };
  }
}

/**
 * 启动后 db 状态对比
 * 对比启动前快照与当前状态，找出被修改的表
 */
export function postStartupCompare(snapshot: Record<string, number>): {
  ok: boolean;
  warnings: string[];
  current: Record<string, number>;
} {
  const warnings: string[] = [];
  const current: Record<string, number> = {};

  try {
    const db = getDatabase();
    for (const t of KEY_TABLES) {
      try {
        const r = db.exec(`SELECT COUNT(*) FROM ${t}`);
        const v = r[0]?.values[0]?.[0];
        current[t] = typeof v === 'number' ? v : Number(v) || 0;
        const beforeN = snapshot[t] ?? 0;
        const afterN = current[t];
        if (afterN < beforeN) {
          warnings.push(
            `  ❌ ${t}: ${beforeN} → ${afterN}（减少 ${beforeN - afterN} 条）`
          );
        } else if (afterN > beforeN) {
          // 新增是正常的（用户操作），但记录一下
          warnings.push(
            `  ✓ ${t}: ${beforeN} → ${afterN}（新增 ${afterN - beforeN} 条）`
          );
        }
      } catch {
        current[t] = snapshot[t] ?? 0;
      }
    }
  } catch (e: any) {
    return {
      ok: false,
      warnings: [`对比失败: ${e.message}`],
      current: snapshot,
    };
  }

  return {
    ok: warnings.filter(w => w.includes('❌')).length === 0,
    warnings,
    current,
  };
}

/**
 * 手动诊断 — 返回完整 db 健康状态
 * 用于 GET /api/admin/db-health
 */
export async function diagnose(): Promise<{
  fileSize: number;
  integrity: string;
  tables: Record<string, number>;
  totalRows: number;
}> {
  if (!fs.existsSync(DB_PATH)) {
    return { fileSize: 0, integrity: 'NO_FILE', tables: {}, totalRows: 0 };
  }
  const fileSize = fs.statSync(DB_PATH).size;
  const { default: initSqlJs } = await import('sql.js');
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const tempDb = new SQL.Database(buffer);
  const integrityResult = tempDb.exec('PRAGMA integrity_check');
  const integrity = integrityResult[0]?.values[0]?.[0] as string;
  const tables: Record<string, number> = {};
  let totalRows = 0;
  // 查所有表
  const allTablesResult = tempDb.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  const allTableNames = (allTablesResult[0]?.values || []).map((v: any) => v[0] as string);
  for (const t of allTableNames) {
    try {
      const r = tempDb.exec(`SELECT COUNT(*) FROM ${t}`);
      const v = r[0]?.values[0]?.[0];
      const n = typeof v === 'number' ? v : Number(v) || 0;
      tables[t] = n;
      totalRows += n;
    } catch {
      tables[t] = 0;
    }
  }
  tempDb.close();
  return { fileSize, integrity, tables, totalRows };
}
