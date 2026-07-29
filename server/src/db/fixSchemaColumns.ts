/**
 * 2026-07-19：fixSchemaColumns — GREEN 级 schema 补齐
 *
 * 背景：项目启动时 fixMissingSchema（YELLOW 级，含 UPDATE 迁移）被禁用
 *  - 新库只跑 initializeDatabase()（仅 CREATE TABLE），很多 ALTER TABLE ADD COLUMN 不生效
 *  - 老库缺 reflow_count / propagation_method / circulation_revoked_at 等列 → executePropagation 500
 *
 * 本文件专门放置"纯 ALTER TABLE ADD COLUMN"操作（无 UPDATE/DELETE 数据迁移）
 * 标 GREEN 级，**启动时自动跑**，与 YELLOW 级 fixMissingSchema 解耦
 *
 * 运行入口：fixSchemaColumns() — 在 server/src/index.ts 启动钩子调用
 */

import { getDatabase } from './index';
import { seedLog } from '../lib/seedLogger';

/**
 * 检查列是否存在（用 PRAGMA table_info）
 */
function hasColumn(db: any, tableName: string, columnName: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  let exists = false;
  while (stmt.step()) {
    if (stmt.getAsObject().name === columnName) {
      exists = true;
      break;
    }
  }
  stmt.free();
  return exists;
}

/**
 * 安全 ADD COLUMN（重复执行不报错）
 * - IF NOT EXISTS 不被 SQL 标准支持（SQLite 3.35+ 才支持）
 * - 用 hasColumn 手动检查，缺则 ADD
 */
function safeAddColumn(db: any, table: string, column: string, typeDef: string, defaultVal?: string) {
  if (hasColumn(db, table, column)) return false;
  const sql = defaultVal !== undefined
    ? `ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef} DEFAULT ${defaultVal}`
    : `ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`;
  try {
    db.run(sql);
    seedLog.info(`✓ ${table}.${column} 列已添加`);
    return true;
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.skip(`• ${table}.${column} 列已存在`);
    } else {
      seedLog.skip(`• ${table}.${column}: ${e.message}`);
    }
    return false;
  }
}

/**
 * 安全 CREATE INDEX（用 IF NOT EXISTS 幂等）
 */
function safeCreateIndex(db: any, name: string, sql: string) {
  try {
    db.run(sql);
    seedLog.info(`✓ 索引 ${name} 已就绪`);
  } catch (e: any) {
    seedLog.skip(`• 索引 ${name}: ${e.message}`);
  }
}

export function fixSchemaColumns(): { addedColumns: number; addedIndexes: number } {
  const db = getDatabase();
  let addedColumns = 0;
  let addedIndexes = 0;

  // ============ planting_harvest_records（2026-07-19 撤销回流用）===========
  addedColumns += safeAddColumn(db, 'planting_harvest_records', 'circulation_revoked_at', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'planting_harvest_records', 'circulation_revoked_by', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'planting_harvest_records', 'circulation_revoke_reason', 'TEXT') ? 1 : 0;

  // ============ seed_sources（V3.0 合并功能）===========
  addedColumns += safeAddColumn(db, 'seed_sources', 'reflow_count', 'INTEGER', '0') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'last_reflow_at', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'propagation_method', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'seed_form', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'generation', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'linked_planting_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'linked_planting_code', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'parent_source_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'parent_source_code', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'mother_plant_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'mother_plant_code', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'propagation_status', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'propagation_type', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'breeding_location', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'target_traits', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'expected_harvest_date', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'actual_harvest_date', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'propagation_start_date', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'base_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'base_name', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'production_plan_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'production_plan_code', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'print_count', 'INTEGER', '0') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'traceability_code', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'pictures', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'merged_from_ids', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'transferred_from_stock_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'transferred_from_business_type', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'transferred_from_business_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_inbound_date', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_source_module', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_source_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_harvest_record_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_crop_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_crop_name', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_variety_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_variety_name', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_unit', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_unit_price', 'REAL', '0') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_supplier_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_supplier_name', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'seed_sources', 'original_production_plan_code', 'TEXT') ? 1 : 0;

  // ============ crop_circulation_records（V3.0 合并）===========
  addedColumns += safeAddColumn(db, 'crop_circulation_records', 'merge_action', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'crop_circulation_records', 'generation', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'crop_circulation_records', 'revoke_reason', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'crop_circulation_records', 'parent_source_id', 'TEXT') ? 1 : 0;

  // ============ inventory_inbound_records ============
  addedColumns += safeAddColumn(db, 'inventory_inbound_records', 'returned_quantity', 'REAL', '0') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'inventory_inbound_records', 'reversed_at', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'inventory_inbound_records', 'reversed_by', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'inventory_inbound_records', 'reverse_reason', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'inventory_inbound_records', 'business_id', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'inventory_inbound_records', 'crop_id', 'TEXT') ? 1 : 0;

  // ============ schedules（2026-07-29 排班-派工联动）============
  // dispatch 端 PATCH /api/schedules/dispatch-tasks 写入；occupations 端读取
  addedColumns += safeAddColumn(db, 'schedules', 'dispatched_task_ids', 'TEXT', `'[]'`) ? 1 : 0;

  // ============ 索引（GREEN 级：纯 CREATE INDEX）===========
  // 2026-07-19 P0-16：source_code UNIQUE 索引
  safeCreateIndex(db,
    'idx_seed_sources_source_code_active',
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_seed_sources_source_code_active
     ON seed_sources(source_code) WHERE deleted_at IS NULL`
  );
  addedIndexes += 1;

  return { addedColumns, addedIndexes };
}

// 独立运行入口
if (require.main === module) {
  (async () => {
    const { initDatabase } = await import('./index');
    const { saveDatabase } = await import('./index');
    await initDatabase();
    console.log('[fixSchemaColumns] 开始补齐列...');
    const result = fixSchemaColumns();
    saveDatabase();
    console.log(`[fixSchemaColumns] 完成：新增 ${result.addedColumns} 列，新增 ${result.addedIndexes} 索引`);
    process.exit(0);
  })();
}
