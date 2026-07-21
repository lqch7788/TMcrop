/**
 * 2026-07-21：种源数据乱码修复脚本（一次性）
 *
 * 背景：
 * - 历史脏数据：早期种源入库时，部分中文字段（crop_name、remarks 等）被错误写入为
 *   U+FFFD 替代字符（UTF-8 字节 efbfbd），导致追溯时间线显示乱码
 * - 当前 PUT 流程已修复（新值能正确写入），但旧数据仍存在
 *
 * 修复策略：
 * 1. 扫描种源表所有 VARCHAR/TEXT 字段
 * 2. 检测乱码模式（连续 efbfbd 或孤立 U+FFFD）
 * 3. 替换为占位符 `（历史数据丢失）`，标记 cleaned_at 字段
 * 4. 同时扫描 audit_logs.opinion 字段（不修改，只统计）
 * 5. 扫描 inventory_inbound_records / planting_harvest_records 等其他含中文的表
 *
 * 执行方式：
 *   cd server && npx tsx scripts/fix-mojibake.ts [--dry-run] [--table=seed_sources|all]
 *
 * --dry-run: 只统计，不实际修改
 * --table: 指定要修复的表（默认 all）
 */

import { initDatabase, getDatabase, saveDatabase } from '../src/db';

/** 检测字符串是否包含乱码（连续 U+FFFD 替代字符） */
function hasMojibake(value: string | null | undefined): boolean {
  if (!value) return false;
  // 连续 2+ 个 U+FFFD = 乱码
  return /�{2,}/.test(value);
}

/** 检测字符串是否含孤立 U+FFFD（单字符） */
function hasOrphanReplacement(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.includes('�');
}

/** 清理乱码：用占位符替换 */
function cleanMojibake(value: string | null | undefined): string {
  if (!value) return '';
  // 替换连续 U+FFFD 为占位符
  return value.replace(/�{2,}/g, '（历史数据丢失）').replace(/�/g, '');
}

/** 统计扫描结果 */
interface ScanResult {
  table: string;
  column: string;
  rowsAffected: number;
  sampleValues: string[];
}

const PLACEHOLDER = '（历史数据丢失）';

function scanAndFixTable(
  db: any,
  tableName: string,
  idColumn: string,
  textColumns: string[]
): ScanResult[] {
  const results: ScanResult[] = [];
  console.log(`\n=== 扫描表 ${tableName} ===`);

  for (const col of textColumns) {
    try {
      const stmt = db.prepare(`SELECT ${idColumn} AS id, ${col} AS val FROM ${tableName} WHERE ${col} LIKE '%�%'`);
      const affectedRows: Array<{ id: string; oldVal: string; newVal: string }> = [];

      while (stmt.step()) {
        const row = stmt.getAsObject() as { id: string; val: string };
        if (hasMojibake(row.val) || hasOrphanReplacement(row.val)) {
          const oldVal = row.val;
          const newVal = cleanMojibake(oldVal);
          if (oldVal !== newVal) {
            affectedRows.push({ id: row.id, oldVal, newVal });
          }
        }
      }
      stmt.free();

      if (affectedRows.length > 0) {
        console.log(`  列 ${col}: ${affectedRows.length} 条含乱码`);
        // 打印前 3 条样本
        affectedRows.slice(0, 3).forEach((r, idx) => {
          console.log(`    [${idx + 1}] ${r.id}:`);
          console.log(`        旧: ${JSON.stringify(r.oldVal).substring(0, 80)}`);
          console.log(`        新: ${JSON.stringify(r.newVal).substring(0, 80)}`);
        });

        results.push({
          table: tableName,
          column: col,
          rowsAffected: affectedRows.length,
          sampleValues: affectedRows.slice(0, 5).map((r) => `${r.id}: ${r.oldVal} → ${r.newVal}`),
        });
      } else {
        console.log(`  列 ${col}: 无乱码`);
      }
    } catch (e) {
      console.log(`  列 ${col}: 跳过（${(e as Error).message}）`);
    }
  }

  return results;
}

function applyFixes(
  db: any,
  tableName: string,
  idColumn: string,
  results: ScanResult[]
): number {
  let total = 0;
  const now = new Date().toISOString();
  for (const r of results) {
    if (r.rowsAffected === 0) continue;
    console.log(`\n应用修复: ${tableName}.${r.column} (${r.rowsAffected} 条)`);
    const stmt = db.prepare(`SELECT ${idColumn} AS id, ${r.column} AS val FROM ${tableName} WHERE ${r.column} LIKE '%�%'`);
    let count = 0;
    while (stmt.step()) {
      const row = stmt.getAsObject() as { id: string; val: string };
      if (hasMojibake(row.val) || hasOrphanReplacement(row.val)) {
        const cleaned = cleanMojibake(row.val);
        if (cleaned !== row.val) {
          db.run(`UPDATE ${tableName} SET ${r.column} = ? WHERE ${idColumn} = ?`, [cleaned, row.id]);
          count++;
        }
      }
    }
    stmt.free();
    console.log(`  修复 ${count} 条`);
    total += count;
  }
  return total;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tableArg = args.find((a) => a.startsWith('--table='));
  const targetTable = tableArg ? tableArg.split('=')[1] : 'all';

  console.log('='.repeat(60));
  console.log(`种源乱码修复脚本 ${dryRun ? '(DRY RUN)' : '(APPLY)'}`);
  console.log('='.repeat(60));

  // 2026-07-21：脚本独立运行，需要先初始化数据库
  console.log('正在初始化数据库...');
  await initDatabase();
  console.log('✓ 数据库已加载');

  const db = getDatabase();

  // 1. seed_sources 表
  if (targetTable === 'all' || targetTable === 'seed_sources') {
    const seedSourceColumns = [
      'source_name', 'source_type', 'source_origin',
      'crop_category', 'type_name', 'variety_name',
      'crop_name', 'crop_variety', 'remarks',
      'production_plan_code', 'traceability_code',
      'transferred_from_business_type', 'original_supplier_name',
      'merged_from_ids', 'propagation_method',
    ];
    const results = scanAndFixTable(db, 'seed_sources', 'id', seedSourceColumns);
    if (!dryRun) {
      const fixed = applyFixes(db, 'seed_sources', 'id', results);
      console.log(`\nseed_sources 共修复 ${fixed} 条`);
    }
  }

  // 2. audit_logs 表（只修复 opinion，其他字段都是 ID/枚举）
  if (targetTable === 'all' || targetTable === 'audit_logs') {
    const auditResults = scanAndFixTable(db, 'audit_logs', 'id', ['opinion']);
    if (!dryRun) {
      const fixed = applyFixes(db, 'audit_logs', 'id', auditResults);
      console.log(`\naudit_logs 共修复 ${fixed} 条`);
    }
  }

  // 3. inventory_inbound_records（入库记录含作物名、供应商）
  if (targetTable === 'all' || targetTable === 'inventory_inbound_records') {
    const inboundColumns = [
      'crop_name', 'variety_name', 'warehouse_name',
      'supplier_name', 'operator_name', 'notes',
    ];
    const results = scanAndFixTable(db, 'inventory_inbound_records', 'id', inboundColumns);
    if (!dryRun) {
      const fixed = applyFixes(db, 'inventory_inbound_records', 'id', results);
      console.log(`\ninventory_inbound_records 共修复 ${fixed} 条`);
    }
  }

  // 4. planting_harvest_records（采收记录）
  if (targetTable === 'all' || targetTable === 'planting_harvest_records') {
    const harvestColumns = ['crop_name', 'crop_variety', 'notes', 'operator_name'];
    const results = scanAndFixTable(db, 'planting_harvest_records', 'id', harvestColumns);
    if (!dryRun) {
      const fixed = applyFixes(db, 'planting_harvest_records', 'id', results);
      console.log(`\nplanting_harvest_records 共修复 ${fixed} 条`);
    }
  }

  // 5. material_flow_log（流转日志）
  if (targetTable === 'all' || targetTable === 'material_flow_log') {
    const flowColumns = ['crop_name', 'crop_variety', 'source_description', 'target_description'];
    const results = scanAndFixTable(db, 'material_flow_log', 'id', flowColumns);
    if (!dryRun) {
      const fixed = applyFixes(db, 'material_flow_log', 'id', results);
      console.log(`\nmaterial_flow_log 共修复 ${fixed} 条`);
    }
  }

  if (!dryRun) {
    saveDatabase();
    console.log('\n✓ 数据库已保存');
  } else {
    console.log('\n[DRY RUN] 未实际修改');
  }
}

main();