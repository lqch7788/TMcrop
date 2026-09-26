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

  // ============ plant_labels（2026-08-19 标记多选字典化）===========
  // 原在 fixMissingSchema（YELLOW）— 启动白名单禁用后老库漏列；/assign 写入必报 "no such column"
  addedColumns += safeAddColumn(db, 'plant_labels', 'mark_ids', "TEXT", "''") ? 1 : 0;

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

  // ============ plantings 已入库量（2026-08-14 种植已入库量闭环）===========
  addedColumns += safeAddColumn(db, 'plantings', 'harvest_to_inventory_qty', 'INTEGER', '0') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'plantings', 'harvest_to_inventory_unit', 'TEXT') ? 1 : 0;

  // ============ crop_circulation_records（V3.0 合并）===========
  addedColumns += safeAddColumn(db, 'crop_circulation_records', 'merge_action', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'crop_circulation_records', 'generation', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'crop_circulation_records', 'revoke_reason', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'crop_circulation_records', 'parent_source_id', 'TEXT') ? 1 : 0;

  // ============ material_requests（2026-09-26 修复审批回写链 C1）============
  // approvalLinkage.service.ts 审批通过时写 approval_code / approved_at 两列，
  // 但 schema.ts 建表与 fixMissingSchema 补列（该文件被启动白名单禁用）均不含它们 →
  // UPDATE 抛 no such column 被内部 catch 吞掉，物料领料审批通过后状态永不变。
  addedColumns += safeAddColumn(db, 'material_requests', 'approval_code', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'material_requests', 'approved_at', 'TEXT') ? 1 : 0;

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
  // 2026-09-19 修复 C1：调班审批需要按 (staff_id, date, shift) 精确定位排班行。
  // 老库缺此列时审批只能按 date 匹配，会把当天全部班次一起换人。
  addedColumns += safeAddColumn(db, 'swap_requests', 'original_shift', 'TEXT') ? 1 : 0;

  // ============ teams（2026-09-19 修复 H9）============
  // basicData.ts 的 teams GET/POST/PUT 都引用这两列，但 schema.ts 的 CREATE TABLE 不含它们，
  // 唯一的 ALTER 在被启动白名单禁用的 fixMissingSchema 里 —— 结果**全新库**上
  // GET /api/basic-data/teams 直接 500（班组列表空 → 排班/调班/派工全取不到班组）。
  // 现库能跑只是因为历史上手工跑过那个被禁用的脚本。
  addedColumns += safeAddColumn(db, 'teams', 'description', 'TEXT') ? 1 : 0;
  addedColumns += safeAddColumn(db, 'teams', 'work_zone', 'TEXT') ? 1 : 0;

  // ============ farm_tasks（2026-09-19 修复 H14）============
  // 这 25 列分别由一次性手动脚本 migrateV03.ts / 裸 SQL 文件 2026-08-22-add-actual-hours*.sql
  // 引入，且 fixMissingSchema 的对应 ALTER 被启动禁用 —— **全新库**缺列后：
  //   · farmTask.ts:1326「验收通过」写 actual_hours → no such column（且该处 catch 只 res.status(500)，
  //     没有 console.error，错误彻底静默）
  //   · ai/anomaly.ts、ai/reportGenerator.ts、ai/workhour.ts 读 actual_hours 同理
  // 类型与默认值严格照抄原脚本定义，不自行发明。
  const farmTaskColumnsToAdd: Array<[string, string, string?]> = [
    ['actual_hours', 'REAL'],
    ['actual_hours_recorded_at', 'TEXT'],
    ['actual_hours_recorded_by', 'TEXT'],
    ['estimated_vs_actual_ratio', 'REAL'],
    ['synthetic', 'INTEGER', '0'],
    ['cancelled_at', 'TEXT'],
    ['cancelled_by', 'TEXT'],
    ['cancelled_reason', 'TEXT'],
    ['abandoned_at', 'TEXT'],
    ['abandoned_by', 'TEXT'],
    ['abandoned_reason', 'TEXT'],
    ['rejected_at', 'TEXT'],
    ['rejected_by', 'TEXT'],
    ['rejected_reason', 'TEXT'],
    ['executor_reject_count', 'INTEGER', '0'],
    ['acceptance_record', 'TEXT'],
    ['progress_pct', 'INTEGER', '0'],
    ['current_pause_reason', 'TEXT'],
    ['paused_at', 'DATETIME'],
    ['resumed_at', 'DATETIME'],
    ['actual_start_at', 'DATETIME'],
    ['actual_end_at', 'DATETIME'],
    ['total_pause_seconds', 'INTEGER', '0'],
    ['outsource_cost', 'REAL', '0'],
    ['tenant_id', 'INTEGER', '1'],
  ];
  for (const [col, typeDef, def] of farmTaskColumnsToAdd) {
    addedColumns += safeAddColumn(db, 'farm_tasks', col, typeDef, def) ? 1 : 0;
  }

  // 2026-09-19：上面的 *_actual_hours 索引（原裸 SQL 文件里创建），同步进启动通道
  safeCreateIndex(db, 'idx_ft_actual_hours',
    `CREATE INDEX IF NOT EXISTS idx_ft_actual_hours ON farm_tasks(actual_hours)`);
  safeCreateIndex(db, 'idx_ft_actual_recorded_at',
    `CREATE INDEX IF NOT EXISTS idx_ft_actual_recorded_at ON farm_tasks(actual_hours_recorded_at)`);

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
