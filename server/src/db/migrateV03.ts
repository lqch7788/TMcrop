/**
 * v0.3 阶段 0 一次性迁移脚本
 *
 * 用途：用 better-sqlite3 启用 WAL + 修复 30+ 字段遗留 + 加 tenant_id
 *
 * 原则（用户强制）：
 *   - 仅 ALTER TABLE ADD COLUMN，不删改任何现有字段
 *   - 不删除任何文件
 *   - 不修改任何现有数据
 *   - 仅给后续 v0.3 功能铺路
 *
 * 执行方式：
 *   cd D:/TMcrop/yuanxingtu/V1.1
 *   npx tsx server/src/db/migrateV03.ts
 *
 * 验证：
 *   sqlite3 server/data/yuanxingtu.db ".schema farm_tasks"
 *   应该看到 progress_pct 等新字段
 */

// better-sqlite3 没有 @types/better-sqlite3，用 require 绕过 TS 编译
// 运行时不需要类型，仅用作一次性迁移工具
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3');
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');
const BACKUP_PATH = `${DB_PATH}.backup-pre-migrateV03-${Date.now()}`;

console.log('=== v0.3 阶段 0 一次性迁移脚本 ===');
console.log(`数据库路径: ${DB_PATH}`);
console.log(`备份路径: ${BACKUP_PATH}`);

// 1. 备份
if (fs.existsSync(DB_PATH)) {
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`✅ 已备份: ${BACKUP_PATH}`);
}

// 2. 打开 better-sqlite3
const db = new Database(DB_PATH);
console.log('✅ 已打开 better-sqlite3');

// 3. 启用 WAL + busy_timeout（v0.3 前置 2）
console.log('\n--- 步骤 1: 启用 SQLite WAL 模式 (前置 2) ---');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');
db.pragma('wal_autocheckpoint = 1000');
const journalMode = db.pragma('journal_mode', { simple: true });
console.log(`✅ journal_mode = ${journalMode}`);
console.log(`✅ busy_timeout = ${db.pragma('busy_timeout', { simple: true })}ms`);

// 4. 检查表是否存在的辅助函数
function tableExists(tableName: string): boolean {
  const result = db
    .prepare(`SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type='table' AND name=?`)
    .get(tableName) as { cnt: number } | undefined;
  return (result?.cnt ?? 0) > 0;
}

function columnExists(tableName: string, columnName: string): boolean {
  if (!tableExists(tableName)) return false;
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === columnName);
}

// 5. ALTER TABLE 通用函数（自动幂等）
function safeAlter(tableName: string, columnName: string, columnDef: string, section: string): void {
  try {
    if (columnExists(tableName, columnName)) {
      console.log(`  • ${tableName}.${columnName} 已存在，跳过`);
      return;
    }
    if (!tableExists(tableName)) {
      console.log(`  ⚠ ${tableName} 表不存在，跳过 ${columnName}`);
      return;
    }
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    console.log(`  ✓ ${tableName} + ${columnName} ${columnDef.substring(0, 40)}`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ ${tableName}.${columnName} 失败: ${msg}`);
  }
}

// 6. 执行 v0.3 前置 1：修复字段遗留
console.log('\n--- 步骤 2: v0.3 前置 1 - 修复 30+ 字段遗留 ---');

console.log('\n[1/5] farm_tasks（P0-2 + P1-4）:');
const farmTasksColumns = [
  ['progress_pct', 'INTEGER DEFAULT 0'],
  ['current_pause_reason', 'TEXT'],
  ['paused_at', 'DATETIME'],
  ['resumed_at', 'DATETIME'],
  ['actual_start_at', 'DATETIME'],
  ['actual_end_at', 'DATETIME'],
  ['total_pause_seconds', 'INTEGER DEFAULT 0'],
  ['outsource_cost', 'REAL DEFAULT 0'],
];
for (const [col, def] of farmTasksColumns) {
  safeAlter('farm_tasks', col, def, '前置1-farm_tasks');
}

console.log('\n[2/5] farm_operation_records（P1-3 + P1-4）:');
const opRecordsColumns = [
  ['quality_score', 'INTEGER'],
  ['quality_remark', 'TEXT'],
  ['evaluator_id', 'TEXT'],
  ['evaluated_at', 'DATETIME'],
  ['worker_hourly_rate_snapshot', 'REAL'],
  ['labor_cost_snapshot', 'REAL'],
];
for (const [col, def] of opRecordsColumns) {
  safeAlter('farm_operation_records', col, def, '前置1-farm_operation_records');
}

console.log('\n[3/5] pesticide_library（P1-6）:');
const pesticideColumns = [
  ['safety_interval_days', 'INTEGER'],
  ['max_use_per_season', 'INTEGER'],
  ['retry_interval_days', 'INTEGER'],
  ['compatible_pesticides', 'TEXT'],
  ['gb2763_code', 'TEXT'],
  ['data_source', "TEXT DEFAULT 'manual'"],
];
for (const [col, def] of pesticideColumns) {
  safeAlter('pesticide_library', col, def, '前置1-pesticide_library');
}

console.log('\n[4/5] problems（P1-5）:');
const problemsColumns = [
  ['rectification_progress', 'INTEGER DEFAULT 0'],
  ['recheck_required', 'INTEGER DEFAULT 0'],
  ['recheck_result', 'TEXT'],
  ['recheck_at', 'DATETIME'],
  ['rechecker_id', 'TEXT'],
  ['recurrence_count', 'INTEGER DEFAULT 0'],
];
for (const [col, def] of problemsColumns) {
  safeAlter('problems', col, def, '前置1-problems');
}

console.log('\n[5/5] employees:');
safeAlter('employees', 'hourly_rate', 'REAL', '前置1-employees');

// 7. 执行 v0.3 前置 3：租户模型（50 张核心表）
console.log('\n--- 步骤 3: v0.3 前置 3 - 租户模型 tenant_id ---');

const coreTables = [
  'plantings',
  'farm_tasks',
  'farm_task_schedules',
  'farm_task_swap_requests',
  'farm_operation_records',
  'work_logs',
  'labor_records',
  'attendance_records',
  'temp_tasks',
  'inspections',
  'problems',
  'employees',
  'pesticide_library',
  'pesticide_records',
  'fertilizer_records',
  'material_requests',
  'material_executes',
  'material_returns',
  'inventory_stock',
  'batch_inventory',
  'inventory_transaction',
  'warehouses',
  'greenhouses',
  'zones',
  'blocks',
  'seed_sources',
  'seedlings',
  'crop_instances',
  'harvest_records',
  'planting_move_records',
  'daily_records',
  'production_plans',
  'crop_orders',
  'customers',
  'suppliers',
  'purchase_plans',
  'materials',
  'equipment',
  'iot_devices',
  'iot_history',
  'iot_alerts',
  'monitoring_devices',
  'task_operation_records',
  'task_operation_records_event_type',
  'onboarding_records',
  'leave_records',
  'attendance_records',
  'reminders',
  'mood_checks',
];

let tenantAddedCount = 0;
let tenantSkipCount = 0;
for (const tableName of coreTables) {
  try {
    if (!tableExists(tableName)) {
      console.log(`  • ${tableName} 不存在，跳过`);
      continue;
    }
    if (columnExists(tableName, 'tenant_id')) {
      tenantSkipCount++;
      continue;
    }
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1`);
    tenantAddedCount++;
    // 创建索引
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_tenant ON ${tableName}(tenant_id)`);
    } catch (e) {
      console.log(`  ⚠ ${tableName} 索引创建失败`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ ${tableName} tenant_id 失败: ${msg}`);
  }
}
console.log(`\n✅ tenant_id 添加完成: ${tenantAddedCount} 个表新增，${tenantSkipCount} 个表已存在`);

// 8. 验证
console.log('\n--- 步骤 4: 验证 ---');
console.log('\n[1/3] farm_tasks 新字段:');
const farmTasksCols = db.prepare(`PRAGMA table_info(farm_tasks)`).all() as Array<{ name: string }>;
const newFarmTasksCols = farmTasksCols.filter((c) =>
  ['progress_pct', 'current_pause_reason', 'paused_at', 'resumed_at', 'actual_start_at', 'actual_end_at', 'total_pause_seconds', 'outsource_cost'].includes(c.name)
);
newFarmTasksCols.forEach((c) => console.log(`  ✓ ${c.name}`));
console.log(`  共 ${newFarmTasksCols.length}/8 字段`);

console.log('\n[2/3] pesticide_library 新字段:');
const pestCols = db.prepare(`PRAGMA table_info(pesticide_library)`).all() as Array<{ name: string }>;
const newPestCols = pestCols.filter((c) =>
  ['safety_interval_days', 'max_use_per_season', 'retry_interval_days', 'compatible_pesticides', 'gb2763_code', 'data_source'].includes(c.name)
);
newPestCols.forEach((c) => console.log(`  ✓ ${c.name}`));
console.log(`  共 ${newPestCols.length}/6 字段`);

console.log('\n[3/3] tenant_id 覆盖率:');
const tenantCoverage = db
  .prepare(
    `SELECT COUNT(*) AS cnt FROM sqlite_master
     WHERE type='table' AND name NOT LIKE 'sqlite_%'
     AND name IN (${coreTables.map(() => '?').join(',')})
     AND sql LIKE '%tenant_id%'`
  )
  .get(...coreTables) as { cnt: number };
console.log(`  ✓ ${tenantCoverage.cnt}/${coreTables.length} 个核心表含 tenant_id`);

// 9. 关闭并保存
db.close();
console.log('\n✅ 数据库已关闭（better-sqlite3 自动 fsync）');

// 10. 检查文件大小变化
const newSize = fs.statSync(DB_PATH).size;
const oldSize = fs.statSync(BACKUP_PATH).size;
console.log(`\n--- 文件大小对比 ---`);
console.log(`  迁移前: ${(oldSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  迁移后: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  增量: ${((newSize - oldSize) / 1024 / 1024).toFixed(2)} MB`);
console.log(`  WAL 文件: ${fs.existsSync(DB_PATH + '-wal') ? '已生成 ✅' : '未生成 ❌'}`);
console.log(`  SHM 文件: ${fs.existsSync(DB_PATH + '-shm') ? '已生成 ✅' : '未生成 ❌'}`);

console.log('\n=== v0.3 阶段 0 一次性迁移完成 ===');
console.log('下一步: 重启 sql.js 服务，让它读取新 schema');
console.log('命令: cd server && npm run dev');
